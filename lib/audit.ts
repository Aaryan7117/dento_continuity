/**
 * The one place an audit event is written.
 *
 * CLAUDE.md scopes this to a simple append-only log — actor, action, entity,
 * timestamp — not a cryptographic chain. There is no update or delete path, and
 * nothing else in the codebase should call `prisma.auditEvent.create` directly.
 */

import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import type { Actor } from "@/lib/actors";
import type { AuditEvent, AuditEventWithActor, Role } from "@/lib/contract";
import type { z } from "zod/v4";
import type { listAuditEventsQuerySchema } from "@/lib/validation";

/**
 * `entity.verb`, past tense. Kept as a union rather than a free string so a typo
 * fails the build instead of quietly creating a second spelling of an action
 * that the log is later queried by.
 */
export type AuditAction =
  | "patient.created"
  | "patient.updated"
  | "patient.consent_granted"
  | "patient.consent_withdrawn"
  | "appointment.created"
  | "appointment.updated"
  | "appointment.rescheduled"
  | "appointment.confirmed"
  | "appointment.checked_in"
  | "appointment.in_chair"
  | "appointment.completed"
  | "appointment.rebooked_by_patient"
  | "patient_link.issued"
  | "clinic.updated"
  | "chair.created"
  | "chair.updated"
  | "appointment.cancelled"
  | "appointment.no_show"
  | "encounter.created"
  | "encounter.updated"
  | "note.created"
  | "note.updated"
  | "note.signed"
  | "tooth_finding.created"
  | "tooth_finding.updated"
  | "image.uploaded"
  | "image.updated"
  | "treatment_plan.created"
  | "treatment_plan.updated"
  | "treatment_plan.accepted"
  | "treatment_plan.completed"
  | "treatment_plan.billing_updated"
  | "recall.created"
  | "recall.updated"
  | "recall.completed"
  | "recommendation.generated"
  | "recommendation.approved"
  | "recommendation.dismissed"
  | "waitlist.added"
  | "user.signed_in"
  | "user.signed_out"
  | "clinic.created"
  | "user.created";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface RecordAuditInput {
  actor: Actor;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  /** Small facts worth keeping, e.g. the before/after of a status change. */
  metadata?: Record<string, JsonValue>;
}

/**
 * Never throws. A failed audit write must not roll back the clinical change it
 * describes — losing the note is worse than losing the log line, and for this
 * demo an unwritable audit table should not take the golden path down.
 */
export async function recordAudit({
  actor,
  action,
  entityType,
  entityId,
  metadata,
}: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
      clinicId: await currentClinicId(),
        actorId: actor.id,
        actorRole: actor.role,
        action,
        entityType,
        entityId,
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error(`Audit write failed for ${action}`, error);
  }
}

// ---------------------------------------------------------------------------
// Read side — no UI yet, but the log is queryable so events can be confirmed.
// ---------------------------------------------------------------------------

type ListArgs = z.output<typeof listAuditEventsQuerySchema>;

export async function listAuditEvents({
  page,
  pageSize,
  entityType,
  entityId,
  actorId,
  from,
  to,
}: ListArgs) {
  const createdAt =
    from || to
      ? {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      : undefined;

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actorId ? { actorId } : {}),
    ...(createdAt ? { createdAt } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  const items: AuditEventWithActor[] = rows.map((e) => ({
    ...toAuditEvent(e),
    actor: e.actor
      ? { id: e.actor.id, name: e.actor.name, role: e.actor.role }
      : null,
  }));

  return { items, total, page, pageSize };
}

function toAuditEvent(e: {
  id: string;
  actorId: string | null;
  actorRole: Role | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
}): AuditEvent {
  return {
    id: e.id,
    actorId: e.actorId,
    actorRole: e.actorRole,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    metadata: (e.metadata as Record<string, unknown> | null) ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}
