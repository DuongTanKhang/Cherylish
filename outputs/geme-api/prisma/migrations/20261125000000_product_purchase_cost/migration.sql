ALTER TABLE "products" ADD COLUMN "purchase_cost" DECIMAL(14,0);
ALTER TABLE "product_price_variants" ADD COLUMN "purchase_cost" DECIMAL(14,0);

WITH latest_product_cost AS (
  SELECT DISTINCT ON (product_id) product_id, unit_cost
  FROM inventory_receipt_items
  WHERE product_id IS NOT NULL AND variant_id IS NULL AND unit_cost IS NOT NULL
  ORDER BY product_id, created_at DESC, id DESC
)
UPDATE products AS product
SET purchase_cost = latest.unit_cost
FROM latest_product_cost AS latest
WHERE product.id = latest.product_id;

WITH latest_variant_cost AS (
  SELECT DISTINCT ON (variant_id) variant_id, unit_cost
  FROM inventory_receipt_items
  WHERE variant_id IS NOT NULL AND unit_cost IS NOT NULL
  ORDER BY variant_id, created_at DESC, id DESC
)
UPDATE product_price_variants AS variant
SET purchase_cost = latest.unit_cost
FROM latest_variant_cost AS latest
WHERE variant.id = latest.variant_id;

UPDATE products
SET price = ROUND(purchase_cost * 2.5)
WHERE purchase_cost IS NOT NULL AND COALESCE(price, 0) <= 0;

UPDATE product_price_variants
SET price = ROUND(purchase_cost * 2.5)
WHERE purchase_cost IS NOT NULL AND price <= 0;
