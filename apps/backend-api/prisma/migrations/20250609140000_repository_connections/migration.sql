-- Extend github_accounts for multi-account wizard
ALTER TABLE "github_accounts" ADD COLUMN IF NOT EXISTS "connection_name" TEXT;
ALTER TABLE "github_accounts" ADD COLUMN IF NOT EXISTS "auth_type" TEXT NOT NULL DEFAULT 'pat';
ALTER TABLE "github_accounts" ADD COLUMN IF NOT EXISTS "base_url" TEXT;
ALTER TABLE "github_accounts" ADD COLUMN IF NOT EXISTS "sync_frequency" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "github_accounts" ADD COLUMN IF NOT EXISTS "last_error" TEXT;

-- GitLab integration tables
CREATE TABLE IF NOT EXISTS "gitlab_accounts" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'GitLab',
    "connection_name" TEXT,
    "username" TEXT NOT NULL,
    "token_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "auth_type" TEXT NOT NULL DEFAULT 'pat',
    "base_url" TEXT NOT NULL DEFAULT 'https://gitlab.com',
    "sync_frequency" TEXT NOT NULL DEFAULT 'manual',
    "last_error" TEXT,
    "avatar_url" TEXT,
    "created_by_id" TEXT,
    "last_validated_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gitlab_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gitlab_projects" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path_with_namespace" TEXT NOT NULL,
    "description" TEXT,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "web_url" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gitlab_projects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gitlab_projects_account_id_path_with_namespace_key"
  ON "gitlab_projects"("account_id", "path_with_namespace");

ALTER TABLE "gitlab_projects" DROP CONSTRAINT IF EXISTS "gitlab_projects_account_id_fkey";
ALTER TABLE "gitlab_projects" ADD CONSTRAINT "gitlab_projects_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "gitlab_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
