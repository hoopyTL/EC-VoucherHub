CREATE TABLE "external_promotions" (
  "id" UUID NOT NULL,
  "source" VARCHAR(32) NOT NULL,
  "external_id" VARCHAR(128) NOT NULL,
  "source_url" VARCHAR(1024) NOT NULL,
  "name" VARCHAR(512) NOT NULL,
  "description" TEXT,
  "merchant" VARCHAR(255),
  "category" VARCHAR(128),
  "image_url" VARCHAR(1024),
  "original_price" DECIMAL(12,2),
  "sale_price" DECIMAL(12,2),
  "discount_percentage" INTEGER,
  "promo_code" VARCHAR(128),
  "terms" TEXT,
  "sale_start" TIMESTAMPTZ(6),
  "sale_end" TIMESTAMPTZ(6),
  "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "external_promotions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "external_promotions_source_external_id_key" ON "external_promotions"("source", "external_id");
CREATE INDEX "external_promotions_source_idx" ON "external_promotions"("source");
CREATE INDEX "external_promotions_last_seen_at_idx" ON "external_promotions"("last_seen_at");
