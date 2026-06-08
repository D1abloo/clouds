-- Notification section + read timestamp for PRO panel badges
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "section" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(3);

UPDATE "notifications" SET "read_at" = "created_at" WHERE "is_read" = true AND "read_at" IS NULL;
