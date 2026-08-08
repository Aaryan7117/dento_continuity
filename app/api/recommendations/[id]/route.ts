import { NextRequest } from "next/server";
import { fail, handle, ok } from "@/lib/api";
import { getRecommendation } from "@/lib/recommendations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const recommendation = await getRecommendation(id);
    if (!recommendation) return fail("Recommendation not found", 404);

    return ok(recommendation);
  });
}
