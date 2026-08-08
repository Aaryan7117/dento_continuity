import { NextRequest } from "next/server";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { getDentistActor } from "@/lib/actors";
import { createNote, listNotes } from "@/lib/notes";
import { createNoteSchema, listNotesQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(request.nextUrl.searchParams, listNotesQuerySchema);
    if (!query.ok) return query.response;

    return ok(await listNotes(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await parseBody(request, createNoteSchema);
    if (!body.ok) return body.response;

    return ok(await createNote(body.data, await getDentistActor()), 201);
  });
}
