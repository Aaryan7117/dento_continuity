import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { getDentistActor } from "@/lib/actors";
import { toEncounter } from "@/lib/serializers";
import { getEncounterDetail } from "@/lib/queries";
import type {
  CreateEncounterRequest,
  Encounter,
  EncounterDetail,
  ListEncountersResponse,
  UpdateEncounterRequest,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listEncountersQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listEncountersQuerySchema>;

export async function listEncounters({
  page,
  pageSize,
  patientId,
}: ListArgs): Promise<ListEncountersResponse> {
  const where = patientId ? { patientId } : {};

  const [rows, total] = await Promise.all([
    prisma.encounter.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.encounter.count({ where }),
  ]);

  return { items: rows.map(toEncounter), total, page, pageSize };
}

export function getEncounter(id: string): Promise<EncounterDetail | null> {
  return getEncounterDetail(id);
}

export async function createEncounter(
  input: CreateEncounterRequest
): Promise<Encounter> {
  const row = await prisma.encounter.create({
    data: {
      clinicId: await currentClinicId(),
      patientId: input.patientId,
      appointmentId: input.appointmentId ?? null,
      providerId: input.providerId ?? null,
      occurredAt: new Date(input.occurredAt),
      summary: input.summary ?? null,
    },
  });

  await recordAudit({
    actor: await getDentistActor(),
    action: "encounter.created",
    entityType: "Encounter",
    entityId: row.id,
    metadata: {
      patientId: row.patientId,
      occurredAt: row.occurredAt.toISOString(),
      ...(row.appointmentId ? { appointmentId: row.appointmentId } : {}),
    },
  });

  return toEncounter(row);
}

export async function updateEncounter(
  id: string,
  input: UpdateEncounterRequest
): Promise<Encounter> {
  const row = await prisma.encounter.update({
    where: { id },
    data: {
      appointmentId: input.appointmentId,
      providerId: input.providerId,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      summary: input.summary,
    },
  });

  await recordAudit({
    actor: await getDentistActor(),
    action: "encounter.updated",
    entityType: "Encounter",
    entityId: id,
    metadata: { patientId: row.patientId, fields: Object.keys(input) },
  });

  return toEncounter(row);
}
