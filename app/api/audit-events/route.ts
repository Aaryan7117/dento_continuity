import { NextRequest } from "next/server";
import { handle, ok, parseQuery } from "@/lib/api";
import { listAuditEvents } from "@/lib/audit";
import { listAuditEventsQuerySchema } from "@/lib/validation";

/** Read-only by design: the log is append-only and written by services alone. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      request.nextUrl.searchParams,
      listAuditEventsQuerySchema
    );
    if (!query.ok) return query.response;

    return ok(await listAuditEvents(query.data));
  });
}
