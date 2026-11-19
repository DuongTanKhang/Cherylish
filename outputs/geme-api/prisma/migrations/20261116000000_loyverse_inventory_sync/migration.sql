ALTER TABLE "products"
  ADD COLUMN "loyverse_price_sync_status" VARCHAR(20),
  ADD COLUMN "loyverse_price_sync_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyverse_price_sync_next_attempt_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_price_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_price_sync_error" TEXT,
  ADD COLUMN "loyverse_stock_sync_status" VARCHAR(20),
  ADD COLUMN "loyverse_stock_sync_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyverse_stock_sync_next_attempt_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_stock_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_stock_sync_error" TEXT;

CREATE INDEX "products_loyverse_price_sync_status_loyverse_price_sync_next_attempt_at_idx"
  ON "products"("loyverse_price_sync_status", "loyverse_price_sync_next_attempt_at");
CREATE INDEX "products_loyverse_stock_sync_status_loyverse_stock_sync_next_attempt_at_idx"
  ON "products"("loyverse_stock_sync_status", "loyverse_stock_sync_next_attempt_at");

ALTER TABLE "inventory_receipts"
  ADD COLUMN "loyverse_sync_status" VARCHAR(20),
  ADD COLUMN "loyverse_sync_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyverse_sync_next_attempt_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_sync_error" TEXT;

CREATE INDEX "inventory_receipts_loyverse_sync_status_loyverse_sync_next_attempt_at_idx"
  ON "inventory_receipts"("loyverse_sync_status", "loyverse_sync_next_attempt_at");
