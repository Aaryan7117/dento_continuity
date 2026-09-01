import { redirect } from "next/navigation";
import { createEncounter } from "@/lib/encounters";
import { getDentistActor } from "@/lib/actors";

export const dynamic = "force-dynamic";

export default async function NewEncounterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: patientId } = await params;
  const dentist = await getDentistActor();

  const newEncounter = await createEncounter({
    patientId,
    providerId: dentist.id,
    occurredAt: new Date().toISOString(),
    summary: `Clinical Visit — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  });

  redirect(`/patients/${patientId}/encounters/${newEncounter.id}`);
}

