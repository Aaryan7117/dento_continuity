import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getTreatmentPlan, updateTreatmentPlan } from "@/lib/treatment-plans";
import { updateTreatmentPlanSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const plan = await getTreatmentPlan(id);
    if (!plan) return fail("Treatment plan not found", 404);

    return ok(plan);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updateTreatmentPlanSchema);
    if (!body.ok) return body.response;

    const plan = await updateTreatmentPlan(id, body.data);
    if (!plan) return fail("Treatment plan not found", 404);

    return ok(plan);
  });
}
