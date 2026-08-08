import { NextRequest } from "next/server";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { getDentistActor } from "@/lib/actors";
import { createToothFinding, listToothFindings } from "@/lib/tooth-findings";
import {
  createToothFindingSchema,
  listToothFindingsQuerySchema,
} from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      request.nextUrl.searchParams,
      listToothFindingsQuerySchema
    );
    if (!query.ok) return query.response;

    return ok(await listToothFindings(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await parseBody(request, createToothFindingSchema);
    if (!body.ok) return body.response;

    return ok(await createToothFinding(body.data, await getDentistActor()), 201);
  });
}
