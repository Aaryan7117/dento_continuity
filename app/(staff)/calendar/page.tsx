import { getCalendarAppointments } from "@/lib/queries";
import InteractiveCalendarClient from "./InteractiveCalendarClient";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  // Fetch a 1-year window around current date to support full month navigation
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, 0, 1);
  const to = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);

  const appointments = await getCalendarAppointments(from, to);

  return <InteractiveCalendarClient initialAppointments={appointments} />;
}
