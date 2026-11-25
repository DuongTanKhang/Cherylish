ALTER TABLE "orders"
  ADD COLUMN "loyverse_order_sync_status" VARCHAR(20),
  ADD COLUMN "loyverse_order_sync_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loyverse_order_sync_next_attempt_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_order_synced_at" TIMESTAMPTZ(3),
  ADD COLUMN "loyverse_receipt_number" VARCHAR(40),
  ADD COLUMN "loyverse_order_sync_error" TEXT;

CREATE INDEX "orders_loyverse_order_sync_status_next_attempt_idx"
  ON "orders"("loyverse_order_sync_status", "loyverse_order_sync_next_attempt_at");
