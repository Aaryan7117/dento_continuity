import { getPatients, getRecallsDue, getOutstandingBalances } from "@/lib/queries";
import PatientDirectoryClient from "./PatientDirectoryClient";

export const dynamic = "force-dynamic";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const [patients, recalls, balances] = await Promise.all([
    getPatients(),
    getRecallsDue(),
    getOutstandingBalances(),
  ]);

  return (
    <PatientDirectoryClient
      initialPatients={patients}
      recalls={recalls}
      balances={balances}
      initialTab={tab || "directory"}
    />
  );
}
