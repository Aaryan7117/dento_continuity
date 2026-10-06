import { getPatients, getProviders } from "@/lib/queries";
import { getClinicSettings, listChairs } from "@/lib/clinic";
import { CalendarClock, ArrowLeft } from "lucide-react";
import Link from "next/link";
import NewAppointmentForm from "./NewAppointmentForm";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ walkin?: string }>;
}) {
  const [{ walkin }, patients, providers, chairs, settings] = await Promise.all([
    searchParams,
    getPatients(),
    getProviders(),
    listChairs(),
    getClinicSettings(),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/front-desk"
          className="p-2 rounded-lg no-press"
          data-no-press
          style={{
            color: "var(--ink-faint)",
            transition: "color 150ms var(--ease-out)",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--ink)" }}
          >
            <CalendarClock className="w-6 h-6" style={{ color: "var(--brand)" }} />
            Schedule Appointment
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-muted)" }}>
            Book a new visit for a patient.
          </p>
        </div>
      </div>

      <div className="card p-7">
        <NewAppointmentForm
          patients={patients.map((p) => ({
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone,
          }))}
          providers={providers}
          chairs={chairs}
          defaultVisitMinutes={settings.defaultVisitMinutes}
          initialWalkIn={walkin === "1"}
        />
      </div>
    </div>
  );
}
