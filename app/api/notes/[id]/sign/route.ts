import { NextRequest } from "next/server";
import { fail, handle, ok } from "@/lib/api";
import { signNote } from "@/lib/notes";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const result = await signNote(id);
    if (!result.ok) {
      return result.reason === "notFound"
        ? fail("Note not found", 404)
        : fail("Note is already signed", 409);
    }

    return ok(result.note);
  });
}
