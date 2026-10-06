import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prismaUnscoped } from "@/lib/db";
import StaffShell from "./StaffShell";

export const dynamic = "force-dynamic";

/** proxy.ts already redirects anonymous visitors; this is the server-side belt. */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const clinic = await prismaUnscoped.clinic.findUnique({
    where: { id: session.clinicId },
    select: { name: true },
  });

  return (
    <StaffShell user={{ name: session.name, role: session.role, clinicName: clinic?.name ?? "" }}>
      {children}
    </StaffShell>
  );
}
