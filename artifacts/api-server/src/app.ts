import express, { type Express } from "express";
import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import router from "./routes";
import { createRequestLogger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

app.use((req, res, next) => {
  const startedAt = Date.now();
  req.log = createRequestLogger({
    requestId: randomUUID(),
    method: req.method,
    path: req.path,
  });

  res.once("finish", () => {
    const fields = {
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    };
    const message = `${req.method} ${req.path}`;
    if (res.statusCode >= 500) {
      req.log.error(fields, message);
    } else if (res.statusCode >= 400) {
      req.log.warn(fields, message);
    } else {
      req.log.info(fields, message);
    }
  });

  next();
});
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    req.log.error({ err: error }, "Unhandled API request error");
    res.status(500).json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى." });
  },
);

export default app;
