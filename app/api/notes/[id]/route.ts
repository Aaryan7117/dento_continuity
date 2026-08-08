import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getNote, updateNote } from "@/lib/notes";
import { updateNoteSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const note = await getNote(id);
    if (!note) return fail("Note not found", 404);

    return ok(note);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updateNoteSchema);
    if (!body.ok) return body.response;

    const result = await updateNote(id, body.data);
    if (!result.ok) {
      return result.reason === "notFound"
        ? fail("Note not found", 404)
        : fail("A signed note cannot be edited", 409);
    }

    return ok(result.note);
  });
}
