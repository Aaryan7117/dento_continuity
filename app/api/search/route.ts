import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ patients: [], appointments: [] });
  }

  const [patients, appointments] = await Promise.all([
    prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        consentGiven: true,
      },
      take: 6,
      orderBy: { lastName: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { reason: { contains: q, mode: "insensitive" } },
          { patient: { firstName: { contains: q, mode: "insensitive" } } },
          { patient: { lastName: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
      take: 4,
      orderBy: { startsAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    patients: patients.map((p) => ({
      ...p,
      dateOfBirth: p.dateOfBirth.toISOString().slice(0, 10),
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      startsAt: a.startsAt.toISOString(),
      status: a.status,
      reason: a.reason,
    })),
  });
}
