-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'locked');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "operating_status" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "voucher_status" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'on_sale', 'paused', 'discontinued');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending_payment', 'paid', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "voucher_code_status" AS ENUM ('unused', 'used', 'expired', 'cancelled', 'locked');

-- CreateEnum
CREATE TYPE "usage_result" AS ENUM ('success', 'invalid_code', 'expired', 'already_used', 'wrong_branch', 'locked');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(32) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "role_id" INTEGER NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "full_name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "legal_name" VARCHAR(255) NOT NULL,
    "tax_code" VARCHAR(32) NOT NULL,
    "representative" VARCHAR(255) NOT NULL,
    "approval_status" "approval_status" NOT NULL DEFAULT 'pending',
    "reject_reason" TEXT,
    "operating_status" "operating_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "partner_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "region" VARCHAR(128) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "parent_id" INTEGER,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_products" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "category_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" VARCHAR(512),
    "original_price" DECIMAL(12,2) NOT NULL,
    "sale_price" DECIMAL(12,2) NOT NULL,
    "sale_start" TIMESTAMPTZ(6) NOT NULL,
    "sale_end" TIMESTAMPTZ(6) NOT NULL,
    "usage_start" TIMESTAMPTZ(6) NOT NULL,
    "usage_end" TIMESTAMPTZ(6) NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "remaining_quantity" INTEGER NOT NULL,
    "is_multi_use" BOOLEAN NOT NULL DEFAULT false,
    "uses_per_code" INTEGER,
    "status" "voucher_status" NOT NULL DEFAULT 'draft',
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "voucher_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_product_branches" (
    "voucher_product_id" UUID NOT NULL,
    "branch_id" INTEGER NOT NULL,

    CONSTRAINT "voucher_product_branches_pkey" PRIMARY KEY ("voucher_product_id","branch_id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "cart_id" UUID NOT NULL,
    "voucher_product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(32) NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'pending_payment',
    "gift_recipient" JSONB,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "order_id" UUID NOT NULL,
    "voucher_product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issued_voucher_codes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "voucher_product_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "status" "voucher_code_status" NOT NULL DEFAULT 'unused',
    "remaining_uses" INTEGER NOT NULL DEFAULT 1,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "issued_voucher_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" SERIAL NOT NULL,
    "issued_code_id" UUID NOT NULL,
    "branch_id" INTEGER NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "usage_result" NOT NULL,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "partners_owner_user_id_key" ON "partners"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "partners_tax_code_key" ON "partners"("tax_code");

-- CreateIndex
CREATE INDEX "branches_partner_id_idx" ON "branches"("partner_id");

-- CreateIndex
CREATE INDEX "branches_region_idx" ON "branches"("region");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_parent_id_key" ON "categories"("name", "parent_id");

-- CreateIndex
CREATE INDEX "voucher_products_partner_id_idx" ON "voucher_products"("partner_id");

-- CreateIndex
CREATE INDEX "voucher_products_category_id_idx" ON "voucher_products"("category_id");

-- CreateIndex
CREATE INDEX "voucher_products_status_idx" ON "voucher_products"("status");

-- CreateIndex
CREATE INDEX "voucher_products_sale_start_sale_end_idx" ON "voucher_products"("sale_start", "sale_end");

-- CreateIndex
CREATE INDEX "voucher_products_usage_start_usage_end_idx" ON "voucher_products"("usage_start", "usage_end");

-- CreateIndex
CREATE INDEX "voucher_products_remaining_quantity_idx" ON "voucher_products"("remaining_quantity");

-- CreateIndex
CREATE INDEX "voucher_product_branches_branch_id_idx" ON "voucher_product_branches"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_customer_id_key" ON "carts"("customer_id");

-- CreateIndex
CREATE INDEX "cart_items_voucher_product_id_idx" ON "cart_items"("voucher_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_voucher_product_id_key" ON "cart_items"("cart_id", "voucher_product_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_voucher_product_id_idx" ON "order_items"("voucher_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "issued_voucher_codes_code_key" ON "issued_voucher_codes"("code");

-- CreateIndex
CREATE INDEX "issued_voucher_codes_order_id_idx" ON "issued_voucher_codes"("order_id");

-- CreateIndex
CREATE INDEX "issued_voucher_codes_order_item_id_idx" ON "issued_voucher_codes"("order_item_id");

-- CreateIndex
CREATE INDEX "issued_voucher_codes_voucher_product_id_idx" ON "issued_voucher_codes"("voucher_product_id");

-- CreateIndex
CREATE INDEX "issued_voucher_codes_owner_user_id_idx" ON "issued_voucher_codes"("owner_user_id");

-- CreateIndex
CREATE INDEX "issued_voucher_codes_status_idx" ON "issued_voucher_codes"("status");

-- CreateIndex
CREATE INDEX "usage_logs_issued_code_id_idx" ON "usage_logs"("issued_code_id");

-- CreateIndex
CREATE INDEX "usage_logs_branch_id_idx" ON "usage_logs"("branch_id");

-- CreateIndex
CREATE INDEX "usage_logs_actor_user_id_idx" ON "usage_logs"("actor_user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_product_branches" ADD CONSTRAINT "voucher_product_branches_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_product_branches" ADD CONSTRAINT "voucher_product_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_voucher_codes" ADD CONSTRAINT "issued_voucher_codes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_voucher_codes" ADD CONSTRAINT "issued_voucher_codes_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_voucher_codes" ADD CONSTRAINT "issued_voucher_codes_voucher_product_id_fkey" FOREIGN KEY ("voucher_product_id") REFERENCES "voucher_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_voucher_codes" ADD CONSTRAINT "issued_voucher_codes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_issued_code_id_fkey" FOREIGN KEY ("issued_code_id") REFERENCES "issued_voucher_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Manual CHECK constraints added by hand
-- Users: email or phone must be provided
ALTER TABLE "users" ADD CONSTRAINT "users_email_phone_check" CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- VoucherProducts: pricing and quantity logic
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_price_check" CHECK (sale_price < original_price);
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_quantity_check" CHECK (total_quantity >= 0 AND remaining_quantity >= 0 AND remaining_quantity <= total_quantity);
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_uses_per_code_positive_check" CHECK (uses_per_code IS NULL OR uses_per_code > 0);
ALTER TABLE "voucher_products" ADD CONSTRAINT "voucher_products_multi_use_check" CHECK (is_multi_use = FALSE OR uses_per_code IS NOT NULL);

-- CartItems: quantity must be positive
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_quantity_check" CHECK (quantity > 0);

-- OrderItems: quantity must be positive
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK (quantity > 0);
