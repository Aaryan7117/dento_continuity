import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getRecall, updateRecall } from "@/lib/recalls";
import { updateRecallSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const recall = await getRecall(id);
    if (!recall) return fail("Recall not found", 404);

    return ok(recall);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updateRecallSchema);
    if (!body.ok) return body.response;

    const recall = await updateRecall(id, body.data);
    if (!recall) return fail("Recall not found", 404);

    return ok(recall);
  });
}
