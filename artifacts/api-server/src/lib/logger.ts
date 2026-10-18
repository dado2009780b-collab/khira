export type LogFields = Record<string, unknown>;

export interface AppLogger {
  info(messageOrFields: string | LogFields, message?: string): void;
  warn(messageOrFields: string | LogFields, message?: string): void;
  error(messageOrFields: string | LogFields, message?: string): void;
}

type LogLevel = "info" | "warn" | "error";

function createLogger(context: LogFields = {}): AppLogger {
  function write(
    level: LogLevel,
    messageOrFields: string | LogFields,
    message?: string,
  ): void {
    const fields = typeof messageOrFields === "string" ? {} : messageOrFields;
    const text = typeof messageOrFields === "string" ? messageOrFields : message;
    const output = level === "info"
      ? console.info
      : level === "warn"
        ? console.warn
        : console.error;

    if (Object.keys(context).length > 0 || Object.keys(fields).length > 0) {
      output.call(console, text ?? "", { ...context, ...fields });
    } else {
      output.call(console, text ?? "");
    }
  }

  return {
    info: (messageOrFields, message) => write("info", messageOrFields, message),
    warn: (messageOrFields, message) => write("warn", messageOrFields, message),
    error: (messageOrFields, message) => write("error", messageOrFields, message),
  };
}

export function createRequestLogger(context: LogFields): AppLogger {
  return createLogger(context);
}

export const logger = createLogger();

declare global {
  namespace Express {
    interface Request {
      log: AppLogger;
    }
  }
}
