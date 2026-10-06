import { NextRequest } from "next/server";
import { fail, handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { localAsrInfo, transcribeWav } from "@/lib/voice/local-asr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // ~5 minutes of 16 kHz 16-bit mono

/** Tells the browser whether a local model exists on this machine. */
export async function GET() {
  return handle(async () => ok(localAsrInfo()));
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

    const [patients, dentists] = await Promise.all([
      prisma.patient.findMany({ select: { firstName: true, lastName: true }, take: 2000 }),
      prisma.user.findMany({ where: { role: "DENTIST", isActive: true }, select: { name: true } }),
    ]);
    const hotwords = Array.from(
      new Set([
        ...patients.flatMap((p) => [p.firstName, p.lastName]),
        ...dentists.map((d) => d.name.replace(/^dr\.?\s*/i, "")),
        // Hindi words the grammar understands, so they are not forced into English.
        "kal", "aaj", "parson", "baje", "subah", "shaam", "dopahar", "aa gaya", "aa gayi", "nahi aaya",
        "chair", "waitlist", "no-show", "cancel", "book",
      ])
    ).filter((w) => w.length >= 3);

    const result = await transcribeWav(bytes, hotwords);
    if (!result) return fail("No local speech model on this machine", 404);
    return ok(result);
  });
}
