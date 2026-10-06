import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { getDentistActor, type Actor } from "@/lib/actors";
import { toToothFinding } from "@/lib/serializers";
import type {
  CreateToothFindingRequest,
  ListToothFindingsResponse,
  OdontogramResponse,
  ToothFinding,
  UpdateToothFindingRequest,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listToothFindingsQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listToothFindingsQuerySchema>;

/** Omitting `includeResolved` returns everything; false narrows to active. */
const resolvedFilter = (includeResolved: boolean | undefined) =>
  includeResolved === false ? { resolvedAt: null } : {};

export async function listToothFindings({
  page,
  pageSize,
  patientId,
  toothCode,
  includeResolved,
}: ListArgs): Promise<ListToothFindingsResponse> {
  const where = {
    ...(patientId ? { patientId } : {}),
    ...(toothCode !== undefined ? { toothCode } : {}),
    ...resolvedFilter(includeResolved),
  };

  const [rows, total] = await Promise.all([
    prisma.toothFinding.findMany({
      where,
      orderBy: [{ toothCode: "asc" }, { chartedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.toothFinding.count({ where }),
  ]);

  return { items: rows.map(toToothFinding), total, page, pageSize };
}

/**
 * The whole chart in one payload, unpaginated: a mouth has at most 52 teeth, and
 * the frontend renders every tooth at once.
 */
export async function getOdontogram(
  patientId: string,
  includeResolved: boolean | undefined
): Promise<OdontogramResponse> {
  const rows = await prisma.toothFinding.findMany({
    where: { patientId, ...resolvedFilter(includeResolved) },
    orderBy: [{ toothCode: "asc" }, { chartedAt: "desc" }],
  });

  return { patientId, findings: rows.map(toToothFinding) };
}

export async function getToothFinding(
  id: string
): Promise<ToothFinding | null> {
  const row = await prisma.toothFinding.findUnique({ where: { id } });
  return row ? toToothFinding(row) : null;
}

export async function createToothFinding(
  input: CreateToothFindingRequest,
  chartedBy: Actor
): Promise<ToothFinding> {
  const row = await prisma.toothFinding.create({
    data: {
      clinicId: await currentClinicId(),
      patientId: input.patientId,
      encounterId: input.encounterId ?? null,
      chartedById: chartedBy.id,
      toothCode: input.toothCode,
      finding: input.finding,
      surfaces: input.surfaces ?? [],
      note: input.note ?? null,
      chartedAt: new Date(),
    },
  });

  await recordAudit({
    actor: chartedBy,
    action: "tooth_finding.created",
    entityType: "ToothFinding",
    entityId: row.id,
    metadata: {
      patientId: row.patientId,
      toothCode: row.toothCode,
      finding: row.finding,
    },
  });

  return toToothFinding(row);
}

export async function updateToothFinding(
  id: string,
  input: UpdateToothFindingRequest
): Promise<ToothFinding> {
  const row = await prisma.toothFinding.update({
    where: { id },
    data: {
      finding: input.finding,
      surfaces: input.surfaces,
      note: input.note,
      resolvedAt:
        input.resolvedAt === undefined
          ? undefined
          : input.resolvedAt === null
            ? null
            : new Date(input.resolvedAt),
    },
  });

  await recordAudit({
    actor: await getDentistActor(),
    action: "tooth_finding.updated",
    entityType: "ToothFinding",
    entityId: id,
    metadata: {
      patientId: row.patientId,
      toothCode: row.toothCode,
      fields: Object.keys(input),
      resolved: row.resolvedAt !== null,
    },
  });

  return toToothFinding(row);
}
