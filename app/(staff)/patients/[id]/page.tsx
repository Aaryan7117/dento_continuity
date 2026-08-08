import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatientDetail } from "@/lib/queries";
import StatusBadge from "@/app/components/StatusBadge";
import OdontogramChart from "@/app/components/OdontogramChart";
import TreatmentPlanActions from "@/app/components/TreatmentPlanActions";

export default async function PatientChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatientDetail(id);
  if (!patient) notFound();

  const upcomingAppointments = patient.appointments.filter(
    (a) => new Date(a.startsAt) >= new Date() || a.status === "SCHEDULED" || a.status === "CONFIRMED"
  );
  const pastAppointments = patient.appointments.filter(
    (a) => a.status === "COMPLETED" || a.status === "NO_SHOW" || a.status === "CANCELLED"
  );

  return (
    <div className="space-y-6">
      {/* Patient header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>DOB: {patient.dateOfBirth}</span>
            <span>{patient.phone}</span>
            {patient.email && <span>{patient.email}</span>}
          </div>
          {patient.address && (
            <p className="text-sm text-gray-400 mt-0.5">{patient.address}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              patient.consentGiven
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {patient.consentGiven ? "Consent ✓" : "No consent"}
          </span>
          <Link
            href={`/patients/${id}/encounters/new`}
            className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Encounter
          </Link>
          <Link
            href={`/patients/${id}/treatment-plans/new`}
            className="bg-gray-100 text-gray-700 text-sm font-medium py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
          >
            New Plan
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column: Odontogram + Findings */}
        <div className="col-span-2 space-y-6">
          {/* Odontogram */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Odontogram</h2>
            <OdontogramChart findings={patient.toothFindings} />
          </div>

          {/* Treatment Plans */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Treatment Plans</h2>
            {patient.treatmentPlans.length === 0 ? (
              <p className="text-sm text-gray-400">No treatment plans</p>
            ) : (
              <div className="space-y-2">
                {patient.treatmentPlans.map((tp) => (
                  <div
                    key={tp.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {tp.title}
                      </p>
                      {tp.description && (
                        <p className="text-xs text-gray-500 mt-0.5 max-w-lg truncate">
                          {tp.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={tp.status} />
                        <StatusBadge status={tp.billingStatus} />
                        {tp.estimatedCost != null && (
                          <span className="text-xs text-gray-500">
                            ₦{tp.estimatedCost.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <TreatmentPlanActions plan={tp} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recalls */}
          {patient.recalls.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Recalls</h2>
              <div className="space-y-2">
                {patient.recalls.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm text-gray-900">{r.reason ?? "Scheduled recall"}</p>
                      <p className="text-xs text-gray-500">
                        Due: {new Date(r.dueAt).toLocaleDateString()}
                      </p>
                    </div>
                    {r.completedAt ? (
                      <span className="text-xs text-green-600 font-medium">✓ Done</span>
                    ) : (
                      <span className={`text-xs font-medium ${
                        new Date(r.dueAt) < new Date() ? "text-red-600" : "text-amber-600"
                      }`}>
                        {new Date(r.dueAt) < new Date() ? "Overdue" : "Upcoming"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: History + Messages */}
        <div className="space-y-6">
          {/* Upcoming appointments */}
          {upcomingAppointments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Upcoming</h2>
              <div className="space-y-1.5">
                {upcomingAppointments.slice(0, 5).map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white border border-gray-200 rounded p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-900">
                        {new Date(apt.startsAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" "}
                        {new Date(apt.startsAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>
                    {apt.reason && (
                      <p className="text-xs text-gray-500 mt-0.5">{apt.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past visits */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-2">Visit History</h2>
            {pastAppointments.length === 0 ? (
              <p className="text-xs text-gray-400">No past visits</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {pastAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-white border border-gray-200 rounded p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {new Date(apt.startsAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>
                    {apt.reason && (
                      <p className="text-xs text-gray-500 mt-0.5">{apt.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent messages */}
          {patient.recentMessages.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Messages</h2>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {patient.recentMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded p-2.5 text-xs ${
                      m.direction === "OUTBOUND"
                        ? "bg-blue-50 border border-blue-100"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-gray-600">
                        {m.direction === "OUTBOUND" ? "Sent" : "Received"} · {m.channel}
                      </span>
                      <span className="text-gray-400">
                        {new Date(m.sentAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 line-clamp-2">{m.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
