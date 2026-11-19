ALTER TABLE "admin_users"
  ADD COLUMN IF NOT EXISTS "username" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "job_title" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "auth_version" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_username_key"
  ON "admin_users"("username");
