/**
 * Local-disk image storage.
 *
 * Files land in `public/uploads` and are served as plain static assets, which is
 * the least machinery that works for the demo. Swapping in Supabase storage
 * later means reimplementing `storeUpload` and nothing else — `storagePath` is
 * already an opaque URL path to every caller.
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { recordAudit } from "@/lib/audit";
import { getDentistActor, type Actor } from "@/lib/actors";
import { toImage } from "@/lib/serializers";
import type {
  CreateImageRequest,
  Image,
  ListImagesResponse,
  UpdateImageRequest,
} from "@/lib/contract";
import type { z } from "zod/v4";
import type { listImagesQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listImagesQuerySchema>;

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads";
const MAX_BYTES = 15 * 1024 * 1024;

/** Extension comes from this table, never from the client's filename. */
const ACCEPTED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const ACCEPTED_MIME_TYPES = Object.keys(ACCEPTED);
export const MAX_UPLOAD_BYTES = MAX_BYTES;

export type UploadRejection =
  | { reason: "tooLarge"; limitBytes: number }
  | { reason: "badType"; accepted: string[] };

/**
 * Writes the bytes under a generated name. The client's filename never reaches
 * the filesystem, so a traversal payload in it has nothing to act on.
 */
async function storeUpload(
  file: File
): Promise<
  { ok: true; storagePath: string; sizeBytes: number } | { ok: false } & UploadRejection
> {
  const extension = ACCEPTED[file.type];
  if (!extension) {
    return { ok: false, reason: "badType", accepted: ACCEPTED_MIME_TYPES };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: "tooLarge", limitBytes: MAX_BYTES };
  }

  const filename = `${randomUUID()}${extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer())
  );

  return {
    ok: true,
    storagePath: `${PUBLIC_PREFIX}/${filename}`,
    sizeBytes: file.size,
  };
}

export async function listImages({
  page,
  pageSize,
  patientId,
  encounterId,
  kind,
}: ListArgs): Promise<ListImagesResponse> {
  const where = {
    ...(patientId ? { patientId } : {}),
    ...(encounterId ? { encounterId } : {}),
    ...(kind ? { kind } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.image.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.image.count({ where }),
  ]);

  return { items: rows.map(toImage), total, page, pageSize };
}

export async function getImage(id: string): Promise<Image | null> {
  const row = await prisma.image.findUnique({ where: { id } });
  return row ? toImage(row) : null;
}

export async function createImage(
  input: CreateImageRequest,
  file: File,
  uploadedBy: Actor
): Promise<{ ok: true; image: Image } | ({ ok: false } & UploadRejection)> {
  const stored = await storeUpload(file);
  if (!stored.ok) return stored;

  const row = await prisma.image.create({
    data: {
      clinicId: await currentClinicId(),
      patientId: input.patientId,
      encounterId: input.encounterId ?? null,
      uploadedById: uploadedBy.id,
      kind: input.kind,
      storagePath: stored.storagePath,
      mimeType: file.type,
      sizeBytes: stored.sizeBytes,
      caption: input.caption ?? null,
      capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
    },
  });

  await recordAudit({
    actor: uploadedBy,
    action: "image.uploaded",
    entityType: "Image",
    entityId: row.id,
    metadata: {
      patientId: row.patientId,
      kind: row.kind,
      sizeBytes: row.sizeBytes,
    },
  });

  return { ok: true, image: toImage(row) };
}

/** Metadata only; the stored bytes are immutable once uploaded. */
export async function updateImage(
  id: string,
  input: UpdateImageRequest
): Promise<Image> {
  const row = await prisma.image.update({
    where: { id },
    data: {
      kind: input.kind,
      caption: input.caption,
      capturedAt:
        input.capturedAt === undefined
          ? undefined
          : input.capturedAt === null
            ? null
            : new Date(input.capturedAt),
    },
  });

  await recordAudit({
    actor: await getDentistActor(),
    action: "image.updated",
    entityType: "Image",
    entityId: id,
    metadata: { patientId: row.patientId, fields: Object.keys(input) },
  });

  return toImage(row);
}
