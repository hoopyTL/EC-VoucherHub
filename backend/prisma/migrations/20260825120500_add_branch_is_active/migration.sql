ALTER TABLE "branches"
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "branches_partner_id_is_active_idx"
ON "branches"("partner_id", "is_active");
