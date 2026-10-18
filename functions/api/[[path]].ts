import worker from "../../artifacts/api-server/src/worker";

type RuntimeEnvironment = {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
};

type PagesContext = {
  request: Request;
  env: RuntimeEnvironment;
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

// Cloudflare Pages sends every /api/* request here. Static files are still
// served by Pages, while the existing API handles the dynamic website data.
export async function onRequest(context: PagesContext): Promise<Response> {
  return worker.fetch(context.request, context.env, context);
}
