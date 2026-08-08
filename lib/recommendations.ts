/**
 * Recommendation read side, plus the two human decisions: approve or dismiss.
 *
 * Generation lives in `lib/retention-agent.ts`. This file is what a person does
 * with the result — the approval gate CLAUDE.md requires between the agent and
 * anything leaving the building.
 */

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getFrontDeskActor } from "@/lib/actors";
import {
  toMessage,
  toRecommendation,
  toRecommendationWithContext,
} from "@/lib/serializers";
import type {
  ApproveRecommendationResponse,
  GetPendingRecommendationsResponse,
  ListRecommendationsResponse,
  MessageChannel,
  Recommendation,
  RecommendationWithContext,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listRecommendationsQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listRecommendationsQuerySchema>;

const withContext = {
  patient: true,
  appointment: true,
  approvedBy: true,
} as const;

export async function listRecommendations({
  page,
  pageSize,
  patientId,
  status,
}: ListArgs): Promise<ListRecommendationsResponse> {
  const where = {
    ...(patientId ? { patientId } : {}),
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.recommendation.findMany({
      where,
      include: withContext,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recommendation.count({ where }),
  ]);

  return {
    items: rows.map(toRecommendationWithContext),
    total,
    page,
    pageSize,
  };
}

export async function getRecommendation(
  id: string
): Promise<RecommendationWithContext | null> {
  const row = await prisma.recommendation.findUnique({
    where: { id },
    include: withContext,
  });
  return row ? toRecommendationWithContext(row) : null;
}

/**
 * The front desk's approval queue. Unpaginated on purpose — it is a worklist
 * someone empties, and the demo opens on it.
 */
export async function listPendingRecommendations(): Promise<GetPendingRecommendationsResponse> {
  const rows = await prisma.recommendation.findMany({
    where: { status: "PENDING" },
    include: withContext,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRecommendationWithContext);
}

export type ApprovalFailure =
  | { reason: "notFound" }
  | { reason: "alreadyProcessed"; status: Recommendation["status"] }
  | { reason: "noApprover" };

interface ApproveInput {
  editedMessage?: string;
  channel?: MessageChannel;
}

/**
 * Approving is the only path to SENT — the agent cannot reach it alone.
 *
 * Sending is mocked: the outbound Message row *is* the send. It is written in
 * the same transaction as the status change so the communications log can never
 * disagree with the recommendation about whether the patient was contacted.
 */
export async function approveRecommendation(
  id: string,
  { editedMessage, channel }: ApproveInput = {}
): Promise<
  ({ ok: true } & ApproveRecommendationResponse) | ({ ok: false } & ApprovalFailure)
> {
  const existing = await prisma.recommendation.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (existing.status !== "PENDING") {
    return { ok: false, reason: "alreadyProcessed", status: existing.status };
  }

  const actor = await getFrontDeskActor();
  if (!actor.id) return { ok: false, reason: "noApprover" };

  const now = new Date();
  const body = editedMessage?.trim() || existing.draftMessage;
  const finalChannel = channel ?? existing.channel;

  const [recommendation, message] = await prisma.$transaction([
    prisma.recommendation.update({
      where: { id },
      data: {
        status: "SENT",
        approvedById: actor.id,
        approvedAt: now,
        sentAt: now,
        draftMessage: body,
        channel: finalChannel,
      },
    }),
    prisma.message.create({
      data: {
        patientId: existing.patientId,
        recommendationId: id,
        sentById: actor.id,
        channel: finalChannel,
        direction: "OUTBOUND",
        body,
        sentAt: now,
      },
    }),
  ]);

  console.log(
    `[mock send] ${finalChannel} to patient ${existing.patientId}: ${body}`
  );

  await recordAudit({
    actor,
    action: "recommendation.approved",
    entityType: "Recommendation",
    entityId: id,
    metadata: {
      patientId: existing.patientId,
      appointmentId: existing.appointmentId,
      channel: finalChannel,
      messageId: message.id,
      edited: body !== existing.draftMessage,
    },
  });

  return {
    ok: true,
    recommendation: toRecommendation(recommendation),
    message: toMessage(message),
  };
}

/**
 * Declining a draft. The row stays as the record that the agent suggested
 * something and a human said no — the reason lands in the audit metadata.
 */
export async function dismissRecommendation(
  id: string,
  reason?: string
): Promise<
  { ok: true; recommendation: Recommendation } | ({ ok: false } & ApprovalFailure)
> {
  const existing = await prisma.recommendation.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (existing.status !== "PENDING") {
    return { ok: false, reason: "alreadyProcessed", status: existing.status };
  }

  const row = await prisma.recommendation.update({
    where: { id },
    data: { status: "DISMISSED", dismissedAt: new Date() },
  });

  await recordAudit({
    actor: await getFrontDeskActor(),
    action: "recommendation.dismissed",
    entityType: "Recommendation",
    entityId: id,
    metadata: {
      patientId: existing.patientId,
      appointmentId: existing.appointmentId,
      ...(reason ? { reason } : {}),
    },
  });

  return { ok: true, recommendation: toRecommendation(row) };
}
