/**
 * Notes hang off encounters, so `ListNotesQuery` has no patientId to filter on.
 * Patient-scoped listing lives here instead of widening the contract's query.
 */

import { NextRequest } from "next/server";
import { handle, ok, parseQuery } from "@/lib/api";
import { listNotesByPatient } from "@/lib/notes";
import { listQuerySchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const query = parseQuery(request.nextUrl.searchParams, listQuerySchema);
    if (!query.ok) return query.response;

    return ok(await listNotesByPatient(id, query.data));
  });
}
