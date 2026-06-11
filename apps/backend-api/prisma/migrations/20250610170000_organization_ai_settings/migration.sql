-- CreateEnum
CREATE TYPE "CopilotAiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'OPENROUTER');

-- CreateEnum
CREATE TYPE "CopilotScopeMode" AS ENUM ('PANEL_ONLY');

-- CreateEnum
CREATE TYPE "CopilotTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "organization_ai_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" "CopilotAiProvider" NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "api_key_secret_ref" TEXT,
    "api_key_hint" TEXT,
    "scope_mode" "CopilotScopeMode" NOT NULL DEFAULT 'PANEL_ONLY',
    "allow_autonomous" BOOLEAN NOT NULL DEFAULT false,
    "allow_launch" BOOLEAN NOT NULL DEFAULT false,
    "max_tokens" INTEGER NOT NULL DEFAULT 2048,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "system_prompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copilot_autonomous_tasks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "CopilotTaskStatus" NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copilot_autonomous_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_ai_settings_organization_id_key" ON "organization_ai_settings"("organization_id");

-- CreateIndex
CREATE INDEX "copilot_autonomous_tasks_organization_id_created_at_idx" ON "copilot_autonomous_tasks"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "copilot_autonomous_tasks_user_id_created_at_idx" ON "copilot_autonomous_tasks"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "organization_ai_settings" ADD CONSTRAINT "organization_ai_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
