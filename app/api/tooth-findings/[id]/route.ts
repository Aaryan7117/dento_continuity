import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getToothFinding, updateToothFinding } from "@/lib/tooth-findings";
import { updateToothFindingSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const finding = await getToothFinding(id);
    if (!finding) return fail("Tooth finding not found", 404);

    return ok(finding);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updateToothFindingSchema);
    if (!body.ok) return body.response;

    return ok(await updateToothFinding(id, body.data));
  });
}
