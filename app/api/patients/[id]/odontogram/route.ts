import { NextRequest } from "next/server";
import { handle, ok, parseQuery } from "@/lib/api";
import { getOdontogram } from "@/lib/tooth-findings";
import { odontogramQuerySchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const query = parseQuery(
      request.nextUrl.searchParams,
      odontogramQuerySchema
    );
    if (!query.ok) return query.response;

    return ok(await getOdontogram(id, query.data.includeResolved));
  });
}
