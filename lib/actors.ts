/**
 * Stand-in for authentication.
 *
 * CLAUDE.md fixes the demo at two hardcoded roles with no permission engine, so
 * writes attribute themselves to the first user holding the relevant role
 * instead of to a signed-in session.
 */

import { prisma } from "@/lib/db";
import type { Role } from "@/lib/contract";

export interface Actor {
  id: string | null;
  role: Role | null;
}

/** Null when the database has no user in that role, which audit records as-is. */
async function firstUserInRole(role: Role): Promise<Actor> {
  const user = await prisma.user.findFirst({ where: { role } });
  return { id: user?.id ?? null, role: user ? role : null };
}

export function getDentistActor(): Promise<Actor> {
  return firstUserInRole("DENTIST");
}

export function getFrontDeskActor(): Promise<Actor> {
  return firstUserInRole("FRONT_DESK");
}
