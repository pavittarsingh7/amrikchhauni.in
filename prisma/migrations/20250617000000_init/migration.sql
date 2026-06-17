-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMINISTRATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "PortStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE', 'UNDER_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('LIVE', 'PLANNED', 'BETA', 'UNDER_CONSTRUCTION', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('DATABASE', 'NGINX', 'SSL', 'SETTINGS', 'FULL');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ServiceAction" AS ENUM ('START', 'STOP', 'RESTART');

-- CreateEnum
CREATE TYPE "MaintenanceScope" AS ENUM ('SITE', 'SERVER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "label" TEXT,
    "description" TEXT,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ip_address" TEXT,
    "operating_system" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technologies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "client_id" TEXT,
    "idea_source_id" TEXT,
    "created_by_id" TEXT,
    "technology_id" TEXT,
    "deployment_type_id" TEXT,
    "repository_url" TEXT,
    "branch" TEXT DEFAULT 'main',
    "project_path" TEXT,
    "build_command" TEXT,
    "start_command" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "remarks" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "subdomain" TEXT,
    "ssl_enabled" BOOLEAN NOT NULL DEFAULT false,
    "proxy_pass" TEXT,
    "root_path" TEXT,
    "target_port" INTEGER,
    "nginx_config_path" TEXT,
    "application_id" TEXT,
    "discovered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ports" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "PortStatus" NOT NULL DEFAULT 'AVAILABLE',
    "application_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nginx_configs" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "content" TEXT,
    "domain" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_tested" TIMESTAMP(3),
    "test_passed" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nginx_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nginx_config_backups" (
    "id" TEXT NOT NULL,
    "nginx_config_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nginx_config_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pm2_processes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "port" INTEGER,
    "pid" INTEGER,
    "uptime" TEXT,
    "restarts" INTEGER NOT NULL DEFAULT 0,
    "ecosystem_path" TEXT,
    "application_id" TEXT,
    "discovered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pm2_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iis_sites" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bindings" JSONB,
    "app_pool" TEXT,
    "physical_path" TEXT,
    "state" TEXT,
    "pattern" TEXT,
    "application_id" TEXT,
    "discovered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "iis_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ssl_certificates" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "issuer" TEXT,
    "subject" TEXT,
    "thumbprint" TEXT,
    "serial_number" TEXT,
    "not_before" TIMESTAMP(3),
    "not_after" TIMESTAMP(3),
    "store_path" TEXT,
    "win_acme_id" TEXT,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ssl_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Under Maintenance',
    "description" TEXT,
    "expected_return" TEXT,
    "logo_path" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_configs" (
    "id" TEXT NOT NULL,
    "scope" "MaintenanceScope" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "domain_id" TEXT,
    "application_id" TEXT,
    "include_file_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "windows_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "status" TEXT,
    "start_type" TEXT,
    "whitelisted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "windows_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "type" "BackupType" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'PENDING',
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "size_bytes" BIGINT,
    "scheduled" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_suggestions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "filepath" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "idea_sources_name_key" ON "idea_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "technologies_name_key" ON "technologies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "deployment_types_name_key" ON "deployment_types"("name");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_client_id_idx" ON "applications"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "domains_hostname_key" ON "domains"("hostname");

-- CreateIndex
CREATE INDEX "domains_application_id_idx" ON "domains"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "ports_number_key" ON "ports"("number");

-- CreateIndex
CREATE INDEX "ports_status_idx" ON "ports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "nginx_configs_filename_key" ON "nginx_configs"("filename");

-- CreateIndex
CREATE INDEX "nginx_config_backups_nginx_config_id_idx" ON "nginx_config_backups"("nginx_config_id");

-- CreateIndex
CREATE UNIQUE INDEX "pm2_processes_name_key" ON "pm2_processes"("name");

-- CreateIndex
CREATE INDEX "pm2_processes_application_id_idx" ON "pm2_processes"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "iis_sites_name_key" ON "iis_sites"("name");

-- CreateIndex
CREATE INDEX "iis_sites_application_id_idx" ON "iis_sites"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "ssl_certificates_thumbprint_key" ON "ssl_certificates"("thumbprint");

-- CreateIndex
CREATE INDEX "ssl_certificates_domain_idx" ON "ssl_certificates"("domain");

-- CreateIndex
CREATE INDEX "ssl_certificates_not_after_idx" ON "ssl_certificates"("not_after");

-- CreateIndex
CREATE INDEX "maintenance_configs_domain_id_idx" ON "maintenance_configs"("domain_id");

-- CreateIndex
CREATE INDEX "maintenance_configs_application_id_idx" ON "maintenance_configs"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "windows_services_name_key" ON "windows_services"("name");

-- CreateIndex
CREATE INDEX "backups_type_idx" ON "backups"("type");

-- CreateIndex
CREATE INDEX "backups_status_idx" ON "backups"("status");

-- CreateIndex
CREATE INDEX "discovery_suggestions_status_idx" ON "discovery_suggestions"("status");

-- CreateIndex
CREATE INDEX "discovery_suggestions_type_idx" ON "discovery_suggestions"("type");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "snapshots_entity_idx" ON "snapshots"("entity");

-- CreateIndex
CREATE INDEX "snapshots_entity_id_idx" ON "snapshots"("entity_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_idea_source_id_fkey" FOREIGN KEY ("idea_source_id") REFERENCES "idea_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technologies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_deployment_type_id_fkey" FOREIGN KEY ("deployment_type_id") REFERENCES "deployment_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domains" ADD CONSTRAINT "domains_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ports" ADD CONSTRAINT "ports_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nginx_config_backups" ADD CONSTRAINT "nginx_config_backups_nginx_config_id_fkey" FOREIGN KEY ("nginx_config_id") REFERENCES "nginx_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pm2_processes" ADD CONSTRAINT "pm2_processes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iis_sites" ADD CONSTRAINT "iis_sites_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_configs" ADD CONSTRAINT "maintenance_configs_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_configs" ADD CONSTRAINT "maintenance_configs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
