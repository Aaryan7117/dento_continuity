import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getFrontDeskActor } from "@/lib/actors";
import { toRecall, toRecallWithPatient } from "@/lib/serializers";
import type {
  CreateRecallRequest,
  ListRecallsResponse,
  Recall,
  UpdateRecallRequest,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listRecallsQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listRecallsQuerySchema>;

/**
 * Backs the "due soon" worklist, so it defaults to outstanding recalls only and
 * sorts by urgency. Completed ones are opt-in via `includeCompleted`.
 */
export async function listRecalls({
  page,
  pageSize,
  patientId,
  dueBefore,
  includeCompleted,
}: ListArgs): Promise<ListRecallsResponse> {
  const where = {
    ...(patientId ? { patientId } : {}),
    ...(dueBefore ? { dueAt: { lte: new Date(dueBefore) } } : {}),
    ...(includeCompleted ? {} : { completedAt: null }),
  };

  const [rows, total] = await Promise.all([
    prisma.recall.findMany({
      where,
      include: { patient: true },
      orderBy: { dueAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recall.count({ where }),
  ]);

  return { items: rows.map(toRecallWithPatient), total, page, pageSize };
}

export async function getRecall(id: string): Promise<Recall | null> {
  const row = await prisma.recall.findUnique({ where: { id } });
  return row ? toRecall(row) : null;
}

export async function createRecall(
  input: CreateRecallRequest
): Promise<Recall> {
  const row = await prisma.recall.create({
    data: {
      patientId: input.patientId,
      treatmentPlanId: input.treatmentPlanId ?? null,
      dueAt: new Date(input.dueAt),
      reason: input.reason ?? null,
    },
  });

  await recordAudit({
    actor: await getFrontDeskActor(),
    action: "recall.created",
    entityType: "Recall",
    entityId: row.id,
    metadata: { patientId: row.patientId, dueAt: row.dueAt.toISOString() },
  });

  return toRecall(row);
}

export async function updateRecall(
  id: string,
  input: UpdateRecallRequest
): Promise<Recall | null> {
  const existing = await prisma.recall.findUnique({ where: { id } });
  if (!existing) return null;

  const completedAt =
    input.completedAt === undefined
      ? undefined
      : input.completedAt === null
        ? null
        : new Date(input.completedAt);

  const row = await prisma.recall.update({
    where: { id },
    data: {
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      reason: input.reason,
      completedAt,
    },
  });

  const justCompleted = existing.completedAt === null && row.completedAt !== null;

  await recordAudit({
    actor: await getFrontDeskActor(),
    action: justCompleted ? "recall.completed" : "recall.updated",
    entityType: "Recall",
    entityId: id,
    metadata: { patientId: row.patientId },
  });

  return toRecall(row);
}
