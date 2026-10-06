-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'OWNER';

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chairs" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chairs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "chairId" UUID,
ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "encounters" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "images" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "recalls" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "recommendations" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "tooth_findings" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "treatment_plans" ADD COLUMN     "clinicId" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clinicId" UUID,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "waitlist_entries" ADD COLUMN     "clinicId" UUID;

-- Backfill: every existing row belongs to the original demo clinic.
INSERT INTO "clinics" ("id","name","slug","timezone","createdAt","updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001','DENTO Demo Clinic','demo','Asia/Kolkata',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
UPDATE "users" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "patients" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "appointments" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "encounters" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "notes" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "tooth_findings" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "images" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "treatment_plans" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "recalls" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "recommendations" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "messages" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "audit_events" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
UPDATE "waitlist_entries" SET "clinicId" = '00000000-0000-4000-8000-000000000001' WHERE "clinicId" IS NULL;
ALTER TABLE "users" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "patients" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "appointments" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "encounters" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "notes" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "tooth_findings" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "images" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "treatment_plans" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "recalls" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "recommendations" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "messages" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "audit_events" ALTER COLUMN "clinicId" SET NOT NULL;
ALTER TABLE "waitlist_entries" ALTER COLUMN "clinicId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "chairs_clinicId_name_key" ON "chairs"("clinicId", "name");

-- CreateIndex
CREATE INDEX "appointments_clinicId_idx" ON "appointments"("clinicId");

-- CreateIndex
CREATE INDEX "audit_events_clinicId_idx" ON "audit_events"("clinicId");

-- CreateIndex
CREATE INDEX "encounters_clinicId_idx" ON "encounters"("clinicId");

-- CreateIndex
CREATE INDEX "images_clinicId_idx" ON "images"("clinicId");

-- CreateIndex
CREATE INDEX "messages_clinicId_idx" ON "messages"("clinicId");

-- CreateIndex
CREATE INDEX "notes_clinicId_idx" ON "notes"("clinicId");

-- CreateIndex
CREATE INDEX "patients_clinicId_idx" ON "patients"("clinicId");

-- CreateIndex
CREATE INDEX "recalls_clinicId_idx" ON "recalls"("clinicId");

-- CreateIndex
CREATE INDEX "recommendations_clinicId_idx" ON "recommendations"("clinicId");

-- CreateIndex
CREATE INDEX "tooth_findings_clinicId_idx" ON "tooth_findings"("clinicId");

-- CreateIndex
CREATE INDEX "treatment_plans_clinicId_idx" ON "treatment_plans"("clinicId");

-- CreateIndex
CREATE INDEX "waitlist_entries_clinicId_idx" ON "waitlist_entries"("clinicId");

-- AddForeignKey
ALTER TABLE "chairs" ADD CONSTRAINT "chairs_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_chairId_fkey" FOREIGN KEY ("chairId") REFERENCES "chairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tooth_findings" ADD CONSTRAINT "tooth_findings_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

