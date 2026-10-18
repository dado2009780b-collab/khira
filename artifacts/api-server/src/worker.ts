import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { withRequestDatabase } from "@workspace/db";

interface Env {
  HYPERDRIVE?: { connectionString: string };
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

function getApiHandler(
  env: Env & { HYPERDRIVE: { connectionString: string } },
): Promise<HttpHandler> {
  apiHandler ??= (async () => {
    // Initialize the existing Express app after Worker secrets are available.
    // Hyperdrive owns the long-lived database pool. Local development reads
    // DATABASE_URL through the separate Node server entrypoint.
    process.env.DATABASE_URL = env.HYPERDRIVE.connectionString;
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
      const hyperdriveConnectionString = env.HYPERDRIVE?.connectionString;
      const missing: string[] = ["ADMIN_PASSWORD", "SESSION_SECRET"].filter(
        (key) => !env[key as "ADMIN_PASSWORD" | "SESSION_SECRET"]?.trim(),
      );
      if (!hyperdriveConnectionString) {
        missing.unshift("HYPERDRIVE");
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
            help: "أضف HYPERDRIVE كـ binding، وأضف ADMIN_PASSWORD وSESSION_SECRET كـ Secrets في بيئة Production، ثم أعد النشر.",
          },
          { status: 503 },
        );
      }

      try {
        const handler = await getApiHandler(
          env as Env & {
            HYPERDRIVE: { connectionString: string };
          },
        );
        // Scope the client pool to this request. Hyperdrive keeps its separate
        // upstream database connections pooled across Worker invocations.
        return await withRequestDatabase(
          () => handler.fetch(request, env, ctx),
          {
            connectionString: hyperdriveConnectionString,
            useConnectionStringAsIs: true,
          },
        );
      } catch (error) {
        // Keep Cloudflare's generic Error 1101 page from hiding the real cause.
        // Never return environment values or a connection string to the browser.
        const errorCode = getSafeInitializationErrorCode(error);
        console.error("Worker API initialization failed", { errorCode });
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
