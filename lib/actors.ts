/**
 * Who is acting.
 *
 * With a signed-in session, the actor is that user whatever their role. The
 * role-named helpers remain for callers that run without a session (the MCP
 * server, seed and scripts) and fall back to the clinic's first user in that
 * role, which audit records as-is.
 */

import { prisma } from "@/lib/db";
import type { Role } from "@/lib/contract";

export interface Actor {
  id: string | null;
  role: Role | null;
}

async function sessionActor(): Promise<Actor | null> {
  try {
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    return session ? { id: session.userId, role: session.role } : null;
  } catch {
    return null;
  }
}

/** Null when the clinic has no user in that role. */
async function firstUserInRole(role: Role): Promise<Actor> {
  const user = await prisma.user.findFirst({ where: { role, isActive: true } });
  return { id: user?.id ?? null, role: user ? role : null };
}

export async function getCurrentActor(): Promise<Actor> {
  return (await sessionActor()) ?? { id: null, role: null };
}

export async function getDentistActor(): Promise<Actor> {
  return (await sessionActor()) ?? firstUserInRole("DENTIST");
}

export async function getFrontDeskActor(): Promise<Actor> {
  return (await sessionActor()) ?? firstUserInRole("FRONT_DESK");
}
