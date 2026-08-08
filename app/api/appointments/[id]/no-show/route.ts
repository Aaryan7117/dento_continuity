import { NextRequest } from "next/server";
import { fail, handle, ok } from "@/lib/api";
import { markNoShow } from "@/lib/appointments";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const result = await markNoShow(id);
    if (!result) return fail("Appointment not found", 404);

    return ok(result);
  });
}
