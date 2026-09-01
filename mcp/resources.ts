import { prisma } from "../lib/db";
import { getRecoveryStats } from "../lib/recovery";

export const RESOURCES = [
  {
    uri: "dento://clinic/summary",
    name: "Clinic Realtime Performance Summary",
    mimeType: "application/json",
    description: "Live real-time KPI overview: registered patients, today's appointments, retention recovery queue, and recovered revenue.",
  },
  {
    uri: "dento://schedule/today",
    name: "Today's Clinical Appointment Schedule",
    mimeType: "application/json",
    description: "Full schedule for today with patient names, procedures, providers, and statuses.",
  },
  {
    uri: "dento://continuity/queue",
    name: "Retention Agent Action Queue",
    mimeType: "application/json",
    description: "Pending retention recovery messages awaiting clinic staff approval.",
  },
  {
    uri: "dento://reference/fdi-notation",
    name: "FDI 2-Digit Dental Notation Reference",
    mimeType: "text/markdown",
    description: "Standard FDI World Dental Federation two-digit tooth numbering and surface nomenclature reference.",
  },
];

export async function handleResourceRead(uri: string) {
  switch (uri) {
    case "dento://clinic/summary": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [patientCount, todayAppointments, pendingRecs, waitlistCount, recovery] = await Promise.all([
        prisma.patient.count(),
        prisma.appointment.findMany({ where: { startsAt: { gte: today, lt: tomorrow } } }),
        prisma.recommendation.count({ where: { status: "PENDING" } }),
        prisma.waitlistEntry.count({ where: { filledAt: null } }),
        getRecoveryStats(),
      ]);

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            totalPatients: patientCount,
            todayAppointments: todayAppointments.length,
            completedToday: todayAppointments.filter((a) => a.status === "COMPLETED").length,
            noShowToday: todayAppointments.filter((a) => a.status === "NO_SHOW").length,
            pendingRetentionApprovals: pendingRecs,
            activeWaitlistCount: waitlistCount,
            recoveredAppointments: recovery.recoveredAppointmentCount,
            revenueRecovered: `₹${recovery.revenueRecovered.toLocaleString("en-IN")}`,
          },
          null,
          2
        ),
      };
    }

    case "dento://schedule/today": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const rows = await prisma.appointment.findMany({
        where: { startsAt: { gte: today, lt: tomorrow } },
        include: { patient: true, provider: true },
        orderBy: { startsAt: "asc" },
      });

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          rows.map((a) => ({
            id: a.id,
            time: new Date(a.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            patient: `${a.patient.firstName} ${a.patient.lastName}`,
            phone: a.patient.phone,
            procedure: a.reason ?? "Consultation",
            provider: a.provider?.name ?? "Staff",
            status: a.status,
            estimatedValue: a.estimatedValue ? `₹${Number(a.estimatedValue).toLocaleString("en-IN")}` : null,
          })),
          null,
          2
        ),
      };
    }

    case "dento://continuity/queue": {
      const rows = await prisma.recommendation.findMany({
        where: { status: "PENDING" },
        include: { patient: true, appointment: true },
        orderBy: { createdAt: "desc" },
      });

      return {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          rows.map((r) => ({
            id: r.id,
            patient: `${r.patient.firstName} ${r.patient.lastName}`,
            reason: r.reason,
            draftMessage: r.draftMessage,
            channel: r.channel,
            createdAt: r.createdAt.toISOString(),
          })),
          null,
          2
        ),
      };
    }

    case "dento://reference/fdi-notation": {
      return {
        uri,
        mimeType: "text/markdown",
        text: `# FDI Two-Digit Dental Numbering System Reference

## Permanent Dentition (Quadrants 1 to 4)
- **Quadrant 1 (Upper Right):** 18 (3rd molar) to 11 (central incisor)
- **Quadrant 2 (Upper Left):** 21 (central incisor) to 28 (3rd molar)
- **Quadrant 3 (Lower Left):** 31 (central incisor) to 38 (3rd molar)
- **Quadrant 4 (Lower Right):** 41 (central incisor) to 48 (3rd molar)

## Primary / Deciduous Dentition (Quadrants 5 to 8)
- **Quadrant 5 (Upper Right Primary):** 55 to 51
- **Quadrant 6 (Upper Left Primary):** 61 to 65
- **Quadrant 7 (Lower Left Primary):** 71 to 75
- **Quadrant 8 (Lower Right Primary):** 81 to 85

## Anatomical Tooth Surfaces
- **MESIAL (M):** Surface facing towards the midline of the dental arch.
- **DISTAL (D):** Surface facing away from the midline.
- **OCCLUSAL (O):** Chewing surface of posterior teeth (premolars and molars) / Incisal edge on anterior teeth.
- **BUCCAL (B):** Surface facing the cheeks or lips (also termed Labial/Facial on anteriors).
- **LINGUAL (L):** Surface facing the tongue (also termed Palatal on maxillary teeth).
`,
      };
    }

    default:
      throw new Error(`Unknown resource URI: ${uri}`);
  }
}
