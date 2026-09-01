import { notFound } from "next/navigation";
import { getEncounterDetail, getPatientDetail } from "@/lib/queries";
import EncounterWorkspaceClient from "./EncounterWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function EncounterDetailPage({
  params,
}: {
  params: Promise<{ id: string; encounterId: string }>;
}) {
  const { id: patientId, encounterId } = await params;
  const [encounter, patient] = await Promise.all([
    getEncounterDetail(encounterId),
    getPatientDetail(patientId),
  ]);

  if (!encounter || !patient) notFound();

  return (
    <EncounterWorkspaceClient
      encounter={encounter}
      patient={patient}
      allPatientFindings={patient.toothFindings}
    />
  );
}

