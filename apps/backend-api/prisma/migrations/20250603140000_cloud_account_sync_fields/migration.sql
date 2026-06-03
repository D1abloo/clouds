-- AlterTable
ALTER TABLE "cloud_accounts" ADD COLUMN IF NOT EXISTS "default_region" TEXT;
ALTER TABLE "cloud_accounts" ADD COLUMN IF NOT EXISTS "config" JSONB;
ALTER TABLE "cloud_accounts" ADD COLUMN IF NOT EXISTS "sync_status" TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE "cloud_accounts" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMP(3);
