-- Bring the production schema up to date with the weight-managed inventory
-- fields used by inventory receipts, products, and physical sphere items.
ALTER TYPE "product_kind" ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TABLE "inventory_receipts"
  ADD COLUMN "total_quantity_kg" DECIMAL(14,3) NOT NULL DEFAULT 0;

ALTER TABLE "inventory_receipt_items"
  ADD COLUMN "quantity_kg" DECIMAL(14,3),
  ADD COLUMN "sphere_quality" VARCHAR(60),
  ADD COLUMN "sphere_stone_group_name" VARCHAR(120),
  ADD COLUMN "sphere_stone_type_name" VARCHAR(120),
  ALTER COLUMN "unit_cost" DROP NOT NULL,
  ALTER COLUMN "line_total" DROP NOT NULL;

ALTER TABLE "products"
  ADD COLUMN "sphere_quality" VARCHAR(60),
  ADD COLUMN "sphere_stone_type_id" UUID,
  ADD COLUMN "stock_kg" DECIMAL(14,3) NOT NULL DEFAULT 0;

ALTER TABLE "product_price_variants"
  ADD COLUMN "stock_kg" DECIMAL(14,3) NOT NULL DEFAULT 0;

ALTER TABLE "inventory_issues"
  ADD COLUMN "total_quantity_kg" DECIMAL(14,3) NOT NULL DEFAULT 0;

ALTER TABLE "inventory_issue_items"
  ADD COLUMN "quantity_kg" DECIMAL(14,3),
  ADD COLUMN "sphere_item_id" UUID;

ALTER TABLE "inventory_movements"
  ADD COLUMN "quantity_kg" DECIMAL(14,3),
  ADD COLUMN "sphere_item_id" UUID,
  ADD COLUMN "stock_after_kg" DECIMAL(14,3),
  ADD COLUMN "stock_before_kg" DECIMAL(14,3);

ALTER TABLE "inventory_reservations"
  ADD COLUMN "quantity_kg" DECIMAL(14,3),
  ADD COLUMN "sphere_item_id" UUID;

ALTER TABLE "order_items"
  ADD COLUMN "quantity_kg" DECIMAL(14,3),
  ADD COLUMN "sphere_item_id" UUID;

CREATE TABLE "sphere_stone_groups" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sphere_stone_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sphere_stone_types" (
  "id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sphere_stone_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_sphere_items" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "receipt_id" UUID,
  "label" VARCHAR(120),
  "weight_kg" DECIMAL(14,3) NOT NULL,
  "price" DECIMAL(14,0),
  "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" VARCHAR(24) NOT NULL DEFAULT 'AVAILABLE',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_sphere_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sphere_stone_groups_slug_key" ON "sphere_stone_groups"("slug");
CREATE INDEX "sphere_stone_groups_is_active_sort_order_idx" ON "sphere_stone_groups"("is_active", "sort_order");
CREATE UNIQUE INDEX "sphere_stone_types_group_id_slug_key" ON "sphere_stone_types"("group_id", "slug");
CREATE INDEX "sphere_stone_types_group_id_is_active_sort_order_idx" ON "sphere_stone_types"("group_id", "is_active", "sort_order");
CREATE INDEX "product_sphere_items_product_id_status_sort_order_idx" ON "product_sphere_items"("product_id", "status", "sort_order");
CREATE INDEX "product_sphere_items_receipt_id_idx" ON "product_sphere_items"("receipt_id");
CREATE INDEX "products_sphere_stone_type_id_status_idx" ON "products"("sphere_stone_type_id", "status");
CREATE INDEX "inventory_issue_items_sphere_item_id_created_at_idx" ON "inventory_issue_items"("sphere_item_id", "created_at" DESC);
CREATE INDEX "inventory_movements_sphere_item_id_created_at_idx" ON "inventory_movements"("sphere_item_id", "created_at" DESC);
CREATE INDEX "inventory_reservations_sphere_item_id_status_idx" ON "inventory_reservations"("sphere_item_id", "status");
CREATE INDEX "order_items_sphere_item_id_idx" ON "order_items"("sphere_item_id");

ALTER TABLE "sphere_stone_types"
  ADD CONSTRAINT "sphere_stone_types_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "sphere_stone_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products"
  ADD CONSTRAINT "products_sphere_stone_type_id_fkey"
  FOREIGN KEY ("sphere_stone_type_id") REFERENCES "sphere_stone_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_sphere_items"
  ADD CONSTRAINT "product_sphere_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "product_sphere_items_receipt_id_fkey"
  FOREIGN KEY ("receipt_id") REFERENCES "inventory_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_issue_items"
  ADD CONSTRAINT "inventory_issue_items_sphere_item_id_fkey"
  FOREIGN KEY ("sphere_item_id") REFERENCES "product_sphere_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "inventory_movements_sphere_item_id_fkey"
  FOREIGN KEY ("sphere_item_id") REFERENCES "product_sphere_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_sphere_item_id_fkey"
  FOREIGN KEY ("sphere_item_id") REFERENCES "product_sphere_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_sphere_item_id_fkey"
  FOREIGN KEY ("sphere_item_id") REFERENCES "product_sphere_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
