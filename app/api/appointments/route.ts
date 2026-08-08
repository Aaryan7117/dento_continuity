import { NextRequest } from "next/server";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { createAppointment, listAppointments } from "@/lib/appointments";
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

    return ok(await createAppointment(body.data), 201);
  });
}
