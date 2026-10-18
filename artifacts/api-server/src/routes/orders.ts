import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { eq } from "drizzle-orm";
import { CreateOrderBody, CreateOrderResponse } from "@workspace/api-zod";
import {
  db,
  customersTable,
  offerSettingsTable,
  orderHistoryTable,
  ordersTable,
} from "@workspace/db";
import { DEFAULT_OFFER } from "../lib/bookBundleContent.js";
import { sendOrderNotification } from "../lib/telegram.js";

const router: IRouter = Router();

const createOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "حاول مرة أخرى بعد قليل." },
});

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^[+\d\s().-]+$/.test(trimmed)) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  const hasPlus = trimmed.startsWith("+");
  return `${hasPlus ? "+" : ""}${digits}`;
}

router.post("/orders", createOrderLimiter, async (req, res): Promise<void> => {
  const source = req.body && typeof req.body === "object" ? req.body : {};
  const parsed = CreateOrderBody.safeParse({
    ...source,
    customerName:
      typeof source.customerName === "string"
        ? source.customerName.trim()
        : source.customerName,
    phone:
      typeof source.phone === "string" ? source.phone.trim() : source.phone,
    city: typeof source.city === "string" ? source.city.trim() : source.city,
  });
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Rejected invalid order");
    res.status(400).json({ error: "تحقق من الاسم ورقم الهاتف والمدينة." });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "أدخل رقم هاتف صالحًا." });
    return;
  }

  const [storedOffer] = await db
    .select({
      price: offerSettingsTable.price,
      deliveryFee: offerSettingsTable.deliveryFee,
      currency: offerSettingsTable.currency,
      packageName: offerSettingsTable.packageName,
    })
    .from(offerSettingsTable)
    .where(eq(offerSettingsTable.id, 1))
    .limit(1);
  const offer = storedOffer ?? DEFAULT_OFFER;

  const totalAmount = offer.price + offer.deliveryFee;
  const result = await db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customersTable)
      .values({
        name: parsed.data.customerName,
        phone,
        city: parsed.data.city,
      })
      .onConflictDoUpdate({
        target: customersTable.phone,
        set: {
          name: parsed.data.customerName,
          city: parsed.data.city,
          updatedAt: new Date(),
        },
      })
      .returning({ id: customersTable.id });

    if (!customer) {
      throw new Error("Customer upsert returned no row");
    }

    const [order] = await tx
      .insert(ordersTable)
      .values({
        customerId: customer.id,
        customerName: parsed.data.customerName,
        phone,
        city: parsed.data.city,
        productName: offer.packageName,
        quantity: 1,
        unitPrice: offer.price,
        deliveryFee: offer.deliveryFee,
        totalAmount,
        status: "new",
      })
      .returning();

    if (!order) {
      throw new Error("Order insert returned no row");
    }

    await tx.insert(orderHistoryTable).values({
      orderId: order.id,
      previousStatus: null,
      newStatus: "new",
      adminUserId: "system",
      createdAt: order.createdAt,
    });

    return order;
  });

  const orderNumber = `BK-${String(result.orderNumber).padStart(6, "0")}`;
  req.log.info({ orderId: result.id, orderNumber }, "Customer order saved");

  // Fire-and-forget: Telegram failure must never prevent the order response.
  void sendOrderNotification(
    {
      orderNumber,
      customerName: result.customerName,
      phone: result.phone,
      city: result.city,
      productName: result.productName,
      quantity: result.quantity,
      unitPrice: result.unitPrice,
      deliveryFee: result.deliveryFee,
      totalAmount: result.totalAmount,
      currency: offer.currency,
      status: result.status,
    },
    req.log,
  );

  res.status(201).json(
    CreateOrderResponse.parse({
      orderNumber,
      status: result.status,
      createdAt: result.createdAt,
      totalAmount: result.totalAmount,
      currency: offer.currency,
    }),
  );
});

export default router;
