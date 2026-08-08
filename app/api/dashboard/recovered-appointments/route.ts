import { handle, ok } from "@/lib/api";
import { listRecoveredAppointments } from "@/lib/recovery";

/** Missed appointments rebooked after an approved follow-up went out. */
export async function GET() {
  return handle(async () => {
    const items = await listRecoveredAppointments();
    return ok({ recoveredAppointmentCount: items.length, items });
  });
}
