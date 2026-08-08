import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getEncounter, updateEncounter } from "@/lib/encounters";
import { updateEncounterSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const encounter = await getEncounter(id);
    if (!encounter) return fail("Encounter not found", 404);

    return ok(encounter);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updateEncounterSchema);
    if (!body.ok) return body.response;

    return ok(await updateEncounter(id, body.data));
  });
}
