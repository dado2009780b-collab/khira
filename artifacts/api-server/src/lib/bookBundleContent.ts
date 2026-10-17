import { eq, sql } from "drizzle-orm";
import { db, bookContentTable, offerSettingsTable } from "@workspace/db";

export const BOOK_IDS = [
  "dawa-wa-dawa",
  "alraheeq-almakhtoom",
] as const;
export type BookId = (typeof BOOK_IDS)[number];

export const DEFAULT_OFFER = {
  id: 1,
  title: "كتابان.. ورحلة أعمق مع العلم والإيمان 📚",
  description:
    "خُذ خطوة نحو معرفة أعمق مع باقة تجمع بين كتابين مميزين من كتب التراث الإسلامي.",
  closingText: "كتابان.. معرفة تنفعك وأثر يبقى معاك.",
  ctaText: "اطلب الآن",
  packageName: "باقة كتاب الداء والدواء والرحيق المختوم",
  price: 199,
  deliveryFee: 0,
  currency: "د.ل.",
  benefits: [
    "كتابان مميزان في باقة واحدة.",
    "السعر النهائي 199 دينارًا ليبيًا.",
    "توصيل مجاني لجميع المدن الليبية.",
  ],
};

export const DEFAULT_BOOKS = [
  {
    id: "dawa-wa-dawa",
    title: "الداء والدواء",
    author: "ابن قيم الجوزية",
    description:
      "كتاب يتناول أمراض القلوب وأسباب صلاح النفس، ويقدّم معاني إيمانية ودروسًا تساعدك على التأمل ومراجعة النفس.",
  },
  {
    id: "alraheeq-almakhtoom",
    title: "الرحيق المختوم",
    author: "صفي الرحمن المباركفوري",
    description:
      "رحلة في السيرة النبوية، تتعرّف من خلالها على حياة النبي محمد ﷺ وأهم الأحداث والمواقف في سيرته العطرة.",
  },
] as const;

let initialization: Promise<void> | undefined;

export function ensureDefaultOffer(): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      await db
        .insert(offerSettingsTable)
        .values(DEFAULT_OFFER)
        .onConflictDoNothing({ target: offerSettingsTable.id });
      await db.insert(bookContentTable).values([...DEFAULT_BOOKS]).onConflictDoNothing({
        target: bookContentTable.id,
      });
    })().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });
  }

  return initialization;
}

export async function getOfferPayload() {
  await ensureDefaultOffer();
  const [offer] = await db
    .select()
    .from(offerSettingsTable)
    .where(eq(offerSettingsTable.id, 1))
    .limit(1);
  const books = await db.select({
    id: bookContentTable.id,
    title: bookContentTable.title,
    author: bookContentTable.author,
    description: bookContentTable.description,
    hasCover: sql<boolean>`${bookContentTable.coverData} IS NOT NULL`,
    coverUpdatedAt: bookContentTable.coverUpdatedAt,
  }).from(bookContentTable);

  if (!offer || books.length !== 2) {
    throw new Error("Offer content is incomplete in the database");
  }

  return {
    title: offer.title,
    description: offer.description,
    closingText: offer.closingText,
    ctaText: offer.ctaText,
    price: offer.price,
    deliveryFee: offer.deliveryFee,
    currency: offer.currency,
    packageName: offer.packageName,
    benefits: offer.benefits,
    books: BOOK_IDS.map((id) => {
      const book = books.find((item) => item.id === id);
      if (!book) {
        throw new Error(`Missing book content for ${id}`);
      }
      return {
        id: book.id as BookId,
        title: book.title,
        author: book.author,
        description: book.description,
        coverUrl: book.hasCover
          ? `/api/books/${book.id}/cover?v=${book.coverUpdatedAt?.getTime() ?? 0}`
          : null,
      };
    }),
    updatedAt: offer.updatedAt,
  };
}
