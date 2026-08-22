-- AlterTable (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE "orders" ADD COLUMN "expires_at" TIMESTAMPTZ(6);
  END IF;
END $$;
