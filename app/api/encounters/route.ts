import { NextRequest } from "next/server";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { createEncounter, listEncounters } from "@/lib/encounters";
import {
  createEncounterSchema,
  listEncountersQuerySchema,
} from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      request.nextUrl.searchParams,
      listEncountersQuerySchema
    );
    if (!query.ok) return query.response;

    return ok(await listEncounters(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await parseBody(request, createEncounterSchema);
    if (!body.ok) return body.response;

    return ok(await createEncounter(body.data), 201);
  });
}
