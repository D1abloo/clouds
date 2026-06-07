-- PRO mode tables: OAuth, sessions, API tokens, runbooks, ops, security, assistant

CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "access_token_ref" TEXT,
  "refresh_token_ref" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");
CREATE INDEX IF NOT EXISTS "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "scopes" JSONB NOT NULL DEFAULT '[]',
  "last_used_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "api_tokens_user_id_idx" ON "api_tokens"("user_id");

CREATE TABLE IF NOT EXISTS "runbooks" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "steps" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "runbooks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "runbook_executions" (
  "id" TEXT NOT NULL,
  "runbook_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "started_by" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "runbook_executions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "runbook_executions_runbook_id_fkey" FOREIGN KEY ("runbook_id") REFERENCES "runbooks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "runbook_executions_runbook_id_started_at_idx" ON "runbook_executions"("runbook_id", "started_at");

CREATE TABLE IF NOT EXISTS "schedules" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cron" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "approvals" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "requested_by" TEXT,
  "resource" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "approvals_status_created_at_idx" ON "approvals"("status", "created_at");

CREATE TABLE IF NOT EXISTS "secrets" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "secret_ref" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'platform',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "compliance_policies" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "framework" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "rules" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "compliance_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "change_requests" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "requested_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "change_requests_status_idx" ON "change_requests"("status");

CREATE TABLE IF NOT EXISTS "reports" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "incidents" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "assigned_to" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "incidents_status_severity_idx" ON "incidents"("status", "severity");

CREATE TABLE IF NOT EXISTS "backups" (
  "id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "size_bytes" BIGINT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "backups_resource_type_resource_id_idx" ON "backups"("resource_type", "resource_id");

CREATE TABLE IF NOT EXISTS "storage_volumes" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" "CloudProvider",
  "size_gb" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "storage_volumes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "network_resources" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cidr" TEXT,
  "provider" "CloudProvider",
  "region" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "network_resources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cost_optimization_recommendations" (
  "id" TEXT NOT NULL,
  "resource_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "savings_usd" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cost_optimization_recommendations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cost_optimization_recommendations_status_idx" ON "cost_optimization_recommendations"("status");

CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_key" ON "settings"("key");

CREATE TABLE IF NOT EXISTS "assistant_threads" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assistant_threads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "assistant_threads_user_id_idx" ON "assistant_threads"("user_id");

CREATE TABLE IF NOT EXISTS "assistant_messages" (
  "id" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assistant_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assistant_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "assistant_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "assistant_messages_thread_id_created_at_idx" ON "assistant_messages"("thread_id", "created_at");

CREATE TABLE IF NOT EXISTS "admin_webhooks" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "events" JSONB NOT NULL DEFAULT '[]',
  "secret_ref" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_webhooks_pkey" PRIMARY KEY ("id")
);
