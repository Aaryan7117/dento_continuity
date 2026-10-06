import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { handle, ok, parseQuery } from "@/lib/api";
import { getAvailableSlots } from "@/lib/clinic";

export const dynamic = "force-dynamic";

const slotsQuerySchema = z.object({
  date: z.iso.date(),
  durationMins: z.coerce.number().int().min(5).max(240).optional(),
  providerId: z.uuid().optional(),
  chairId: z.uuid().optional(),
  excludeAppointmentId: z.uuid().optional(),
});

/** Free start times for the booking form's slot picker. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(request.nextUrl.searchParams, slotsQuerySchema);
    if (!query.ok) return query.response;
    return ok(await getAvailableSlots(query.data));
  });
}
