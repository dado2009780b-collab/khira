import express, { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  DeleteBookCoverParams,
  DeleteBookCoverResponse,
  GetPublicBookCoverParams,
} from "@workspace/api-zod";
import { bookContentTable, db } from "@workspace/db";
import { getOfferPayload } from "../lib/bookBundleContent";
import { requireAdmin } from "../middlewares/adminPasswordAuth";

const router: IRouter = Router();
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validImageHeader(contentType: string, header: Buffer): boolean {
  if (contentType === "image/jpeg") {
    return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (contentType === "image/png") {
    return header.length >= 8 && header.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  return contentType === "image/webp" && header.length >= 12 &&
    header.toString("ascii", 0, 4) === "RIFF" &&
    header.toString("ascii", 8, 12) === "WEBP";
}

router.get("/books/:bookId/cover", async (req, res): Promise<void> => {
  const params = GetPublicBookCoverParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).end();
    return;
  }

  const [book] = await db
    .select({
      coverData: bookContentTable.coverData,
      coverContentType: bookContentTable.coverContentType,
    })
    .from(bookContentTable)
    .where(eq(bookContentTable.id, params.data.bookId))
    .limit(1);

  if (!book?.coverData || !book.coverContentType || !ALLOWED_CONTENT_TYPES.has(book.coverContentType)) {
    res.status(404).end();
    return;
  }

  res.setHeader("Content-Type", book.coverContentType);
  res.setHeader("Content-Length", book.coverData.byteLength);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).send(book.coverData);
});

router.use("/admin", requireAdmin);

router.put(
  "/admin/books/:bookId/cover",
  express.raw({ type: [...ALLOWED_CONTENT_TYPES], limit: MAX_COVER_BYTES }),
  async (req, res): Promise<void> => {
    const params = GetPublicBookCoverParams.safeParse(req.params);
    const contentType = req.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    const file = Buffer.isBuffer(req.body) ? req.body : null;
    if (
      !params.success ||
      !file ||
      file.length === 0 ||
      file.length > MAX_COVER_BYTES ||
      !ALLOWED_CONTENT_TYPES.has(contentType)
    ) {
      res.status(400).json({ error: "اختر صورة JPG أو PNG أو WebP لا يتجاوز حجمها 5 ميغابايت." });
      return;
    }
    if (!validImageHeader(contentType, file.subarray(0, 12))) {
      res.status(400).json({ error: "محتوى الملف لا يطابق نوع الصورة المعلن." });
      return;
    }

    const [book] = await db
      .select({ id: bookContentTable.id })
      .from(bookContentTable)
      .where(eq(bookContentTable.id, params.data.bookId))
      .limit(1);
    if (!book) {
      res.status(404).json({ error: "لم يتم العثور على الكتاب." });
      return;
    }

    await db
      .update(bookContentTable)
      .set({
        coverData: file,
        coverContentType: contentType,
        coverPath: null,
        coverUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookContentTable.id, params.data.bookId));

    const offer = await getOfferPayload();
    const updatedBook = offer.books.find((item) => item.id === params.data.bookId);
    if (!updatedBook) {
      throw new Error("Saved cover is not present in the offer payload");
    }
    res.json(updatedBook);
  },
);

router.delete(
  "/admin/books/:bookId/cover",
  async (req, res): Promise<void> => {
    const params = DeleteBookCoverParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "معرّف الكتاب غير صالح." });
      return;
    }

    const [book] = await db
      .select({ id: bookContentTable.id })
      .from(bookContentTable)
      .where(eq(bookContentTable.id, params.data.bookId))
      .limit(1);
    if (!book) {
      res.status(404).json({ error: "لم يتم العثور على الكتاب." });
      return;
    }

    await db
      .update(bookContentTable)
      .set({
        coverData: null,
        coverContentType: null,
        coverPath: null,
        coverUpdatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(bookContentTable.id, params.data.bookId));

    const offer = await getOfferPayload();
    const updatedBook = offer.books.find((item) => item.id === params.data.bookId);
    if (!updatedBook) {
      throw new Error("Updated book is not present in the offer payload");
    }
    res.json(DeleteBookCoverResponse.parse(updatedBook));
  },
);

export default router;
