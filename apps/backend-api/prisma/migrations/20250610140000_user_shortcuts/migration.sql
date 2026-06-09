-- CreateTable
CREATE TABLE "user_shortcuts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "route" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "section" TEXT,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "user_shortcuts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_shortcuts_user_id_route_key" ON "user_shortcuts"("user_id", "route");

-- CreateIndex
CREATE INDEX "user_shortcuts_user_id_position_idx" ON "user_shortcuts"("user_id", "position");

-- AddForeignKey
ALTER TABLE "user_shortcuts" ADD CONSTRAINT "user_shortcuts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
