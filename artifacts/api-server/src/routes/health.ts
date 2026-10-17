import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

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
    }>(
      `SELECT required.table_name, required.column_name,
              columns.column_name IS NOT NULL AS present
       FROM (VALUES
         ('book_bundle_offer_settings', 'id'),
         ('book_bundle_offer_settings', 'title'),
         ('book_bundle_offer_settings', 'updated_at'),
         ('book_bundle_books', 'id'),
         ('book_bundle_books', 'cover_data'),
         ('book_bundle_books', 'cover_content_type'),
         ('book_bundle_orders', 'customer_id'),
         ('book_bundle_customers', 'phone'),
         ('book_bundle_order_history', 'order_id'),
         ('book_bundle_admin_credentials', 'password_hash')
       ) AS required(table_name, column_name)
       LEFT JOIN information_schema.columns AS columns
         ON columns.table_schema = 'public'
        AND columns.table_name = required.table_name
        AND columns.column_name = required.column_name`,
    );
    const missingColumns = result.rows
      .filter((row) => !row.present)
      .map((row) => `${row.table_name}.${row.column_name}`);

    if (missingColumns.length > 0) {
      res.status(503).json({
        status: "database_schema_incomplete",
        database: "connected",
        missingColumns,
        help: "شغّل تحديثات قاعدة البيانات الموجودة في مجلد supabase/migrations، ثم أعد الفحص.",
      });
      return;
    }

    res.json({ status: "ok", database: "connected", requiredTables: "present" });
  } catch (error) {
    // Deliberately avoid exposing host names, credentials, or driver internals.
    console.error("Database health check failed", error);
    res.status(503).json({
      status: "database_unavailable",
      database: "unavailable",
      help: "تحقق من سر DATABASE_URL في إعدادات التشغيل، وأن رابط Supabase صحيح ويستخدم Transaction pooler على المنفذ 6543.",
    });
  }
});

export default router;
