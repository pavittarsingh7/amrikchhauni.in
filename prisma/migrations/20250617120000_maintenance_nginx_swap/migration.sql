-- Add maintenance config fields for nginx swap/rollback
ALTER TABLE "maintenance_configs" ADD COLUMN IF NOT EXISTS "nginx_config_id" TEXT;
ALTER TABLE "maintenance_configs" ADD COLUMN IF NOT EXISTS "original_content" TEXT;

CREATE INDEX IF NOT EXISTS "maintenance_configs_nginx_config_id_idx" ON "maintenance_configs"("nginx_config_id");
