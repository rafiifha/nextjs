-- Clear courierId references from Order table before schema change
-- This sets courierId to NULL for all orders that reference the old Courier table
UPDATE "Order" SET "courierId" = NULL WHERE "courierId" IS NOT NULL;

-- Drop the old foreign key constraint if it exists
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_courierId_fkey";

-- Drop the old Courier table
DROP TABLE IF EXISTS "Courier";

-- Add isActive column to User table if not exists
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
