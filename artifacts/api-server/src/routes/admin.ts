import { Router, type IRouter } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  or,
  sql,
} from "drizzle-orm";
import {
  ExportAdminOrdersQueryParams,
  GetAdminOrderParams,
  GetAdminOrderResponse,
  GetAdminOverviewResponse,
  ListAdminOrdersQueryParams,
  ListAdminOrdersResponse,
  UpdateAdminOrderBody,
  UpdateAdminOrderParams,
  UpdateAdminOrderResponse,
  UpdateOfferBody,
  UpdateOfferResponse,
} from "@workspace/api-zod";
import {
  db,
  customersTable,
  orderHistoryTable,
  orderStatusValues,
  ordersTable,
  offerSettingsTable,
  bookContentTable,
  type OrderStatus as DbOrderStatus,
} from "@workspace/db";
import { getOfferPayload, ensureDefaultOffer } from "../lib/bookBundleContent";
import { requireAdmin } from "../middlewares/adminPasswordAuth";

const router: IRouter = Router();
router.use("/admin", requireAdmin);

type AdminFilters = {
  search?: string;
  status?: DbOrderStatus;
  fromDate?: Date;
  toDate?: Date;
};

function singleQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return undefined;
}

function queryDate(value: string | undefined): Date | null | undefined {
  if (value === undefined || value === "") return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return null;
  }
  return parsed;
}

function parseFilters(query: Record<string, unknown> | object):
  | { ok: true; filters: AdminFilters }
  | { ok: false } {
  const values = query as Record<string, unknown>;
  for (const key of ["search", "status", "fromDate", "toDate"]) {
    if (values[key] !== undefined && typeof values[key] !== "string") {
      return { ok: false };
    }
  }

  const fromDate = queryDate(singleQueryValue(values.fromDate));
  const toDate = queryDate(singleQueryValue(values.toDate));
  if (fromDate === null || toDate === null) {
    return { ok: false };
  }

  const search = singleQueryValue(values.search)?.trim();
  const rawStatus = singleQueryValue(values.status);
  const status =
    rawStatus && orderStatusValues.includes(rawStatus as DbOrderStatus)
      ? (rawStatus as DbOrderStatus)
      : undefined;
  if (rawStatus && !status) {
    return { ok: false };
  }

  return {
    ok: true,
    filters: {
      search: search || undefined,
      status,
      fromDate,
      toDate,
    },
  };
}

function localDayStart(date: Date): Date {
  const dateKey = date.toISOString().slice(0, 10);
  return new Date(`${dateKey}T00:00:00+02:00`);
}

function nextLocalDayStart(date: Date): Date {
  const dayAfter = new Date(`${date.toISOString().slice(0, 10)}T12:00:00.000Z`);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  return new Date(`${dayAfter.toISOString().slice(0, 10)}T00:00:00+02:00`);
}

function orderNumberLabel(orderNumber: number): string {
  return `BK-${String(orderNumber).padStart(6, "0")}`;
}

function toAdminOrder(order: typeof ordersTable.$inferSelect) {
  return {
    id: order.id,
    orderNumber: orderNumberLabel(order.orderNumber),
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    productName: order.productName,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    status: order.status,
    adminNotes: order.adminNotes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function buildOrderConditions(filters: AdminFilters) {
  const conditions = [];
  if (filters.status) {
    conditions.push(eq(ordersTable.status, filters.status));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(ordersTable.customerName, pattern),
        ilike(ordersTable.phone, pattern),
        ilike(
          sql<string>`concat('BK-', lpad(${ordersTable.orderNumber}::text, 6, '0'))`,
          pattern,
        ),
      )!,
    );
  }
  if (filters.fromDate) {
    conditions.push(gte(ordersTable.createdAt, localDayStart(filters.fromDate)));
  }
  if (filters.toDate) {
    conditions.push(lt(ordersTable.createdAt, nextLocalDayStart(filters.toDate)));
  }
  return conditions.length ? and(...conditions) : undefined;
}

function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function formatOrderDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Tripoli",
  }).format(date);
}

router.get("/admin/customers", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const where = search
    ? or(
        ilike(customersTable.name, `%${search}%`),
        ilike(customersTable.phone, `%${search}%`),
        ilike(customersTable.city, `%${search}%`),
      )
    : undefined;
  const baseQuery = db
    .select({
      id: customersTable.id,
      name: customersTable.name,
      phone: customersTable.phone,
      city: customersTable.city,
      updatedAt: customersTable.updatedAt,
      orderCount: count(ordersTable.id),
    })
    .from(customersTable)
    .leftJoin(
      ordersTable,
      or(
        eq(ordersTable.customerId, customersTable.id),
        eq(ordersTable.phone, customersTable.phone),
      )!,
    )
    .groupBy(customersTable.id)
    .orderBy(desc(customersTable.updatedAt))
    .limit(100);
  res.json(await (where ? baseQuery.where(where) : baseQuery));
});

router.get("/admin/customers/:customerId", async (req, res): Promise<void> => {
  const customerId = Number(req.params.customerId);
  if (!Number.isSafeInteger(customerId) || customerId < 1) {
    res.status(400).json({ error: "رقم العميل غير صالح." });
    return;
  }
  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, customerId))
    .limit(1);
  if (!customer) {
    res.status(404).json({ error: "لم يتم العثور على العميل." });
    return;
  }
  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      or(
        eq(ordersTable.customerId, customerId),
        eq(ordersTable.phone, customer.phone),
      ),
    )
    .orderBy(desc(ordersTable.createdAt));
  res.json({ customer, orders: orders.map(toAdminOrder) });
});

router.get("/admin/overview", async (req, res): Promise<void> => {
  const groupedStatuses = await db
    .select({
      status: ordersTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(ordersTable)
    .groupBy(ordersTable.status);
  const groupedByStatus = new Map(
    groupedStatuses.map((item) => [item.status, item.count]),
  );
  const statusCounts = orderStatusValues.map((status) => ({
    status,
    count: groupedByStatus.get(status) ?? 0,
  }));
  const totalOrders = statusCounts.reduce((sum, item) => sum + item.count, 0);

  const tripoliParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tripoli",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((parts, item) => {
      if (item.type !== "literal") parts[item.type] = item.value;
      return parts;
    }, {});
  const todayKey = `${tripoliParts.year}-${tripoliParts.month}-${tripoliParts.day}`;
  const today = new Date(`${todayKey}T12:00:00.000Z`);
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return date.toISOString().slice(0, 10);
  });
  const firstDay = new Date(`${dayKeys[0]}T12:00:00.000Z`);
  const startOfWeek = new Date(
    `${firstDay.toISOString().slice(0, 10)}T00:00:00+02:00`,
  );
  const todayStart = new Date(`${todayKey}T00:00:00+02:00`);
  const tomorrowStart = new Date(`${todayKey}T12:00:00.000Z`);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const todayEnd = new Date(
    `${tomorrowStart.toISOString().slice(0, 10)}T00:00:00+02:00`,
  );

  const [todayResult] = await db
    .select({ value: count() })
    .from(ordersTable)
    .where(
      and(
        gte(ordersTable.createdAt, todayStart),
        lt(ordersTable.createdAt, todayEnd),
      ),
    );
  const [last7DaysResult] = await db
    .select({ value: count() })
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, startOfWeek));

  const sumForStatus = async (status: DbOrderStatus): Promise<number> => {
    const [result] = await db
      .select({
        value: sql<number>`coalesce(sum(${ordersTable.totalAmount}), 0)::int`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.status, status));
    return result?.value ?? 0;
  };
  const [dailyRows, newOrdersValue, confirmedOrdersValue, completedOrdersValue] =
    await Promise.all([
      db
        .select({
          date: sql<string>`to_char(${ordersTable.createdAt} at time zone 'Africa/Tripoli', 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(ordersTable)
        .where(gte(ordersTable.createdAt, startOfWeek))
        .groupBy(
          sql`to_char(${ordersTable.createdAt} at time zone 'Africa/Tripoli', 'YYYY-MM-DD')`,
        ),
      sumForStatus("new"),
      sumForStatus("confirmed"),
      sumForStatus("completed"),
    ]);
  const dailyCounts = new Map(dailyRows.map((item) => [item.date, item.count]));

  req.log.info("Fetched administrator order overview");
  res.json(
    GetAdminOverviewResponse.parse({
      totalOrders,
      todayOrders: todayResult?.value ?? 0,
      last7DaysOrders: last7DaysResult?.value ?? 0,
      newOrdersValue,
      confirmedOrdersValue,
      completedOrdersValue,
      statusCounts,
      dailyOrders: dayKeys.map((date) => ({
        date: new Date(`${date}T00:00:00.000Z`),
        count: dailyCounts.get(date) ?? 0,
      })),
    }),
  );
});

router.get("/admin/orders", async (req, res): Promise<void> => {
  const parsedFilters = parseFilters(req.query);
  if (!parsedFilters.ok) {
    res.status(400).json({ error: "تأكد من صحة البحث والمرشحات." });
    return;
  }

  const parsedQuery = ListAdminOrdersQueryParams.safeParse({
    ...req.query,
    ...parsedFilters.filters,
  });
  if (!parsedQuery.success) {
    res.status(400).json({ error: "تأكد من صحة رقم الصفحة وعدد النتائج." });
    return;
  }

  if (
    parsedFilters.filters.fromDate &&
    parsedFilters.filters.toDate &&
    parsedFilters.filters.fromDate > parsedFilters.filters.toDate
  ) {
    res.status(400).json({ error: "تاريخ البداية يجب أن يسبق تاريخ النهاية." });
    return;
  }

  const where = buildOrderConditions(parsedFilters.filters);
  const query = db.select().from(ordersTable);
  const countQuery = db.select({ total: count() }).from(ordersTable);
  const [rows, totals] = await Promise.all([
    (where ? query.where(where) : query)
      .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id))
      .limit(parsedQuery.data.pageSize)
      .offset((parsedQuery.data.page - 1) * parsedQuery.data.pageSize),
    where ? countQuery.where(where) : countQuery,
  ]);

  res.json(
    ListAdminOrdersResponse.parse({
      items: rows.map(toAdminOrder),
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
      total: totals[0]?.total ?? 0,
    }),
  );
});

router.get("/admin/orders/export", async (req, res): Promise<void> => {
  const parsedFilters = parseFilters(req.query);
  if (!parsedFilters.ok) {
    res.status(400).json({ error: "تأكد من صحة البحث والمرشحات." });
    return;
  }
  const parsedQuery = ExportAdminOrdersQueryParams.safeParse({
    ...req.query,
    ...parsedFilters.filters,
  });
  if (!parsedQuery.success) {
    res.status(400).json({ error: "تأكد من صحة المرشحات." });
    return;
  }
  if (
    parsedFilters.filters.fromDate &&
    parsedFilters.filters.toDate &&
    parsedFilters.filters.fromDate > parsedFilters.filters.toDate
  ) {
    res.status(400).json({ error: "تاريخ البداية يجب أن يسبق تاريخ النهاية." });
    return;
  }

  const where = buildOrderConditions(parsedFilters.filters);
  const query = db.select().from(ordersTable);
  const orders = await (where ? query.where(where) : query).orderBy(
    desc(ordersTable.createdAt),
    desc(ordersTable.id),
  );
  const rows: unknown[][] = [
    [
      "رقم الطلب",
      "اسم العميل",
      "رقم الهاتف",
      "المدينة",
      "الباقة",
      "الكمية",
      "سعر الباقة",
      "التوصيل",
      "الإجمالي",
      "الحالة",
      "الملاحظات الإدارية",
      "تاريخ الطلب",
      "آخر تحديث",
    ],
    ...orders.map((order) => [
      orderNumberLabel(order.orderNumber),
      order.customerName,
      order.phone,
      order.city,
      order.productName,
      order.quantity,
      order.unitPrice,
      order.deliveryFee,
      order.totalAmount,
      order.status,
      order.adminNotes,
      formatOrderDate(order.createdAt),
      formatOrderDate(order.updatedAt),
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="book-bundle-orders.csv"');
  res.send(csv);
});

router.get("/admin/orders/:orderId", async (req, res): Promise<void> => {
  const params = GetAdminOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "رقم الطلب غير صالح." });
    return;
  }
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.orderId))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: "لم يتم العثور على الطلب." });
    return;
  }
  const history = await db
    .select()
    .from(orderHistoryTable)
    .where(eq(orderHistoryTable.orderId, order.id))
    .orderBy(asc(orderHistoryTable.createdAt), asc(orderHistoryTable.id));

  res.json(
    GetAdminOrderResponse.parse({
      order: toAdminOrder(order),
      history,
    }),
  );
});

router.patch("/admin/orders/:orderId", async (req, res): Promise<void> => {
  const params = UpdateAdminOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "رقم الطلب غير صالح." });
    return;
  }
  const parsed = UpdateAdminOrderBody.safeParse(req.body);
  if (
    !parsed.success ||
    (parsed.data.status === undefined && parsed.data.adminNotes === undefined)
  ) {
    res.status(400).json({ error: "أدخل الحالة الجديدة أو الملاحظات." });
    return;
  }
  const adminUserId = req.adminUserId;
  if (!adminUserId) {
    res.status(401).json({ error: "يلزم تسجيل الدخول." });
    return;
  }

  const updateResult = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, params.data.orderId))
      .limit(1);
    if (!existing) return null;

    const nextStatus = (parsed.data.status ?? existing.status) as DbOrderStatus;
    const [order] = await tx
      .update(ordersTable)
      .set({
        ...(parsed.data.status !== undefined ? { status: nextStatus } : {}),
        ...(parsed.data.adminNotes !== undefined
          ? { adminNotes: parsed.data.adminNotes.trim() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, existing.id))
      .returning();

    const statusChanged =
      parsed.data.status !== undefined && nextStatus !== existing.status;
    if (statusChanged) {
      await tx.insert(orderHistoryTable).values({
        orderId: existing.id,
        previousStatus: existing.status,
        newStatus: nextStatus,
        adminUserId,
      });
    }

    return order ? { order, statusChanged } : null;
  });
  if (!updateResult) {
    res.status(404).json({ error: "لم يتم العثور على الطلب." });
    return;
  }

  req.log.info(
    {
      orderId: updateResult.order.id,
      adminUserId,
      statusChanged: updateResult.statusChanged,
    },
    "Administrator updated order",
  );
  res.json(UpdateAdminOrderResponse.parse(toAdminOrder(updateResult.order)));
});

router.patch("/admin/offer", async (req, res): Promise<void> => {
  const parsed = UpdateOfferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "تحقق من محتوى العرض والسعر." });
    return;
  }
  const bookIds = new Set(parsed.data.books.map((book) => book.id));
  if (
    bookIds.size !== 2 ||
    !bookIds.has("dawa-wa-dawa") ||
    !bookIds.has("alraheeq-almakhtoom")
  ) {
    res.status(400).json({ error: "يجب تحديث بيانات الكتابين المحددين فقط." });
    return;
  }

  await ensureDefaultOffer();
  await db.transaction(async (tx) => {
    await tx
      .update(offerSettingsTable)
      .set({
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        closingText: parsed.data.closingText.trim(),
        ctaText: parsed.data.ctaText.trim(),
        packageName: parsed.data.packageName.trim(),
        price: parsed.data.price,
        deliveryFee: parsed.data.deliveryFee,
        benefits: parsed.data.benefits.map((benefit) => benefit.trim()),
        updatedAt: new Date(),
      })
      .where(eq(offerSettingsTable.id, 1));

    for (const book of parsed.data.books) {
      await tx
        .update(bookContentTable)
        .set({
          title: book.title.trim(),
          author: book.author.trim(),
          description: book.description.trim(),
          updatedAt: new Date(),
        })
        .where(eq(bookContentTable.id, book.id));
    }
  });

  req.log.info(
    { adminUserId: req.adminUserId },
    "Administrator updated public offer content",
  );
  res.json(UpdateOfferResponse.parse(await getOfferPayload()));
});

export default router;
