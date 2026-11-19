ALTER TYPE "admin_role" ADD VALUE 'STAFF';

ALTER TYPE "order_status" ADD VALUE 'PENDING_PAYMENT';

ALTER TABLE "categories"
  ADD COLUMN     "jewelry_stone_group_id" UUID;

ALTER TABLE "inventory_receipt_items"
  ADD COLUMN     "shape" VARCHAR(20);

ALTER TABLE "inventory_receipts"
  ADD COLUMN     "request_fingerprint" VARCHAR(64);

ALTER TABLE "material_options"
  ADD COLUMN     "jewelry_stone_group_id" UUID;

ALTER TABLE "media_assets"
  ADD COLUMN     "bucket_name" VARCHAR(128);

ALTER TABLE "order_items"
  ADD COLUMN     "shape" VARCHAR(20);

ALTER TABLE "orders"
  ADD COLUMN     "buyer_type_at_checkout" VARCHAR(20),
  ADD COLUMN     "idempotency_key" VARCHAR(128),
  ADD COLUMN     "idempotency_request_hash" VARCHAR(64),
  ADD COLUMN     "qr_payment_expires_at" TIMESTAMPTZ(3),
  ADD COLUMN     "qr_payment_started_at" TIMESTAMPTZ(3),
  ADD COLUMN     "sales_channel" VARCHAR(40) NOT NULL DEFAULT 'WEBSITE',
  ADD COLUMN     "sales_channel_buyer_ref" VARCHAR(160),
  ADD COLUMN     "shipping_latitude" DOUBLE PRECISION,
  ADD COLUMN     "shipping_longitude" DOUBLE PRECISION;

ALTER TABLE "product_price_variants"
  ADD COLUMN     "shape" VARCHAR(20);

ALTER TABLE "products"
  ADD COLUMN     "first_published_at" TIMESTAMPTZ(3),
  ADD COLUMN     "is_premium_gemstone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "jewelry_stone_group_id" UUID,
  ADD COLUMN     "new_until" TIMESTAMPTZ(3),
  ADD COLUMN     "publication_history_known" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "jewelry_stone_groups" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "pinned_order" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "jewelry_stone_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sepay_webhook_events" (
    "id" UUID NOT NULL,
    "transaction_id" VARCHAR(80) NOT NULL,
    "gateway" VARCHAR(80),
    "account_number" VARCHAR(40),
    "sub_account" VARCHAR(80),
    "payment_code" VARCHAR(120),
    "transfer_type" VARCHAR(12) NOT NULL,
    "amount" DECIMAL(14,0) NOT NULL,
    "transaction_date" TIMESTAMPTZ(3),
    "reference_code" VARCHAR(160),
    "content" TEXT,
    "raw_payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    "order_id" UUID,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" VARCHAR(1000),
    "processed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sepay_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_email_outbox" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "event_type" VARCHAR(40) NOT NULL DEFAULT 'ORDER_CONFIRMATION',
    "idempotency_key" VARCHAR(180) NOT NULL,
    "recipient" VARCHAR(320) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ(3),
    "last_error" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "order_email_outbox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_object_cleanups" (
    "id" UUID NOT NULL,
    "storage_provider" VARCHAR(24) NOT NULL DEFAULT 'r2',
    "bucket_name" VARCHAR(128) NOT NULL,
    "object_key" VARCHAR(700) NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "url_candidates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_object_cleanups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_notifications" (
    "id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" VARCHAR(40),
    "entity_id" VARCHAR(80),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_notification_reads" (
    "notification_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notification_reads_pkey" PRIMARY KEY ("notification_id","admin_id")
);

CREATE UNIQUE INDEX "jewelry_stone_groups_slug_key" ON "jewelry_stone_groups"("slug");

CREATE INDEX "jewelry_stone_groups_active_pinned_order_sort_order_idx" ON "jewelry_stone_groups"("active", "pinned_order", "sort_order");

CREATE UNIQUE INDEX "sepay_webhook_events_transaction_id_key" ON "sepay_webhook_events"("transaction_id");

CREATE INDEX "sepay_webhook_events_status_next_attempt_at_created_at_idx" ON "sepay_webhook_events"("status", "next_attempt_at", "created_at");

CREATE INDEX "sepay_webhook_events_order_id_created_at_idx" ON "sepay_webhook_events"("order_id", "created_at" DESC);

CREATE UNIQUE INDEX "order_email_outbox_idempotency_key_key" ON "order_email_outbox"("idempotency_key");

CREATE INDEX "order_email_outbox_status_next_attempt_at_idx" ON "order_email_outbox"("status", "next_attempt_at");

CREATE UNIQUE INDEX "order_email_outbox_order_id_event_type_key" ON "order_email_outbox"("order_id", "event_type");

CREATE INDEX "media_object_cleanups_next_attempt_at_created_at_idx" ON "media_object_cleanups"("next_attempt_at", "created_at");

CREATE UNIQUE INDEX "media_object_cleanups_storage_provider_bucket_name_object_k_key" ON "media_object_cleanups"("storage_provider", "bucket_name", "object_key", "is_private");

CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications"("created_at" DESC);

CREATE INDEX "admin_notifications_entity_type_entity_id_created_at_idx" ON "admin_notifications"("entity_type", "entity_id", "created_at" DESC);

CREATE INDEX "admin_notification_reads_admin_id_read_at_idx" ON "admin_notification_reads"("admin_id", "read_at");

CREATE INDEX "inventory_receipts_request_fingerprint_created_at_idx" ON "inventory_receipts"("request_fingerprint", "created_at" DESC);

CREATE INDEX "media_assets_storage_provider_bucket_name_object_key_is_pri_idx" ON "media_assets"("storage_provider", "bucket_name", "object_key", "is_private");

CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

CREATE INDEX "orders_sales_channel_placed_at_idx" ON "orders"("sales_channel", "placed_at" DESC);

CREATE INDEX "orders_inventory_reserved_at_inventory_committed_at_invento_idx" ON "orders"("inventory_reserved_at", "inventory_committed_at", "inventory_released_at");

CREATE INDEX "products_kind_status_first_published_at_id_idx" ON "products"("kind", "status", "first_published_at" DESC, "id");

CREATE INDEX "products_kind_status_is_new_new_until_first_published_at_idx" ON "products"("kind", "status", "is_new", "new_until", "first_published_at" DESC);

CREATE INDEX "products_jewelry_stone_group_id_status_first_published_at_idx" ON "products"("jewelry_stone_group_id", "status", "first_published_at" DESC);
