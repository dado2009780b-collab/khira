import express, { type Express } from "express";
import { randomUUID } from "node:crypto";
import cookieParser from "cookie-parser";
import router from "./routes";
import { createRequestLogger } from "./lib/logger";

const app: Express = express();
app.set("trust proxy", 1);

function getSafeErrorType(error: unknown, depth = 0): string {
  if (depth > 6 || typeof error !== "object" || error === null) {
    return "UnknownError";
  }

  const candidate = error as {
    name?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  const nestedErrors = [
    ...(Array.isArray(candidate.errors) ? candidate.errors : []),
    ...(candidate.cause ? [candidate.cause] : []),
  ];

  for (const nestedError of nestedErrors) {
    const nestedType = getSafeErrorType(nestedError, depth + 1);
    if (nestedType !== "UnknownError" && nestedType !== "Error") {
      return nestedType;
    }
  }

  return typeof candidate.name === "string" &&
    /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(candidate.name)
    ? candidate.name
    : "UnknownError";
}

function getSafeErrorCode(error: unknown, depth = 0): string | undefined {
  if (depth > 6 || typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  const nestedErrors = [
    ...(Array.isArray(candidate.errors) ? candidate.errors : []),
    ...(candidate.cause ? [candidate.cause] : []),
  ];

  for (const nestedError of nestedErrors) {
    const nestedCode = getSafeErrorCode(nestedError, depth + 1);
    if (nestedCode) return nestedCode;
  }

  if (
    typeof candidate.code === "string" &&
    /^[A-Za-z0-9_]{2,64}$/.test(candidate.code)
  ) {
    return candidate.code.toUpperCase();
  }

  return undefined;
}

function getSafeErrorCategory(errorCode?: string): string {
  switch (errorCode) {
    case "42P01":
      return "DATABASE_TABLE_MISSING";
    case "42703":
      return "DATABASE_COLUMN_MISSING";
    case "42501":
      return "DATABASE_PERMISSION_DENIED";
    case "28P01":
      return "DATABASE_AUTHENTICATION_FAILED";
    case "23502":
      return "DATABASE_NOT_NULL_CONSTRAINT";
    case "23505":
      return "DATABASE_UNIQUE_CONSTRAINT";
    case "23514":
      return "DATABASE_CHECK_CONSTRAINT";
    case "23503":
      return "DATABASE_FOREIGN_KEY_CONSTRAINT";
    case "22P02":
      return "DATABASE_INVALID_VALUE";
    case "42704":
    case "3F000":
      return "DATABASE_SCHEMA_OBJECT_MISSING";
    case "ECONNREFUSED":
    case "ECONNRESET":
    case "ETIMEDOUT":
    case "CONNECTION_CLOSED":
      return "DATABASE_CONNECTION_FAILED";
    default:
      return errorCode?.startsWith("08")
        ? "DATABASE_CONNECTION_FAILED"
        : "DATABASE_OPERATION_FAILED";
  }
}

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
    const errorCode = getSafeErrorCode(error);
    req.log.error(
      {
        errorType: getSafeErrorType(error),
        errorCode,
        errorCategory: getSafeErrorCategory(errorCode),
      },
      "Unhandled API request error",
    );
    res.status(500).json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى." });
  },
);

export default app;
