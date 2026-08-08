import { NextRequest } from "next/server";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { createRecall, listRecalls } from "@/lib/recalls";
import { createRecallSchema, listRecallsQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(request.nextUrl.searchParams, listRecallsQuerySchema);
    if (!query.ok) return query.response;

    return ok(await listRecalls(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await parseBody(request, createRecallSchema);
    if (!body.ok) return body.response;

    return ok(await createRecall(body.data), 201);
  });
}
