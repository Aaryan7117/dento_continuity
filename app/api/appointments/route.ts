import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody, parseQuery } from "@/lib/api";
import {
  bookAppointment,
  conflictMessage,
  listAppointments,
} from "@/lib/appointments";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      request.nextUrl.searchParams,
      listAppointmentsQuerySchema
    );
    if (!query.ok) return query.response;

    return ok(await listAppointments(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await parseBody(request, createAppointmentSchema);
    if (!body.ok) return body.response;

    const result = await bookAppointment(body.data);
    if (!result.ok) {
      return result.reason === "conflict"
        ? fail(conflictMessage(result.conflict), 409)
        : fail("Validation failed", 422, {
            endsAt: ["endsAt must be after startsAt"],
          });
    }

    return ok(result.appointment, 201);
  });
}
