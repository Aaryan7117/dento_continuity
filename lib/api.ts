/**
 * Route-handler plumbing.
 *
 * Convention in this app: on success a handler returns the bare contract
 * response type, and on failure it returns `ApiError` with a matching HTTP
 * status. `ApiResult` is reserved for server actions, which have no status code
 * to carry the failure.
 */

import { NextResponse } from "next/server";
import type { ZodError, ZodType } from "zod/v4";
import type { ApiError } from "@/lib/contract";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(
  message: string,
  status: number,
  fieldErrors?: Record<string, string[]>
) {
  const body: ApiError = fieldErrors ? { message, fieldErrors } : { message };
  return NextResponse.json(body, { status });
}

/** Group Zod issues by dotted path so the frontend can render them inline. */
export function toFieldErrors(error: ZodError): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    (grouped[key] ??= []).push(issue.message);
  }
  return grouped;
}

export function validationFailure(error: ZodError) {
  return fail("Validation failed", 422, toFieldErrors(error));
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T, unknown>
): Promise<Parsed<T>> {
  const text = await request.text();

  let raw: unknown;
  try {
    // An absent body is an empty object, so schemas whose fields are all
    // optional accept a bodyless request instead of 400-ing on empty input.
    raw = text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return { ok: false, response: fail("Request body must be valid JSON", 400) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: validationFailure(result.error) };
  }
  return { ok: true, data: result.data };
}

export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodType<T, unknown>
): Parsed<T> {
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (value !== "") raw[key] = value;
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: validationFailure(result.error) };
  }
  return { ok: true, data: result.data };
}

function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * Translates the two Prisma failures that are really client mistakes: a missing
 * row targeted by id, and a foreign key pointing at something that isn't there.
 * Anything else is a genuine server fault and stays a 500.
 */
export async function handle(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    switch (prismaErrorCode(error)) {
      case "P2025":
        return fail("Not found", 404);
      case "P2003":
        return fail("Referenced record does not exist", 400);
      case "P2002":
        return fail("A record with these values already exists", 409);
      default:
        console.error(error);
        return fail("Internal server error", 500);
    }
  }
}
