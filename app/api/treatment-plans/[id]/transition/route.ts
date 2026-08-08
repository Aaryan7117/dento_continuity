import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { transitionTreatmentPlan } from "@/lib/treatment-plans";
import { transitionTreatmentPlanSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, transitionTreatmentPlanSchema);
    if (!body.ok) return body.response;

    const result = await transitionTreatmentPlan(id, body.data.status);
    if (!result.ok) {
      if (result.reason === "notFound") {
        return fail("Treatment plan not found", 404);
      }
      const allowed =
        result.allowed.length > 0 ? result.allowed.join(", ") : "nothing — it is already final";
      return fail(
        `Cannot move a ${result.from} plan to ${body.data.status}; allowed: ${allowed}`,
        409
      );
    }

    return ok(result.plan);
  });
}
