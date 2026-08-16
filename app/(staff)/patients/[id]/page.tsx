import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatientDetail } from "@/lib/queries";
import StatusBadge from "@/app/components/StatusBadge";
import OdontogramChart from "@/app/components/OdontogramChart";
import TreatmentPlanActions from "@/app/components/TreatmentPlanActions";
import PatientDetailTabs from "@/app/components/PatientDetailTabs";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  Activity,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PatientChartPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatientDetail(id);
  if (!patient) notFound();

  const upcomingAppointments = patient.appointments.filter(
    (a) =>
      new Date(a.startsAt) >= new Date() ||
      a.status === "SCHEDULED" ||
      a.status === "CONFIRMED"
  );
  const pastAppointments = patient.appointments.filter(
    (a) =>
      a.status === "COMPLETED" ||
      a.status === "NO_SHOW" ||
      a.status === "CANCELLED"
  );

  return (
    <div className="space-y-6">
      {/* Patient header */}
      <div className="card p-6 lg:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden section-enter">
        <div className="flex items-center gap-5 relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #019d8e, #0d524d)",
              boxShadow: "0 4px 12px rgba(1, 157, 142, 0.25)",
            }}
          >
            {patient.firstName[0]}
            {patient.lastName[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                {patient.dateOfBirth}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                {patient.phone}
              </span>
              {patient.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                  {patient.email}
                </span>
              )}
              {patient.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                  {patient.address}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative z-10 w-full md:w-auto">
          <div
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold"
            style={{
              background: patient.consentGiven
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
              color: patient.consentGiven ? "#047857" : "#b91c1c",
              border: `1px solid ${
                patient.consentGiven
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(239, 68, 68, 0.15)"
              }`,
            }}
            data-no-press
          >
            {patient.consentGiven ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Consent on File
              </>
            ) : (
              "Missing Consent"
            )}
          </div>
          <Link
            href={`/patients/${id}/encounters/new`}
            className="flex items-center justify-center gap-1.5 text-white text-sm font-semibold py-2.5 px-5 rounded-xl"
            style={{
              background: "linear-gradient(135deg, #019d8e, #067d73)",
              transition: "opacity 150ms var(--ease-out)",
            }}
          >
            <Activity className="w-4 h-4" />
            Start Encounter
          </Link>
        </div>
      </div>

      {/* Tabbed content */}
      <PatientDetailTabs
        patientId={id}
        patient={patient}
        upcomingAppointments={upcomingAppointments}
        pastAppointments={pastAppointments}
      />
    </div>
  );
}
