import { NextRequest } from "next/server";
import { fail, handle, ok } from "@/lib/api";
import { regenerateRecommendation } from "@/lib/retention-agent";

/** Redrafts a pending recommendation against the patient's current history. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const recommendation = await regenerateRecommendation(id);
    if (!recommendation) {
      return fail("No pending recommendation to regenerate", 404);
    }

    return ok(recommendation);
  });
}
