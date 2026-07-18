-- Add missing columns that exist in Prisma schema but not in original migrations

-- Add permissions column (granular RBAC)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add backup codes column (2FA)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add slug column to Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Create unique index on slug if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

-- Add REFRESH_TOKEN_REUSE_DETECTED to AuditAction enum
-- (Only if it doesn't already exist in the enum)
DO $$
BEGIN
    EXECUTE 'ALTER TYPE "AuditAction" ADD VALUE ''REFRESH_TOKEN_REUSE_DETECTED''';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
END $$;