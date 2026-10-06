import { prismaUnscoped } from "@/lib/db";
import { runAsClinic } from "@/lib/tenant";
import { verifyPatientLinkToken } from "@/lib/patient-links";
import { getPatientPortal } from "@/lib/queries";
import PatientLinkClient from "./PatientLinkClient";

export const dynamic = "force-dynamic";

/**
 * The patient's page. Reached only through a signed link; nothing here is
 * guessable from a patient id. `/p` is outside the staff proxy on purpose.
 */
export default async function PatientLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await verifyPatientLinkToken(token);

  const data = link
    ? await runAsClinic(link.clinicId, async () => {
        const [portal, clinic] = await Promise.all([
          getPatientPortal(link.patientId),
          prismaUnscoped.clinic.findUnique({
            where: { id: link.clinicId },
            select: { name: true, phone: true, timezone: true },
          }),
        ]);
        return portal && clinic ? { portal, clinic } : null;
      })
    : null;

  if (!link || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-canvas">
        <div className="max-w-sm text-center space-y-2">
          <h1 className="text-lg font-semibold text-ink">This link is no longer valid</h1>
          <p className="text-sm text-ink-muted">
            Links expire after 30 days. Please message or call the clinic for a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PatientLinkClient
      token={token}
      clinic={data.clinic}
      patientFirstName={data.portal.patient.firstName}
      appointments={data.portal.appointments}
      treatmentPlans={data.portal.treatmentPlans}
      messages={data.portal.messages}
      focusAppointmentId={link.appointmentId}
    />
  );
}
