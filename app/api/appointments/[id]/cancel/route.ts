import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { cancelAppointment } from "@/lib/appointments";
import { cancelAppointmentSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, cancelAppointmentSchema);
    if (!body.ok) return body.response;

    const result = await cancelAppointment(id, body.data.reason);
    if (!result.ok) {
      return result.reason === "notFound"
        ? fail("Appointment not found", 404)
        : fail("Only scheduled or confirmed appointments can be cancelled", 409);
    }

    return ok(result.appointment);
  });
}
