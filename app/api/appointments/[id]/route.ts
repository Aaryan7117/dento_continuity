import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getAppointment, updateAppointment } from "@/lib/appointments";
import { updateAppointmentSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const appointment = await getAppointment(id);
    if (!appointment) return fail("Appointment not found", 404);

    return ok(appointment);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updateAppointmentSchema);
    if (!body.ok) return body.response;

    const result = await updateAppointment(id, body.data);
    if (!result.ok) {
      return result.reason === "notFound"
        ? fail("Appointment not found", 404)
        : fail("Validation failed", 422, {
            endsAt: ["endsAt must be after startsAt"],
          });
    }

    return ok(result.appointment);
  });
}
