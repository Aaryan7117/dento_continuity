import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getDentistActor, type Actor } from "@/lib/actors";
import { toNote, toNoteWithAuthor } from "@/lib/serializers";
import type {
  CreateNoteRequest,
  ListNotesResponse,
  Note,
  NoteWithAuthor,
  UpdateNoteRequest,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listNotesQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listNotesQuerySchema>;

export async function listNotes({
  page,
  pageSize,
  encounterId,
}: ListArgs): Promise<ListNotesResponse> {
  const where = encounterId ? { encounterId } : {};

  const [rows, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: { author: true },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.note.count({ where }),
  ]);

  return { items: rows.map(toNoteWithAuthor), total, page, pageSize };
}

/** Notes belong to an encounter, so listing by patient joins through it. */
export async function listNotesByPatient(
  patientId: string,
  { page, pageSize }: { page: number; pageSize: number }
): Promise<ListNotesResponse> {
  const where = { encounter: { patientId } };

  const [rows, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: { author: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.note.count({ where }),
  ]);

  return { items: rows.map(toNoteWithAuthor), total, page, pageSize };
}

export async function getNote(id: string): Promise<NoteWithAuthor | null> {
  const row = await prisma.note.findUnique({
    where: { id },
    include: { author: true },
  });
  return row ? toNoteWithAuthor(row) : null;
}

export async function createNote(
  input: CreateNoteRequest,
  author: Actor
): Promise<Note> {
  const row = await prisma.note.create({
    data: {
      encounterId: input.encounterId,
      authorId: author.id,
      body: input.body,
    },
  });

  await recordAudit({
    actor: author,
    action: "note.created",
    entityType: "Note",
    entityId: row.id,
    metadata: { encounterId: row.encounterId },
  });

  return toNote(row);
}

/** A signed note is part of the clinical record and its body is immutable. */
export async function updateNote(
  id: string,
  input: UpdateNoteRequest
): Promise<{ ok: true; note: Note } | { ok: false; reason: "notFound" | "signed" }> {
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (existing.signed) return { ok: false, reason: "signed" };

  const row = await prisma.note.update({
    where: { id },
    data: { body: input.body },
  });

  await recordAudit({
    actor: await getDentistActor(),
    action: "note.updated",
    entityType: "Note",
    entityId: id,
    metadata: { encounterId: row.encounterId },
  });

  return { ok: true, note: toNote(row) };
}

export async function signNote(
  id: string
): Promise<{ ok: true; note: Note } | { ok: false; reason: "notFound" | "signed" }> {
  const existing = await prisma.note.findUnique({ where: { id } });
  if (!existing) return { ok: false, reason: "notFound" };
  if (existing.signed) return { ok: false, reason: "signed" };

  const row = await prisma.note.update({
    where: { id },
    data: { signed: true, signedAt: new Date() },
  });

  await recordAudit({
    actor: await getDentistActor(),
    action: "note.signed",
    entityType: "Note",
    entityId: id,
    metadata: {
      encounterId: row.encounterId,
      signedAt: row.signedAt?.toISOString() ?? null,
    },
  });

  return { ok: true, note: toNote(row) };
}
