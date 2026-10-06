/**
 * Self-action links for patients.
 *
 * A link is a signed, expiring token carrying the patient and clinic (and
 * optionally the appointment it was sent about). It is the only way a patient
 * reaches their visit page: no login, no guessable id. A token is tied to one
 * patient, so a forwarded link exposes only that patient's own visit.
 */

import { SignJWT, jwtVerify } from "jose";

const PURPOSE = "patient-link";
const DEFAULT_TTL_DAYS = 30;

export interface PatientLink {
  patientId: string;
  clinicId: string;
  appointmentId: string | null;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function issuePatientLinkToken(
  link: PatientLink,
  ttlDays = DEFAULT_TTL_DAYS
): Promise<string> {
  return new SignJWT({
    purpose: PURPOSE,
    clinicId: link.clinicId,
    ...(link.appointmentId ? { appointmentId: link.appointmentId } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(link.patientId)
    .setIssuedAt()
    .setExpirationTime(`${ttlDays}d`)
    .sign(secretKey());
}

export async function verifyPatientLinkToken(token: string): Promise<PatientLink | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== PURPOSE) return null;
    if (typeof payload.sub !== "string" || typeof payload.clinicId !== "string") return null;
    return {
      patientId: payload.sub,
      clinicId: payload.clinicId,
      appointmentId: typeof payload.appointmentId === "string" ? payload.appointmentId : null,
    };
  } catch {
    return null;
  }
}

/** Absolute URL for messages. `APP_BASE_URL` is the public address of the app. */
export function patientLinkUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/p/${token}`;
}

export async function issuePatientLinkUrl(link: PatientLink, ttlDays?: number): Promise<string> {
  return patientLinkUrl(await issuePatientLinkToken(link, ttlDays));
}
