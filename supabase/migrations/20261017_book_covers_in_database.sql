ALTER TABLE public.book_bundle_books
  ADD COLUMN IF NOT EXISTS cover_data bytea,
  ADD COLUMN IF NOT EXISTS cover_content_type text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'book_bundle_books_cover_data_size_check'
  ) THEN
    ALTER TABLE public.book_bundle_books
      ADD CONSTRAINT book_bundle_books_cover_data_size_check
      CHECK (cover_data IS NULL OR octet_length(cover_data) <= 5242880);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'book_bundle_books_cover_content_type_check'
  ) THEN
    ALTER TABLE public.book_bundle_books
      ADD CONSTRAINT book_bundle_books_cover_content_type_check
      CHECK (cover_content_type IS NULL OR cover_content_type IN ('image/jpeg', 'image/png', 'image/webp'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'book_bundle_books_cover_pair_check'
  ) THEN
    ALTER TABLE public.book_bundle_books
      ADD CONSTRAINT book_bundle_books_cover_pair_check
      CHECK ((cover_data IS NULL) = (cover_content_type IS NULL));
  END IF;
END $$;
