import { NextRequest } from "next/server";
import { fail, handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { currentClinicId } from "@/lib/tenant";
import { localAsrInfo, transcribeWav, warmUp } from "@/lib/voice/local-asr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // ~5 minutes of 16 kHz 16-bit mono

/** The name list changes rarely; a short cache keeps the database off the voice path. */
const HOTWORDS_TTL_MS = 60_000;
let hotwordsCache: { clinicId: string; at: number; words: string[] } | null = null;

/** Patient and dentist names plus the Hindi command words, so the model prefers them. */
async function collectHotwords(): Promise<string[]> {
  const clinicId = await currentClinicId();
  if (hotwordsCache && hotwordsCache.clinicId === clinicId && Date.now() - hotwordsCache.at < HOTWORDS_TTL_MS) {
    return hotwordsCache.words;
  }
  const words = await queryHotwords();
  hotwordsCache = { clinicId, at: Date.now(), words };
  return words;
}

async function queryHotwords(): Promise<string[]> {
  const [patients, dentists] = await Promise.all([
    prisma.patient.findMany({ select: { firstName: true, lastName: true }, take: 2000 }),
    prisma.user.findMany({ where: { role: "DENTIST", isActive: true }, select: { name: true } }),
  ]);
  return Array.from(
    new Set([
      ...patients.flatMap((p) => [p.firstName, p.lastName]),
      ...dentists.map((d) => d.name.replace(/^dr\.?\s*/i, "")),
      // Hindi words the grammar understands, so they are not forced into English.
      "kal", "aaj", "parson", "baje", "subah", "shaam", "dopahar", "aa gaya", "aa gayi", "nahi aaya",
      "chair", "waitlist", "no-show", "cancel", "book",
    ])
  ).filter((w) => w.length >= 3);
}

/**
 * Tells the browser whether a local model exists on this machine, and starts
 * loading it in the background so the first clip is not held up by the load.
 */
export async function GET() {
  return handle(async () => {
    const info = localAsrInfo();
    if (info.available) void collectHotwords().then((hw) => warmUp(hw));
    return ok(info);
  });
}

/**
 * Body: a 16-bit PCM WAV. Returns the text, decoded entirely on this server.
 * Patient and dentist names are passed as hotwords so the model prefers them.
 */
export async function POST(request: NextRequest) {
  return handle(async () => {
    const info = localAsrInfo();
    if (!info.available) return fail("No local speech model on this machine", 404);

    const bytes = Buffer.from(await request.arrayBuffer());
    if (bytes.length === 0) return fail("Empty audio", 400);
    if (bytes.length > MAX_BYTES) return fail("Audio too long", 413);

    const result = await transcribeWav(bytes, await collectHotwords());
    if (!result) return fail("No local speech model on this machine", 404);
    return ok(result);
  });
}
