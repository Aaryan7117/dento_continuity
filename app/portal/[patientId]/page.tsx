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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-gray-500">Patient Portal</p>
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome, {portal.patient.firstName}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-6 space-y-8">
        {/* Upcoming Appointments */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Upcoming Appointments
          </h2>
          {upcomingAppointments.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-400 text-center">
              No upcoming appointments
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
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
                      <p className="text-sm text-gray-500">{apt.reason}</p>
                    )}
                    {apt.providerName && (
                      <p className="text-xs text-gray-400">
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
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Past Appointments
            </h2>
            <div className="space-y-2">
              {pastAppointments.slice(0, 10).map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-700">
                      {new Date(apt.startsAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </p>
                    {apt.reason && (
                      <p className="text-xs text-gray-500">{apt.reason}</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Treatment Plans
          </h2>
          {portal.treatmentPlans.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-400 text-center">
              No treatment plans
            </div>
          ) : (
            <div className="space-y-2">
              {portal.treatmentPlans.map((tp) => (
                <div
                  key={tp.id}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {tp.title}
                    </p>
                    <div className="flex gap-2">
                      <StatusBadge status={tp.status} />
                      <StatusBadge status={tp.billingStatus} />
                    </div>
                  </div>
                  {tp.estimatedCost != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Estimated: ₦{tp.estimatedCost.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Messages */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Messages
          </h2>
          {portal.messages.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-400 text-center">
              No messages
            </div>
          ) : (
            <div className="space-y-2">
              {portal.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`border rounded-lg p-3 ${
                    msg.direction === "OUTBOUND"
                      ? "bg-blue-50 border-blue-100"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">
                      {msg.direction === "OUTBOUND" ? "From clinic" : "You"} ·{" "}
                      {msg.channel}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.sentAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{msg.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
