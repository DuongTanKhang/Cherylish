-- Remove only the persistence objects owned exclusively by AI Studio.
DROP TABLE IF EXISTS "ai_sales_metrics";
DROP TABLE IF EXISTS "ai_marketing_drafts";
DROP TABLE IF EXISTS "ai_sales_knowledge_sources";
DROP TABLE IF EXISTS "ai_product_drafts";
DROP TABLE IF EXISTS "ai_product_draft_batches";
DROP TABLE IF EXISTS "ai_image_items";
DROP TABLE IF EXISTS "ai_image_batches";
DROP TABLE IF EXISTS "ai_approvals";
DROP TABLE IF EXISTS "ai_tasks";

-- Remove the AI provenance field from the shared product-media join table.
ALTER TABLE IF EXISTS "product_media_assets"
  DROP COLUMN IF EXISTS "source_ai_image_item_id";

DROP TYPE IF EXISTS "ai_marketing_draft_status";
DROP TYPE IF EXISTS "ai_sales_knowledge_status";
DROP TYPE IF EXISTS "ai_product_draft_status";
DROP TYPE IF EXISTS "ai_product_draft_batch_status";
DROP TYPE IF EXISTS "ai_image_qc_status";
DROP TYPE IF EXISTS "ai_image_item_status";
DROP TYPE IF EXISTS "ai_image_batch_status";
DROP TYPE IF EXISTS "ai_image_purpose";
DROP TYPE IF EXISTS "ai_image_preset";
DROP TYPE IF EXISTS "ai_approval_status";
DROP TYPE IF EXISTS "ai_task_status";
DROP TYPE IF EXISTS "ai_task_type";
