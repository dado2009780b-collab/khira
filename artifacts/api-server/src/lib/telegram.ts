/**
 * telegram.ts
 *
 * Server-side only module. Sends order notifications to a Telegram chat.
 * Credentials are read exclusively from environment variables — never from
 * client-side code or logs.
 *
 * Contract:
 *  - sendOrderNotification() resolves successfully even if Telegram is
 *    unreachable or credentials are missing.  Errors are logged but never
 *    propagated, so the order-save flow is never affected.
 *  - The bot token is intentionally redacted from every log line.
 */

import { logger } from "./logger.js";

const TELEGRAM_API_BASE = "https://api.telegram.org";

/** Read once at module load — fails gracefully if vars are absent. */
function getConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return null;
  }
  return { token, chatId };
}

const config = getConfig();

if (!config) {
  logger.warn(
    "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set — " +
      "Telegram order notifications are disabled.",
  );
}

/** Status labels in Arabic. */
const STATUS_LABELS: Record<string, string> = {
  new: "🆕 جديد",
  contacted: "📞 تم التواصل",
  confirmed: "✅ مؤكد",
  preparing: "📦 قيد التجهيز",
  shipped: "🚚 تم الشحن",
  completed: "🎉 مكتمل",
  cancelled: "❌ ملغي",
};

export interface OrderNotificationPayload {
  orderNumber: string;     // e.g. "BK-000001"
  customerName: string;
  phone: string;
  city: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  deliveryFee: number;
  unitPrice: number;
  status: string;
}

function buildMessage(order: OrderNotificationPayload): string {
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const lines = [
    `🛒 *طلب جديد — ${escapeMarkdown(order.orderNumber)}*`,
    ``,
    `👤 *العميل:* ${escapeMarkdown(order.customerName)}`,
    `📱 *الهاتف:* ${escapeMarkdown(order.phone)}`,
    `🏙️ *المدينة:* ${escapeMarkdown(order.city)}`,
    ``,
    `📚 *المنتج:* ${escapeMarkdown(order.productName)}`,
    `🔢 *الكمية:* ${order.quantity}`,
    `💰 *سعر الباقة:* ${order.unitPrice} ${escapeMarkdown(order.currency)}`,
    `🚚 *التوصيل:* ${order.deliveryFee} ${escapeMarkdown(order.currency)}`,
    `💵 *الإجمالي:* ${order.totalAmount} ${escapeMarkdown(order.currency)}`,
    ``,
    `📋 *الحالة:* ${statusLabel}`,
  ];
  return lines.join("\n");
}

/**
 * Escapes special MarkdownV2 characters.
 * See: https://core.telegram.org/bots/api#markdownv2-style
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

/**
 * Sends an order-created notification to the configured Telegram chat.
 *
 * Safe to call fire-and-forget:
 *   void sendOrderNotification(payload, log);
 *
 * Never throws. Returns `true` on success, `false` on any failure.
 */
export async function sendOrderNotification(
  payload: OrderNotificationPayload,
  /** Pass req.log so errors are correlated with the request. */
  requestLogger: typeof logger,
): Promise<boolean> {
  if (!config) {
    // Already warned at startup; don't spam logs per-request.
    return false;
  }

  const text = buildMessage(payload);
  const url = `${TELEGRAM_API_BASE}/bot${config.token}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "MarkdownV2",
      }),
      // 10-second timeout so a slow Telegram API doesn't hold up the response.
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable body)");
      // Log the HTTP status but NOT the token.
      requestLogger.warn(
        { telegramStatus: response.status, orderNumber: payload.orderNumber },
        `Telegram notification failed: HTTP ${response.status} — ${body.slice(0, 200)}`,
      );
      return false;
    }

    requestLogger.info(
      { orderNumber: payload.orderNumber },
      "Telegram order notification sent successfully",
    );
    return true;
  } catch (err) {
    // Network errors, timeouts, etc.
    requestLogger.warn(
      { err, orderNumber: payload.orderNumber },
      "Telegram notification error (non-fatal)",
    );
    return false;
  }
}
