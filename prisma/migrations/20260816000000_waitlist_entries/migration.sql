-- Historical: this table was created with `prisma db push` on 2026-08-16 before
-- migration bookkeeping existed. Recorded here so shadow-database replays match
-- the live schema. Marked as applied; never run against the live database.
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "preferredDays" TEXT,
    "preferredTime" TEXT,
    "procedureType" TEXT,
    "estimatedMins" INTEGER,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "waitlist_entries_filledAt_idx" ON "waitlist_entries"("filledAt");
CREATE INDEX "waitlist_entries_patientId_idx" ON "waitlist_entries"("patientId");

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
