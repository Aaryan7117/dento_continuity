import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { currentClinicId } from "@/lib/tenant";

/**
 * Clinic scoping.
 *
 * The scoped client wraps each tenant-owned model delegate so that every call
 * first resolves the clinic in the *caller's* async context, then adds
 * `clinicId` to the `where` (reads, updates, deletes) or `data` (creates) before
 * Prisma sees it. Prisma's own `$extends` hooks run outside the caller's
 * context and lose AsyncLocalStorage state, which is why this is a Proxy.
 */

/** Delegate property names (camelCase) of models that carry `clinicId`. */
const SCOPED_DELEGATES = new Set([
  "user",
  "chair",
  "patient",
  "appointment",
  "encounter",
  "note",
  "toothFinding",
  "image",
  "treatmentPlan",
  "recall",
  "recommendation",
  "message",
  "auditEvent",
  "waitlistEntry",
]);

const WHERE_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
  "upsert",
]);

const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);

type AnyArgs = Record<string, unknown>;

/** The context clinic always wins over a clinicId supplied in the payload. */
function stamp(data: unknown, clinicId: string): unknown {
  if (Array.isArray(data)) return data.map((row) => stamp(row, clinicId));
  if (data && typeof data === "object") return { ...(data as AnyArgs), clinicId };
  return data;
}

function scopeArgs(operation: string, args: AnyArgs | undefined, clinicId: string): AnyArgs {
  const next: AnyArgs = { ...(args ?? {}) };
  if (WHERE_OPS.has(operation)) {
    next.where = { ...((next.where as AnyArgs) ?? {}), clinicId };
  }
  if (CREATE_OPS.has(operation)) {
    next.data = stamp(next.data, clinicId);
  }
  if (operation === "upsert") {
    next.create = stamp(next.create, clinicId);
  }
  return next;
}

function scopeDelegate<T extends object>(delegate: T): T {
  return new Proxy(delegate, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || typeof value !== "function") return value;
      if (!WHERE_OPS.has(prop) && !CREATE_OPS.has(prop)) {
        return value.bind(target);
      }
      return async (args?: AnyArgs) => {
        const clinicId = await currentClinicId();
        return (value as (a: AnyArgs) => unknown).call(target, scopeArgs(prop, args, clinicId));
      };
    },
  });
}

function scopeClient(base: PrismaClient): PrismaClient {
  const cache = new Map<string, object>();
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && SCOPED_DELEGATES.has(prop)) {
        let scoped = cache.get(prop);
        if (!scoped) {
          scoped = scopeDelegate(Reflect.get(target, prop, receiver) as object);
          cache.set(prop, scoped);
        }
        return scoped;
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function buildClients() {
  const base = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DIRECT_DATABASE_URL!,
    }),
  });
  return { base, scoped: scopeClient(base) };
}

const globalForPrisma = globalThis as unknown as {
  dentoPrisma: ReturnType<typeof buildClients> | undefined;
};

const clients = globalForPrisma.dentoPrisma ?? buildClients();
if (process.env.NODE_ENV !== "production") globalForPrisma.dentoPrisma = clients;

/** Clinic-scoped client. Use this everywhere in application code. */
export const prisma = clients.scoped;

/**
 * Unscoped client. Only for cross-clinic work that happens before a clinic is
 * known: sign-in by email, clinic provisioning, operational scripts. Note that
 * `prisma.$transaction(async (tx) => …)` hands out an unscoped `tx` as well.
 */
export const prismaUnscoped = clients.base;
