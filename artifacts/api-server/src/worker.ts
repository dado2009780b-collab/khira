import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";

interface Env {
  HYPERDRIVE: { connectionString: string };
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
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
    // Initialize the existing Express app after the per-Worker bindings are
    // available, so its PostgreSQL pool receives Hyperdrive's connection URL.
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
    const server = createServer(app);
    server.listen(3000);
    return httpServerHandler({ port: 3000 }) as HttpHandler;
  })();

  return apiHandler;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/api" || path.startsWith("/api/")) {
      const handler = await getApiHandler(env);
      return handler.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
