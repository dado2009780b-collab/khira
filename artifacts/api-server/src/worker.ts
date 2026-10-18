import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";

interface Env {
  DATABASE_URL?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_PASSWORD?: string;
  SESSION_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface HttpHandler {
  fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response>;
}

let apiHandler: Promise<HttpHandler> | undefined;

function getApiHandler(env: Env): Promise<HttpHandler> {
  apiHandler ??= (async () => {
    // Initialize the existing Express app after Worker secrets are available.
    // Cloudflare Workers supports outbound PostgreSQL TCP sockets through
    // node:net; Hyperdrive is optional for this connection.
    process.env.DATABASE_URL = env.DATABASE_URL;
    process.env.PORT = "3000";
    process.env.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
    process.env.SESSION_SECRET = env.SESSION_SECRET;
    if (env.TELEGRAM_BOT_TOKEN) {
      process.env.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN;
    }
    if (env.TELEGRAM_CHAT_ID) {
      process.env.TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID;
    }

    const { default: app } = await import("./app");
    const server = createServer(app);
    server.listen(3000);
    return httpServerHandler({ port: 3000 }) as HttpHandler;
  })().catch((error: unknown) => {
    // Do not poison this isolate with a permanently rejected initialization.
    apiHandler = undefined;
    throw error;
  });

  return apiHandler;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/api" || path.startsWith("/api/")) {
      const missing = (["DATABASE_URL", "ADMIN_PASSWORD", "SESSION_SECRET"] as const)
        .filter((key) => !env[key]?.trim());

      if (missing.length > 0) {
        console.error("Worker runtime configuration is missing required secrets", {
          missing,
        });
        return Response.json(
          {
            error: "إعدادات تشغيل الموقع غير مكتملة.",
            code: "MISSING_RUNTIME_SECRETS",
            missing,
            help: "أضف هذه القيم في إعدادات Worker ضمن Runtime Variables and Secrets لبيئة Production، ثم أعد النشر.",
          },
          { status: 503 },
        );
      }

      try {
        const handler = await getApiHandler(env as Env & {
          DATABASE_URL: string;
          ADMIN_PASSWORD: string;
          SESSION_SECRET: string;
        });
        return await handler.fetch(request, env, ctx);
      } catch (error) {
        // Keep Cloudflare's generic Error 1101 page from hiding the real cause.
        // Never return environment values or a connection string to the browser.
        console.error("Worker API initialization failed", error);
        return Response.json(
          {
            error: "تعذر تشغيل واجهة الموقع.",
            code: "API_INITIALIZATION_FAILED",
            help: "افتح Workers & Pages → khira → Observability → Logs لقراءة سبب الخطأ، من دون مشاركة أي أسرار.",
          },
          { status: 503 },
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
