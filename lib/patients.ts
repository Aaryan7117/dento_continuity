import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getFrontDeskActor } from "@/lib/actors";
import { toPatient } from "@/lib/serializers";
import type {
  CreatePatientRequest,
  ListPatientsResponse,
  Patient,
  PatientDetail,
  UpdatePatientRequest,
} from "@/lib/contract";
import { getPatientDetail } from "@/lib/queries";
import type { z } from "zod/v4";
import type { listPatientsQuerySchema } from "@/lib/validation";

type ListArgs = z.output<typeof listPatientsQuerySchema>;

export async function listPatients({
  page,
  pageSize,
  search,
}: ListArgs): Promise<ListPatientsResponse> {
  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.patient.count({ where }),
  ]);

  return { items: rows.map(toPatient), total, page, pageSize };
}

export function getPatient(id: string): Promise<PatientDetail | null> {
  return getPatientDetail(id);
}

export async function createPatient(
  input: CreatePatientRequest
): Promise<Patient> {
  const row = await prisma.patient.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: new Date(input.dateOfBirth),
      phone: input.phone,
      email: input.email ?? null,
      address: input.address ?? null,
      consentGiven: input.consentGiven,
      consentAt: input.consentGiven ? new Date() : null,
    },
  });

  const actor = await getFrontDeskActor();
  await recordAudit({
    actor,
    action: "patient.created",
    entityType: "Patient",
    entityId: row.id,
    metadata: { consentGiven: row.consentGiven },
  });

  // Consent gets its own event even at intake: the Patient row only ever holds
  // the current answer, so the log is the only place its history survives.
  if (row.consentGiven) {
    await recordAudit({
      actor,
      action: "patient.consent_granted",
      entityType: "Patient",
      entityId: row.id,
      metadata: { consentAt: row.consentAt?.toISOString() ?? null, source: "intake" },
    });
  }

  return toPatient(row);
}

export async function updatePatient(
  id: string,
  input: UpdatePatientRequest
): Promise<Patient | null> {
  const existing = await prisma.patient.findUnique({
    where: { id },
    select: { consentGiven: true, consentAt: true },
  });
  if (!existing) return null;

  const consentChanged =
    input.consentGiven !== undefined && input.consentGiven !== existing.consentGiven;

  // Consent is stamped the moment it is first granted and cleared if withdrawn.
  const consentAt = consentChanged
    ? input.consentGiven
      ? new Date()
      : null
    : existing.consentAt;

  const row = await prisma.patient.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      phone: input.phone,
      email: input.email,
      address: input.address,
      consentGiven: input.consentGiven,
      consentAt,
    },
  });

  const actor = await getFrontDeskActor();
  const demographicFields = Object.keys(input).filter((f) => f !== "consentGiven");

  if (demographicFields.length > 0) {
    await recordAudit({
      actor,
      action: "patient.updated",
      entityType: "Patient",
      entityId: id,
      metadata: { fields: demographicFields },
    });
  }

  if (consentChanged) {
    await recordAudit({
      actor,
      action: row.consentGiven ? "patient.consent_granted" : "patient.consent_withdrawn",
      entityType: "Patient",
      entityId: id,
      metadata: { consentAt: row.consentAt?.toISOString() ?? null },
    });
  }

  return toPatient(row);
}
