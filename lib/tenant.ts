/**
 * Clinic context for the current unit of work.
 *
 * Resolution order:
 *   1. an explicit `runAsClinic(...)` scope (seed, MCP server, scripts);
 *   2. the signed-in session cookie (every Next.js request);
 *   3. `DENTO_CLINIC_ID` from the environment (single-clinic installs).
 *
 * `lib/db.ts` calls `currentClinicId()` on every query to a tenant-owned model,
 * so code that forgets to filter by clinic still cannot cross a boundary.
 */

import { AsyncLocalStorage } from "node:async_hooks";

// Held on globalThis for the same reason the Prisma client is: Next.js may load
// this module once per route graph, and the shared client must see the same
// store as the request that set it.
const globalForTenant = globalThis as unknown as {
  dentoClinicScope: AsyncLocalStorage<{ clinicId: string }> | undefined;
};
const scope = (globalForTenant.dentoClinicScope ??= new AsyncLocalStorage<{ clinicId: string }>());

export function runAsClinic<T>(clinicId: string, fn: () => Promise<T>): Promise<T> {
  return scope.run({ clinicId }, fn);
}

export class NoClinicContextError extends Error {
  constructor() {
    super("No clinic context: sign in, or wrap the call in runAsClinic().");
    this.name = "NoClinicContextError";
  }
}

export async function currentClinicId(): Promise<string> {
  const explicit = scope.getStore();
  if (explicit) return explicit.clinicId;

  // Imported lazily so this module also loads outside a Next.js request
  // (tsx scripts, the MCP server), where next/headers throws on use.
  let insideRequest = false;
  try {
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    insideRequest = true;
    if (session) return session.clinicId;
  } catch {
    // Not inside a request; the environment default may apply below.
  }

  // Inside a request with no session there is no fallback: an anonymous
  // caller must never be served the default clinic.
  if (insideRequest) throw new NoClinicContextError();

  const fromEnv = process.env.DENTO_CLINIC_ID;
  if (fromEnv) return fromEnv;

  throw new NoClinicContextError();
}
