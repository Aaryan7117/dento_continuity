import { notFound } from "next/navigation";
import { getPatientPortal } from "@/lib/queries";
import StatusBadge from "@/app/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PatientPortalPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const portal = await getPatientPortal(patientId);
  if (!portal) notFound();

  const upcomingAppointments = portal.appointments.filter(
    (a) => a.status === "SCHEDULED" || a.status === "CONFIRMED"
  );
  const pastAppointments = portal.appointments.filter(
    (a) => a.status === "COMPLETED" || a.status === "NO_SHOW" || a.status === "CANCELLED"
  );

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="bg-surface border-b border-line px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-ink-muted">Patient Portal</p>
          <h1 className="text-xl font-semibold text-ink">
            Welcome, {portal.patient.firstName}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-8">
        {/* Upcoming Appointments */}
        <section>
          <h2 className="text-lg font-semibold text-ink mb-3">
            Upcoming Appointments
          </h2>
          {upcomingAppointments.length === 0 ? (
            <div className="bg-surface border border-line rounded-lg p-4 text-sm text-ink-faint text-center">
              No upcoming appointments
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-surface border border-line rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {new Date(apt.startsAt).toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                      {" at "}
                      {new Date(apt.startsAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {apt.reason && (
                      <p className="text-sm text-ink-muted">{apt.reason}</p>
                    )}
                    {apt.providerName && (
                      <p className="text-xs text-ink-faint">
                        with {apt.providerName}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              Past Appointments
            </h2>
            <div className="space-y-2">
              {pastAppointments.slice(0, 10).map((apt) => (
                <div
                  key={apt.id}
                  className="bg-surface border border-line rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-ink">
                      {new Date(apt.startsAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </p>
                    {apt.reason && (
                      <p className="text-xs text-ink-muted">{apt.reason}</p>
                    )}
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Treatment Plans */}
        <section>
          <h2 className="text-lg font-semibold text-ink mb-3">
            Treatment Plans
          </h2>
          {portal.treatmentPlans.length === 0 ? (
            <div className="bg-surface border border-line rounded-lg p-4 text-sm text-ink-faint text-center">
              No treatment plans
            </div>
          ) : (
            <div className="space-y-2">
              {portal.treatmentPlans.map((tp) => (
                <div
                  key={tp.id}
                  className="bg-surface border border-line rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">
                      {tp.title}
                    </p>
                    <div className="flex gap-2">
                      <StatusBadge status={tp.status} />
                      <StatusBadge status={tp.billingStatus} />
                    </div>
                  </div>
                  {tp.estimatedCost != null && (
                    <p className="text-xs text-ink-muted mt-1">
                      Estimated: ₹{tp.estimatedCost.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Messages */}
        <section>
          <h2 className="text-lg font-semibold text-ink mb-3">
            Messages
          </h2>
          {portal.messages.length === 0 ? (
            <div className="bg-surface border border-line rounded-lg p-4 text-sm text-ink-faint text-center">
              No messages
            </div>
          ) : (
            <div className="space-y-2">
              {portal.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`border rounded-lg p-3 ${
                    msg.direction === "OUTBOUND"
                      ? "bg-brand/5 border-brand/20"
                      : "bg-surface border-line"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-ink-muted">
                      {msg.direction === "OUTBOUND" ? "From clinic" : "You"} ·{" "}
                      {msg.channel}
                    </span>
                    <span className="text-xs text-ink-faint">
                      {new Date(msg.sentAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-ink">{msg.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
