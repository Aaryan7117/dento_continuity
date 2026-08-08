import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { approveRecommendation } from "@/lib/recommendations";
import { approveRecommendationSchema } from "@/lib/validation";

/**
 * The human-in-the-loop gate. Writes the mocked send to the communications log
 * and returns both halves so the caller can show what went out.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, approveRecommendationSchema);
    if (!body.ok) return body.response;

    const result = await approveRecommendation(id, body.data);
    if (!result.ok) {
      switch (result.reason) {
        case "notFound":
          return fail("Recommendation not found", 404);
        case "alreadyProcessed":
          return fail(
            `Recommendation is already ${result.status.toLowerCase()}`,
            409
          );
        case "noApprover":
          return fail("No front_desk user available to approve as", 409);
      }
    }

    return ok({
      recommendation: result.recommendation,
      message: result.message,
    });
  });
}
