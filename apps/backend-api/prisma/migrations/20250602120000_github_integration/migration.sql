-- CreateTable
CREATE TABLE "github_accounts" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'GitHub',
    "username" TEXT NOT NULL,
    "token_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "avatar_url" TEXT,
    "created_by_id" TEXT,
    "last_validated_at" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_repositories" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "description" TEXT,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "language" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "html_url" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_branches" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_protected" BOOLEAN NOT NULL DEFAULT false,
    "last_sha" TEXT,
    "last_message" TEXT,

    CONSTRAINT "github_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_commits" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "committed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_pull_requests" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "base_branch" TEXT NOT NULL,
    "head_branch" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_webhooks" (
    "id" TEXT NOT NULL,
    "account_id" TEXT,
    "repo_id" TEXT,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret_ref" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_deployments" (
    "id" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "logs" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "github_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_repositories_account_id_full_name_key" ON "github_repositories"("account_id", "full_name");

-- CreateIndex
CREATE UNIQUE INDEX "github_branches_repo_id_name_key" ON "github_branches"("repo_id", "name");

-- CreateIndex
CREATE INDEX "github_commits_repo_id_branch_idx" ON "github_commits"("repo_id", "branch");

-- CreateIndex
CREATE UNIQUE INDEX "github_pull_requests_repo_id_number_key" ON "github_pull_requests"("repo_id", "number");

-- CreateIndex
CREATE INDEX "github_deployments_repo_id_created_at_idx" ON "github_deployments"("repo_id", "created_at");

-- AddForeignKey
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "github_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_branches" ADD CONSTRAINT "github_branches_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_commits" ADD CONSTRAINT "github_commits_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_pull_requests" ADD CONSTRAINT "github_pull_requests_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_webhooks" ADD CONSTRAINT "github_webhooks_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "github_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_webhooks" ADD CONSTRAINT "github_webhooks_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "github_deployments" ADD CONSTRAINT "github_deployments_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
