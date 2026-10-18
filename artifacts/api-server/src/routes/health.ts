import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

function classifyDatabaseErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (
    /password authentication failed|invalid password|authentication failed/.test(
      normalized,
    )
  ) {
    return "28P01";
  }
  if (/tenant or user not found/.test(normalized)) {
    return "POOLER_CREDENTIALS_INVALID";
  }
  if (
    /getaddrinfo|enotfound|eai_again|name or service not known/.test(normalized)
  ) {
    return "DNS_LOOKUP_FAILED";
  }
  if (/etimedout|timed out|timeout expired/.test(normalized)) {
    return "ETIMEDOUT";
  }
  if (/econnrefused|connection refused/.test(normalized)) {
    return "ECONNREFUSED";
  }
  if (/econnreset|connection reset/.test(normalized)) {
    return "ECONNRESET";
  }
  if (
    /certificate|\btls\b|\bssl\b|self.signed|unable to verify/.test(normalized)
  ) {
    return "TLS_CONNECTION_ERROR";
  }
  if (/invalid connection string|invalid url/.test(normalized)) {
    return "INVALID_DATABASE_URL";
  }
  if (/not implemented|not supported|unsupported/.test(normalized)) {
    return "DATABASE_DRIVER_UNSUPPORTED_OPERATION";
  }
  if (/connection terminated|connection closed/.test(normalized)) {
    return "CONNECTION_CLOSED";
  }
  if (/connect|socket|network/.test(normalized)) {
    return "DATABASE_TRANSPORT_ERROR";
  }

  return "UNKNOWN_DATABASE_ERROR";
}

function getSafeDatabaseErrorType(error: unknown, depth = 0): string {
  if (depth > 6 || typeof error !== "object" || error === null) {
    return "UnknownError";
  }

  const candidate = error as {
    name?: unknown;
    cause?: unknown;
    errors?: unknown;
  };
  if (
    typeof candidate.name === "string" &&
    /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(candidate.name) &&
    candidate.name !== "Error"
  ) {
    return candidate.name;
  }

  if (Array.isArray(candidate.errors)) {
    for (const nestedError of candidate.errors) {
      const nestedType = getSafeDatabaseErrorType(nestedError, depth + 1);
      if (nestedType !== "UnknownError") {
        return nestedType;
      }
    }
  }

  return candidate.cause
    ? getSafeDatabaseErrorType(candidate.cause, depth + 1)
    : typeof candidate.name === "string" &&
        /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(candidate.name)
      ? candidate.name
      : "UnknownError";
}

function getSafeDatabaseErrorCode(error: unknown, depth = 0): string {
  if (depth > 6 || typeof error !== "object" || error === null) {
    return "UNKNOWN_DATABASE_ERROR";
  }

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
    errors?: unknown;
    message?: unknown;
  };
  if (typeof candidate.code === "string") {
    const normalizedCode = candidate.code.toUpperCase();
    if (/^[A-Z0-9_]{2,64}$/.test(normalizedCode)) {
      return normalizedCode;
    }
  }

  if (Array.isArray(candidate.errors)) {
    for (const nestedError of candidate.errors) {
      const nestedCode = getSafeDatabaseErrorCode(nestedError, depth + 1);
      if (nestedCode !== "UNKNOWN_DATABASE_ERROR") {
        return nestedCode;
      }
    }
  }

  if (candidate.cause) {
    const nestedCode = getSafeDatabaseErrorCode(candidate.cause, depth + 1);
    if (nestedCode !== "UNKNOWN_DATABASE_ERROR") {
      return nestedCode;
    }
  }

  return typeof candidate.message === "string"
    ? classifyDatabaseErrorMessage(candidate.message)
    : "UNKNOWN_DATABASE_ERROR";
}

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    const result = await pool.query<{
      table_name: string;
      column_name: string;
      present: boolean;
      table_present: boolean;
    }>(
      `SELECT required.table_name, required.column_name,
              columns.column_name IS NOT NULL AS present,
              tables.table_name IS NOT NULL AS table_present
       FROM (VALUES
         ('book_bundle_offer_settings', 'id'),
         ('book_bundle_offer_settings', 'title'),
         ('book_bundle_offer_settings', 'description'),
         ('book_bundle_offer_settings', 'closing_text'),
         ('book_bundle_offer_settings', 'cta_text'),
         ('book_bundle_offer_settings', 'package_name'),
         ('book_bundle_offer_settings', 'price'),
         ('book_bundle_offer_settings', 'delivery_fee'),
         ('book_bundle_offer_settings', 'currency'),
         ('book_bundle_offer_settings', 'benefits'),
         ('book_bundle_offer_settings', 'updated_at'),
         ('book_bundle_books', 'id'),
         ('book_bundle_books', 'title'),
         ('book_bundle_books', 'author'),
         ('book_bundle_books', 'description'),
         ('book_bundle_books', 'cover_path'),
         ('book_bundle_books', 'cover_data'),
         ('book_bundle_books', 'cover_content_type'),
         ('book_bundle_books', 'cover_updated_at'),
         ('book_bundle_books', 'updated_at'),
         ('book_bundle_customers', 'id'),
         ('book_bundle_customers', 'name'),
         ('book_bundle_customers', 'phone'),
         ('book_bundle_customers', 'city'),
         ('book_bundle_customers', 'created_at'),
         ('book_bundle_customers', 'updated_at'),
         ('book_bundle_orders', 'id'),
         ('book_bundle_orders', 'order_number'),
         ('book_bundle_orders', 'customer_id'),
         ('book_bundle_orders', 'customer_name'),
         ('book_bundle_orders', 'phone'),
         ('book_bundle_orders', 'city'),
         ('book_bundle_orders', 'product_name'),
         ('book_bundle_orders', 'quantity'),
         ('book_bundle_orders', 'unit_price'),
         ('book_bundle_orders', 'delivery_fee'),
         ('book_bundle_orders', 'total_amount'),
         ('book_bundle_orders', 'status'),
         ('book_bundle_orders', 'admin_notes'),
         ('book_bundle_orders', 'created_at'),
         ('book_bundle_orders', 'updated_at'),
         ('book_bundle_order_history', 'id'),
         ('book_bundle_order_history', 'order_id'),
         ('book_bundle_order_history', 'previous_status'),
         ('book_bundle_order_history', 'new_status'),
         ('book_bundle_order_history', 'admin_user_id'),
         ('book_bundle_order_history', 'created_at'),
         ('book_bundle_admin_credentials', 'id'),
         ('book_bundle_admin_credentials', 'password_hash'),
         ('book_bundle_admin_credentials', 'session_version'),
         ('book_bundle_admin_credentials', 'updated_at'),
         ('book_bundle_pending_cover_uploads', 'object_path'),
         ('book_bundle_pending_cover_uploads', 'book_id'),
         ('book_bundle_pending_cover_uploads', 'admin_user_id'),
         ('book_bundle_pending_cover_uploads', 'expected_size'),
         ('book_bundle_pending_cover_uploads', 'content_type'),
         ('book_bundle_pending_cover_uploads', 'expires_at'),
         ('book_bundle_pending_cover_uploads', 'created_at')
       ) AS required(table_name, column_name)
       LEFT JOIN information_schema.tables AS tables
         ON tables.table_schema = 'public'
        AND tables.table_name = required.table_name
        AND tables.table_type = 'BASE TABLE'
       LEFT JOIN information_schema.columns AS columns
         ON columns.table_schema = 'public'
        AND columns.table_name = required.table_name
        AND columns.column_name = required.column_name`,
    );
    const missingTables = [
      ...new Set(
        result.rows
          .filter((row) => !row.table_present)
          .map((row) => row.table_name),
      ),
    ];
    const missingColumns = result.rows
      .filter((row) => !row.present)
      .filter((row) => row.table_present)
      .map((row) => `${row.table_name}.${row.column_name}`);

    const missingEnumValues = await pool.query<{ enumlabel: string }>(
      `SELECT required.enumlabel
       FROM (VALUES
         ('new'), ('contacted'), ('confirmed'), ('preparing'),
         ('shipped'), ('completed'), ('cancelled')
       ) AS required(enumlabel)
       LEFT JOIN pg_namespace AS enum_schema
         ON enum_schema.nspname = 'public'
       LEFT JOIN pg_type AS enum_type
         ON enum_type.typnamespace = enum_schema.oid
        AND enum_type.typname = 'book_bundle_order_status'
       LEFT JOIN pg_enum AS enum_value
         ON enum_value.enumtypid = enum_type.oid
        AND enum_value.enumlabel = required.enumlabel
       WHERE enum_value.enumlabel IS NULL`,
    );
    const missingOrderStatusValues = missingEnumValues.rows.map(
      (row) => row.enumlabel,
    );

    if (
      missingTables.length > 0 ||
      missingColumns.length > 0 ||
      missingOrderStatusValues.length > 0
    ) {
      res.status(503).json({
        status: "database_schema_incomplete",
        database: "connected",
        missingTables,
        missingColumns,
        missingOrderStatusValues,
        help: "قاعدة البيانات متصلة، لكن بنيتها لا تطابق الموقع. أرسل قائمة الجداول والأعمدة الناقصة لنجهز لك إصلاح SQL المناسب.",
      });
      return;
    }

    res.json({
      status: "ok",
      database: "connected",
      requiredTables: "present",
    });
  } catch (error) {
    // Expose only a safe driver error code; never return connection details.
    const errorCode = getSafeDatabaseErrorCode(error);
    const errorType = getSafeDatabaseErrorType(error);
    console.error("Database health check failed", { errorCode, errorType });
    res.status(503).json({
      status: "database_unavailable",
      database: "unavailable",
      errorCode,
      errorType,
      help: "تحقق من سر DATABASE_URL في إعدادات التشغيل، وأن رابط Supabase صحيح ويستخدم Transaction pooler على المنفذ 6543.",
    });
  }
});

export default router;
