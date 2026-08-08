import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { dismissRecommendation } from "@/lib/recommendations";
import { dismissRecommendationSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, dismissRecommendationSchema);
    if (!body.ok) return body.response;

    const result = await dismissRecommendation(id, body.data.reason);
    if (!result.ok) {
      return result.reason === "notFound"
        ? fail("Recommendation not found", 404)
        : fail("Recommendation is no longer pending", 409);
    }

    return ok(result.recommendation);
  });
}
