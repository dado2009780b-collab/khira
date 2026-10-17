import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const isCloudflareWorker = process.env.CLOUDFLARE_WORKERS === "1";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "res.headers['set-cookie']",
  ],
  ...(isProduction || isCloudflareWorker
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }),
});
