-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "AppointmentStatus" ADD VALUE 'IN_CHAIR';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "inChairAt" TIMESTAMP(3),
ADD COLUMN     "noShowReason" TEXT,
ADD COLUMN     "walkIn" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "defaultVisitMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "slotMinutes" INTEGER NOT NULL DEFAULT 15;
