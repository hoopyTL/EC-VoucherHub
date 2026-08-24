CREATE TYPE "staff_status" AS ENUM ('active', 'inactive');

CREATE TABLE "partner_staff" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "partner_id" UUID NOT NULL,
  "status" "staff_status" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "partner_staff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partner_staff_branches" (
  "staff_id" UUID NOT NULL,
  "branch_id" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_staff_branches_pkey" PRIMARY KEY ("staff_id", "branch_id")
);

CREATE UNIQUE INDEX "partner_staff_user_id_key" ON "partner_staff"("user_id");
CREATE INDEX "partner_staff_partner_id_idx" ON "partner_staff"("partner_id");
CREATE INDEX "partner_staff_status_idx" ON "partner_staff"("status");
CREATE INDEX "partner_staff_branches_branch_id_idx" ON "partner_staff_branches"("branch_id");

ALTER TABLE "partner_staff" ADD CONSTRAINT "partner_staff_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_staff" ADD CONSTRAINT "partner_staff_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_staff_branches" ADD CONSTRAINT "partner_staff_branches_staff_id_fkey"
  FOREIGN KEY ("staff_id") REFERENCES "partner_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partner_staff_branches" ADD CONSTRAINT "partner_staff_branches_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
