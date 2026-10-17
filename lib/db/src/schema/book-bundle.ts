import { sql } from "drizzle-orm";
import {
  check,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const orderStatusValues = [
  "new",
  "contacted",
  "confirmed",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
] as const;

export const orderStatusEnum = pgEnum("book_bundle_order_status", orderStatusValues);
export type OrderStatus = (typeof orderStatusValues)[number];

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const customersTable = pgTable(
  "book_bundle_customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("book_bundle_customers_phone_unique").on(table.phone),
    index("book_bundle_customers_name_idx").on(table.name),
    index("book_bundle_customers_city_idx").on(table.city),
  ],
);

export const ordersTable = pgTable(
  "book_bundle_orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: serial("order_number").notNull(),
    customerId: integer("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
    }),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: integer("unit_price").notNull(),
    deliveryFee: integer("delivery_fee").notNull(),
    totalAmount: integer("total_amount").notNull(),
    status: orderStatusEnum("status").notNull().default("new"),
    adminNotes: text("admin_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("book_bundle_orders_order_number_unique").on(table.orderNumber),
    index("book_bundle_orders_status_idx").on(table.status),
    index("book_bundle_orders_created_at_idx").on(table.createdAt),
    index("book_bundle_orders_phone_idx").on(table.phone),
    index("book_bundle_orders_customer_name_idx").on(table.customerName),
    check("book_bundle_orders_quantity_check", sql`${table.quantity} = 1`),
    check(
      "book_bundle_orders_amounts_check",
      sql`${table.unitPrice} >= 0 AND ${table.deliveryFee} >= 0 AND ${table.totalAmount} = ${table.unitPrice} + ${table.deliveryFee}`,
    ),
  ],
);

export const offerSettingsTable = pgTable("book_bundle_offer_settings", {
  id: integer("id").primaryKey().default(1),
  title: text("title").notNull(),
  description: text("description").notNull(),
  closingText: text("closing_text").notNull(),
  ctaText: text("cta_text").notNull(),
  packageName: text("package_name").notNull(),
  price: integer("price").notNull().default(199),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  currency: text("currency").notNull().default("د.ل."),
  benefits: jsonb("benefits").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const bookContentTable = pgTable(
  "book_bundle_books",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    description: text("description").notNull(),
    coverPath: text("cover_path"),
    coverData: bytea("cover_data"),
    coverContentType: text("cover_content_type"),
    coverUpdatedAt: timestamp("cover_updated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "book_bundle_books_id_check",
      sql`${table.id} IN ('dawa-wa-dawa', 'alraheeq-almakhtoom')`,
    ),
    check(
      "book_bundle_books_cover_data_size_check",
      sql`${table.coverData} IS NULL OR octet_length(${table.coverData}) <= 5242880`,
    ),
    check(
      "book_bundle_books_cover_content_type_check",
      sql`${table.coverContentType} IS NULL OR ${table.coverContentType} IN ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "book_bundle_books_cover_pair_check",
      sql`(${table.coverData} IS NULL) = (${table.coverContentType} IS NULL)`,
    ),
  ],
);

export const pendingBookCoverUploadsTable = pgTable(
  "book_bundle_pending_cover_uploads",
  {
    objectPath: text("object_path").primaryKey(),
    bookId: text("book_id")
      .notNull()
      .references(() => bookContentTable.id, { onDelete: "cascade" }),
    adminUserId: text("admin_user_id").notNull(),
    expectedSize: integer("expected_size").notNull(),
    contentType: text("content_type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("book_bundle_pending_cover_uploads_book_idx").on(table.bookId),
    check(
      "book_bundle_pending_cover_uploads_size_check",
      sql`${table.expectedSize} > 0 AND ${table.expectedSize} <= 5242880`,
    ),
    check(
      "book_bundle_pending_cover_uploads_type_check",
      sql`${table.contentType} IN ('image/jpeg', 'image/png', 'image/webp')`,
    ),
  ],
);

export const adminCredentialsTable = pgTable(
  "book_bundle_admin_credentials",
  {
    id: integer("id").primaryKey().default(1),
    passwordHash: text("password_hash").notNull(),
    sessionVersion: integer("session_version").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("book_bundle_admin_credentials_singleton_check", sql`${table.id} = 1`),
    check(
      "book_bundle_admin_credentials_session_version_check",
      sql`${table.sessionVersion} >= 0`,
    ),
  ],
);

export const orderHistoryTable = pgTable(
  "book_bundle_order_history",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => ordersTable.id, { onDelete: "cascade" }),
    previousStatus: orderStatusEnum("previous_status"),
    newStatus: orderStatusEnum("new_status").notNull(),
    adminUserId: text("admin_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("book_bundle_order_history_order_id_idx").on(table.orderId)],
);

export type OrderRecord = typeof ordersTable.$inferSelect;
export type NewOrderRecord = typeof ordersTable.$inferInsert;
export type OfferSettings = typeof offerSettingsTable.$inferSelect;
export type BookContent = typeof bookContentTable.$inferSelect;
export type OrderHistoryEntry = typeof orderHistoryTable.$inferSelect;
