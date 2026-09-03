-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeploymentTrigger" AS ENUM ('MANUAL');

-- CreateTable
CREATE TABLE "git_repository_statuses" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "branch" TEXT,
    "local_commit" TEXT,
    "remote_commit" TEXT,
    "ahead" INTEGER NOT NULL DEFAULT 0,
    "behind" INTEGER NOT NULL DEFAULT 0,
    "dirty" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "last_fetched_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "git_repository_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "application_id" TEXT,
    "application_name" TEXT NOT NULL,
    "server_id" TEXT,
    "server_name" TEXT,
    "triggered_by_id" TEXT,
    "triggered_by_username" TEXT,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" "DeploymentTrigger" NOT NULL DEFAULT 'MANUAL',
    "branch" TEXT,
    "commit_before" TEXT,
    "commit_after" TEXT,
    "runtime" TEXT,
    "current_stage" TEXT,
    "failed_stage" TEXT,
    "exit_code" INTEGER,
    "error" TEXT,
    "log" TEXT NOT NULL DEFAULT '',
    "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "git_repository_statuses_application_id_key" ON "git_repository_statuses"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_sequence_key" ON "deployments"("sequence");

-- CreateIndex
CREATE INDEX "deployments_application_id_idx" ON "deployments"("application_id");

-- CreateIndex
CREATE INDEX "deployments_server_id_idx" ON "deployments"("server_id");

-- CreateIndex
CREATE INDEX "deployments_status_idx" ON "deployments"("status");

-- CreateIndex
CREATE INDEX "deployments_created_at_idx" ON "deployments"("created_at");

-- CreateIndex
CREATE INDEX "deployments_triggered_by_id_idx" ON "deployments"("triggered_by_id");

-- CreateIndex
CREATE INDEX "deployments_branch_idx" ON "deployments"("branch");

-- AddForeignKey
ALTER TABLE "git_repository_statuses" ADD CONSTRAINT "git_repository_statuses_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
