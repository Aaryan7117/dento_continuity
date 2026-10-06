import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { getFrontDeskActor } from "@/lib/actors";

export const addToWaitlistSchema = z.object({
  patientId: z.uuid(),
  /** Comma-separated weekday names, or omitted for any day. */
  preferredDays: z.string().trim().max(80).optional(),
  preferredTime: z.enum(["morning", "afternoon", "any"]).default("any"),
  procedureType: z.string().trim().max(80).optional(),
  estimatedMins: z.number().int().min(5).max(480).optional(),
  note: z.string().trim().max(300).optional(),
});

export type AddToWaitlistInput = z.output<typeof addToWaitlistSchema>;

/** One open entry per patient: a second request would just rank them twice. */
export async function addToWaitlist(
  input: AddToWaitlistInput
): Promise<
  | { ok: true; entryId: string }
  | { ok: false; reason: "patientNotFound" | "alreadyWaiting" }
> {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: { id: true },
  });
  if (!patient) return { ok: false, reason: "patientNotFound" };

  const open = await prisma.waitlistEntry.findFirst({
    where: { patientId: input.patientId, filledAt: null },
    select: { id: true },
  });
  if (open) return { ok: false, reason: "alreadyWaiting" };

  const entry = await prisma.waitlistEntry.create({
    data: {
      clinicId: await currentClinicId(),
      patientId: input.patientId,
      preferredDays: input.preferredDays || null,
      preferredTime: input.preferredTime,
      procedureType: input.procedureType || null,
      estimatedMins: input.estimatedMins ?? null,
      note: input.note || null,
    },
  });

  await recordAudit({
    actor: await getFrontDeskActor(),
    action: "waitlist.added",
    entityType: "WaitlistEntry",
    entityId: entry.id,
    metadata: { patientId: input.patientId, preferredTime: input.preferredTime },
  });

  return { ok: true, entryId: entry.id };
}
