import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { withRequestDatabase } from "@workspace/db";

interface Env {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  ASSETS?: { fetch(request: Request): Promise<Response> };
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

function getSafeInitializationErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "UNKNOWN";

  const candidate = error as { code?: unknown; name?: unknown };
  if (
    typeof candidate.code === "string" &&
    /^[A-Za-z0-9_]{2,64}$/.test(candidate.code)
  ) {
    return candidate.code.toUpperCase();
  }
  if (
    typeof candidate.name === "string" &&
    /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(candidate.name)
  ) {
    return candidate.name.toUpperCase();
  }
  return "UNKNOWN";
}

let apiHandler: Promise<HttpHandler> | undefined;

function getApiHandler(): Promise<HttpHandler> {
  apiHandler ??= (async () => {
    const { default: app } = await import("./app");
    // Passing the server directly lets Cloudflare attach it to the current
    // Pages Function request. It avoids manually reserving a port in Pages.
    return httpServerHandler(createServer(app)) as HttpHandler;
  })().catch((error: unknown) => {
    // Do not poison this isolate with a permanently rejected initialization.
    apiHandler = undefined;
    throw error;
  });

  return apiHandler;
}

const worker = {
  async fetch(
    request: Request,
    env: Env,
    ctx: WorkerContext,
  ): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/api" || path.startsWith("/api/")) {
      const connectionString =
        env.HYPERDRIVE?.connectionString ||
        env.DATABASE_URL?.trim() ||
        process.env.DATABASE_URL?.trim();

      const adminPassword =
        env.ADMIN_PASSWORD?.trim() || process.env.ADMIN_PASSWORD?.trim();
      const sessionSecret =
        env.SESSION_SECRET?.trim() || process.env.SESSION_SECRET?.trim();

      const missing: string[] = [];
      if (!connectionString) {
        missing.push("DATABASE_URL (أو Hyperdrive binding)");
      }
      if (!adminPassword) {
        missing.push("ADMIN_PASSWORD");
      }
      if (!sessionSecret) {
        missing.push("SESSION_SECRET");
      }

      if (missing.length > 0) {
        console.error("Worker runtime configuration is incomplete", {
          missing,
        });
        return Response.json(
          {
            error: "إعدادات تشغيل الموقع غير مكتملة.",
            code: "MISSING_RUNTIME_CONFIGURATION",
            missing,
            help: "أضف HYPERDRIVE binding أو DATABASE_URL، مع ADMIN_PASSWORD وSESSION_SECRET، في إعدادات Cloudflare Pages ثم أعد النشر.",
          },
          { status: 503 },
        );
      }

      // Propagate runtime values to process.env so imported modules (auth, db, telegram) can read them
      if (adminPassword) process.env.ADMIN_PASSWORD = adminPassword;
      if (sessionSecret) process.env.SESSION_SECRET = sessionSecret;
      if (connectionString) process.env.DATABASE_URL = connectionString;
      if (env.TELEGRAM_BOT_TOKEN?.trim()) {
        process.env.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN.trim();
      }
      if (env.TELEGRAM_CHAT_ID?.trim()) {
        process.env.TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID.trim();
      }

      try {
        const handler = await getApiHandler();
        const isHyperdrive = Boolean(env.HYPERDRIVE?.connectionString);
        return await withRequestDatabase(
          () => handler.fetch(request, env, ctx),
          {
            connectionString,
            useConnectionStringAsIs: isHyperdrive,
          },
        );
      } catch (error) {
        // Keep Cloudflare's generic Error 1101 page from hiding the real cause.
        // Never return environment values or a connection string to the browser.
        const errorCode = getSafeInitializationErrorCode(error);
        console.error("Worker API initialization failed", { errorCode, error });
        return Response.json(
          {
            error: "تعذر تشغيل واجهة الموقع.",
            code: "API_INITIALIZATION_FAILED",
            errorCode,
            help: "افتح Workers & Pages → khira → Observability → Logs لقراءة سبب الخطأ، من دون مشاركة أي أسرار.",
          },
          { status: 503 },
        );
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

export default worker;
