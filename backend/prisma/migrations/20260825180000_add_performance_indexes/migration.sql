-- Add performance indexes to support common query patterns
-- Orders table (mapped from model `Order` -> table "orders")
CREATE INDEX IF NOT EXISTS idx_orders_customer_createdat ON orders (customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_createdat ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_paidat ON orders (status, paid_at);

-- Voucher products (model `VoucherProduct` -> table "voucher_products")
CREATE INDEX IF NOT EXISTS idx_voucherpartner_createdat ON voucher_products (partner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_voucherpartner_status ON voucher_products (partner_id, status);
CREATE INDEX IF NOT EXISTS idx_voucher_status_createdat ON voucher_products (status, created_at);

-- Payment transactions (model `PaymentTransaction` -> table "payment_transactions")
CREATE INDEX IF NOT EXISTS idx_paymenttransaction_order_status_paidat ON payment_transactions (order_id, status, paid_at);

-- Issued voucher codes (model `IssuedVoucherCode` -> table "issued_voucher_codes")
CREATE INDEX IF NOT EXISTS idx_issuedvouchercode_voucher_status ON issued_voucher_codes (voucher_product_id, status);

-- Users table
CREATE INDEX IF NOT EXISTS idx_user_createdat ON users (created_at);
