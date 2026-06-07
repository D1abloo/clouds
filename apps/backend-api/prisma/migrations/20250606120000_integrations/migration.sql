-- Integration configs and delivery log for Slack, PagerDuty, Jira, etc.

CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "config" JSONB NOT NULL DEFAULT '{}',
    "events" JSONB NOT NULL DEFAULT '[]',
    "last_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_deliveries" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "http_status" INTEGER,
    "latency_ms" INTEGER,
    "error" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_deliveries_integration_id_created_at_idx" ON "integration_deliveries"("integration_id", "created_at");

ALTER TABLE "integration_deliveries" ADD CONSTRAINT "integration_deliveries_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integration_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
