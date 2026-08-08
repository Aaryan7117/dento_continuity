import { NextRequest } from "next/server";
import { handle, ok, parseQuery } from "@/lib/api";
import { listRecommendations } from "@/lib/recommendations";
import { listRecommendationsQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      request.nextUrl.searchParams,
      listRecommendationsQuerySchema
    );
    if (!query.ok) return query.response;

    return ok(await listRecommendations(query.data));
  });
}
