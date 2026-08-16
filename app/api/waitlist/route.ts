import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: List waitlist candidates, optionally filtered for a time slot
export async function GET(req: NextRequest) {
  const slotDay = req.nextUrl.searchParams.get("day"); // e.g. "Monday"
  const slotTime = req.nextUrl.searchParams.get("time"); // "morning" | "afternoon"

  const entries = await prisma.waitlistEntry.findMany({
    where: { filledAt: null },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { addedAt: "asc" },
  });

  // Score and rank candidates based on slot compatibility
  const ranked = entries.map((entry) => {
    let score = 50; // base score

    // Day preference match
    if (slotDay && entry.preferredDays) {
      const days = entry.preferredDays.split(",").map((d) => d.trim().toLowerCase());
      if (days.includes(slotDay.toLowerCase()) || days.includes("any")) {
        score += 30;
      }
    }

    // Time preference match
    if (slotTime && entry.preferredTime) {
      if (entry.preferredTime === "any" || entry.preferredTime === slotTime) {
        score += 20;
      }
    }

    // Longer waiting = higher priority
    const waitDays = Math.floor((Date.now() - new Date(entry.addedAt).getTime()) / (1000 * 60 * 60 * 24));
    score += Math.min(waitDays, 15); // cap at +15

    return {
      id: entry.id,
      patientId: entry.patientId,
      patient: entry.patient,
      preferredDays: entry.preferredDays,
      preferredTime: entry.preferredTime,
      procedureType: entry.procedureType,
      estimatedMins: entry.estimatedMins,
      note: entry.note,
      addedAt: entry.addedAt.toISOString(),
      waitDays,
      score,
    };
  });

  // Sort by score descending
  ranked.sort((a, b) => b.score - a.score);

  return NextResponse.json(ranked);
}

// POST: Add a patient to the waitlist
export async function POST(req: NextRequest) {
  const body = await req.json();

  const entry = await prisma.waitlistEntry.create({
    data: {
      patientId: body.patientId,
      preferredDays: body.preferredDays || null,
      preferredTime: body.preferredTime || "any",
      procedureType: body.procedureType || null,
      estimatedMins: body.estimatedMins || null,
      note: body.note || null,
    },
    include: {
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
