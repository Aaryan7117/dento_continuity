import { prisma } from "../lib/db";
import { FindingTypeSchema, ToothSurfaceSchema, AppointmentStatusSchema, MessageChannelSchema } from "./types";
import { getDentistActor } from "../lib/actors";
import { approveRecommendation as approveRec, dismissRecommendation as dismissRec } from "../lib/recommendations";
import { createToothFinding } from "../lib/tooth-findings";
import { createAppointment } from "../lib/appointments";
import { getRecoveryStats } from "../lib/recovery";
import { getChairUtilization as queryChairUtilization } from "../lib/queries";

export const TOOLS = [
  {
    name: "get_practice_summary",
    description: "Get high-level real-time metrics for DENTO Continuity practice: today's appointment count, chair utilization rate, revenue recovered, active waitlist entries, and pending retention recommendations.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "search_patients",
    description: "Search patients by name, phone number, or email address across the practice directory.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term (first name, last name, phone, or email)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_patient_chart",
    description: "Retrieve complete clinical chart for a patient: demographics, appointment history, medical/clinical notes, past encounters, active FDI odontogram tooth findings, treatment plans, and recalls.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: {
          type: "string",
          description: "UUID of the patient",
        },
      },
      required: ["patientId"],
    },
  },
  {
    name: "get_today_schedule",
    description: "List today's appointment schedule with patient details, assigned provider, scheduled procedure, appointment status, and estimated revenue value.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
          description: "Optional filter by appointment status",
        },
      },
      required: [],
    },
  },
  {
    name: "get_pending_recommendations",
    description: "List all Retention Agent draft messages waiting for clinical/receptionist approval (e.g., missed appointment recovery, overdue preventive recall).",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "approve_recommendation",
    description: "Approve a pending retention message draft for dispatch to the patient via SMS, WhatsApp, or Email, with optional text edits.",
    inputSchema: {
      type: "object",
      properties: {
        recommendationId: {
          type: "string",
          description: "UUID of the pending recommendation",
        },
        editedMessage: {
          type: "string",
          description: "Optional customized message text replacing the default draft",
        },
        channel: {
          type: "string",
          enum: ["SMS", "WHATSAPP", "EMAIL"],
          description: "Optional delivery channel override",
        },
      },
      required: ["recommendationId"],
    },
  },
  {
    name: "dismiss_recommendation",
    description: "Dismiss a pending retention recommendation if follow-up is not clinically appropriate.",
    inputSchema: {
      type: "object",
      properties: {
        recommendationId: {
          type: "string",
          description: "UUID of the recommendation to dismiss",
        },
      },
      required: ["recommendationId"],
    },
  },
  {
    name: "chart_tooth_finding",
    description: "Chart an observed finding on a specific tooth using FDI 2-digit notation (11-48 permanent, 51-85 primary) with affected surfaces and clinical notes.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: {
          type: "string",
          description: "UUID of the patient",
        },
        toothCode: {
          type: "number",
          description: "FDI 2-digit tooth code (e.g., 11 for upper right central incisor, 46 for lower right first molar)",
        },
        finding: {
          type: "string",
          enum: [
            "CARIES",
            "RESTORATION",
            "CROWN",
            "MISSING",
            "IMPLANT",
            "ENDODONTIC",
            "FRACTURE",
            "SEALANT",
            "WEAR",
            "EXTRACTION_INDICATED",
          ],
          description: "Clinical finding type",
        },
        surfaces: {
          type: "array",
          items: {
            type: "string",
            enum: ["MESIAL", "DISTAL", "OCCLUSAL", "BUCCAL", "LINGUAL"],
          },
          description: "Affected tooth surfaces (empty for whole-tooth findings like CROWN or MISSING)",
        },
        note: {
          type: "string",
          description: "Optional clinical observation notes",
        },
        encounterId: {
          type: "string",
          description: "Optional UUID of the active clinical encounter",
        },
      },
      required: ["patientId", "toothCode", "finding"],
    },
  },
  {
    name: "get_smart_waitlist",
    description: "Retrieve patients waiting for earlier appointment slots with their preferred days, times of day, and target procedures.",
    inputSchema: {
      type: "object",
      properties: {
        unfilledOnly: {
          type: "boolean",
          description: "If true (default), returns only active waiting patients who have not yet received a slot.",
        },
      },
      required: [],
    },
  },
  {
    name: "book_appointment",
    description: "Book an appointment for a patient with start/end timestamps, assigned provider, procedure reason, and estimated value.",
    inputSchema: {
      type: "object",
      properties: {
        patientId: {
          type: "string",
          description: "UUID of the patient",
        },
        startsAt: {
          type: "string",
          description: "ISO 8601 start timestamp (e.g., 2026-09-02T10:00:00Z)",
        },
        endsAt: {
          type: "string",
          description: "ISO 8601 end timestamp (e.g., 2026-09-02T10:45:00Z)",
        },
        reason: {
          type: "string",
          description: "Clinical reason or procedure description (e.g., 'Composite restoration on 24')",
        },
        providerId: {
          type: "string",
          description: "Optional UUID of the practitioner",
        },
        estimatedValue: {
          type: "number",
          description: "Optional estimated fee in currency (e.g., 450)",
        },
      },
      required: ["patientId", "startsAt", "endsAt", "reason"],
    },
  },
  {
    name: "get_chair_utilization",
    description: "Analyze clinic chair occupancy, hourly appointment density, and schedule utilization for a specific date.",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Target date in YYYY-MM-DD format (defaults to today)",
        },
      },
      required: [],
    },
  },
];

export async function handleToolCall(name: string, args: any) {
  switch (name) {
    case "get_practice_summary": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        totalPatients,
        todayAppointments,
        pendingRecommendations,
        activeWaitlist,
        recoveryStats,
      ] = await Promise.all([
        prisma.patient.count(),
        prisma.appointment.findMany({
          where: { startsAt: { gte: today, lt: tomorrow } },
          select: { id: true, status: true, estimatedValue: true },
        }),
        prisma.recommendation.count({ where: { status: "PENDING" } }),
        prisma.waitlistEntry.count({ where: { filledAt: null } }),
        getRecoveryStats(),
      ]);

      const completedCount = todayAppointments.filter((a) => a.status === "COMPLETED").length;
      const noShowCount = todayAppointments.filter((a) => a.status === "NO_SHOW").length;
      const scheduledCount = todayAppointments.filter((a) => a.status === "SCHEDULED" || a.status === "CONFIRMED").length;
      const totalEstimatedValue = todayAppointments.reduce((sum, a) => sum + (a.estimatedValue ? Number(a.estimatedValue) : 0), 0);

      return {
        totalRegisteredPatients: totalPatients,
        todaySchedule: {
          total: todayAppointments.length,
          scheduled: scheduledCount,
          completed: completedCount,
          noShow: noShowCount,
          estimatedDayValue: `₹${totalEstimatedValue.toLocaleString("en-IN")}`,
        },
        retentionQueue: {
          pendingApprovals: pendingRecommendations,
        },
        smartWaitlist: {
          waitingPatients: activeWaitlist,
        },
        revenueRecovery: {
          recoveredAppointments: recoveryStats.recoveredAppointmentCount,
          revenueRecovered: `₹${recoveryStats.revenueRecovered.toLocaleString("en-IN")}`,
        },
      };
    }

    case "search_patients": {
      const query = (args.query || "").trim();
      const limit = Math.min(args.limit || 10, 50);

      if (!query) {
        return { count: 0, patients: [] };
      }

      const rows = await prisma.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });

      return {
        count: rows.length,
        patients: rows.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
          phone: p.phone,
          email: p.email,
          dateOfBirth: p.dateOfBirth.toISOString().split("T")[0],
          consentGiven: p.consentGiven,
        })),
      };
    }

    case "get_patient_chart": {
      const patientId = args.patientId;
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          appointments: {
            orderBy: { startsAt: "desc" },
            take: 10,
            include: { provider: { select: { name: true, role: true } } },
          },
          encounters: {
            orderBy: { occurredAt: "desc" },
            take: 10,
            include: {
              provider: { select: { name: true } },
              notes: { select: { id: true, body: true, signed: true, signedAt: true } },
            },
          },
          toothFindings: {
            where: { resolvedAt: null },
            orderBy: { toothCode: "asc" },
            include: { chartedBy: { select: { name: true } } },
          },
          treatmentPlans: {
            orderBy: { createdAt: "desc" },
            include: { dentist: { select: { name: true } } },
          },
          recalls: {
            orderBy: { dueAt: "asc" },
          },
        },
      });

      if (!patient) {
        throw new Error(`Patient not found with ID: ${patientId}`);
      }

      return {
        demographics: {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          phone: patient.phone,
          email: patient.email,
          dateOfBirth: patient.dateOfBirth.toISOString().split("T")[0],
          address: patient.address,
          consentGiven: patient.consentGiven,
        },
        activeOdontogramFindings: patient.toothFindings.map((tf) => ({
          toothCode: tf.toothCode,
          finding: tf.finding,
          surfaces: tf.surfaces,
          note: tf.note,
          chartedAt: tf.chartedAt.toISOString(),
          chartedBy: tf.chartedBy?.name ?? "Staff",
        })),
        treatmentPlans: patient.treatmentPlans.map((tp) => ({
          id: tp.id,
          title: tp.title,
          status: tp.status,
          billingStatus: tp.billingStatus,
          estimatedCost: tp.estimatedCost ? `₹${Number(tp.estimatedCost).toLocaleString("en-IN")}` : null,
          proposedAt: tp.proposedAt.toISOString(),
        })),
        recentEncounters: patient.encounters.map((e) => ({
          id: e.id,
          date: e.occurredAt.toISOString(),
          provider: e.provider?.name ?? "Provider",
          summary: e.summary,
          notes: e.notes.map((n) => ({
            id: n.id,
            body: n.body,
            signed: n.signed,
          })),
        })),
        recentAppointments: patient.appointments.map((a) => ({
          id: a.id,
          startsAt: a.startsAt.toISOString(),
          status: a.status,
          reason: a.reason,
          provider: a.provider?.name ?? "Provider",
          estimatedValue: a.estimatedValue ? `₹${Number(a.estimatedValue).toLocaleString("en-IN")}` : null,
        })),
        recalls: patient.recalls.map((r) => ({
          id: r.id,
          dueAt: r.dueAt.toISOString().split("T")[0],
          reason: r.reason,
          completedAt: r.completedAt ? r.completedAt.toISOString().split("T")[0] : null,
        })),
      };
    }

    case "get_today_schedule": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const whereClause: any = {
        startsAt: { gte: today, lt: tomorrow },
      };

      if (args.status) {
        whereClause.status = args.status;
      }

      const rows = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          patient: true,
          provider: true,
          recommendations: { where: { status: "PENDING" }, select: { id: true } },
        },
        orderBy: { startsAt: "asc" },
      });

      return {
        date: today.toISOString().split("T")[0],
        totalCount: rows.length,
        appointments: rows.map((a) => ({
          id: a.id,
          patientId: a.patientId,
          patientName: `${a.patient.firstName} ${a.patient.lastName}`,
          patientPhone: a.patient.phone,
          time: new Date(a.startsAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt.toISOString(),
          status: a.status,
          reason: a.reason ?? "Consultation",
          provider: a.provider?.name ?? "Unassigned",
          estimatedValue: a.estimatedValue ? `₹${Number(a.estimatedValue).toLocaleString("en-IN")}` : null,
          hasPendingRecommendation: a.recommendations.length > 0,
        })),
      };
    }

    case "get_pending_recommendations": {
      const rows = await prisma.recommendation.findMany({
        where: { status: "PENDING" },
        include: {
          patient: true,
          appointment: { include: { provider: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        pendingCount: rows.length,
        recommendations: rows.map((r) => ({
          id: r.id,
          patientId: r.patientId,
          patientName: `${r.patient.firstName} ${r.patient.lastName}`,
          patientPhone: r.patient.phone,
          reason: r.reason,
          draftMessage: r.draftMessage,
          channel: r.channel,
          appointmentContext: r.appointment
            ? {
                date: r.appointment.startsAt.toISOString(),
                reason: r.appointment.reason,
                status: r.appointment.status,
                provider: r.appointment.provider?.name,
              }
            : null,
          createdAt: r.createdAt.toISOString(),
        })),
      };
    }

    case "approve_recommendation": {
      const { recommendationId, editedMessage, channel } = args;
      const result = await approveRec(recommendationId, {
        editedMessage,
        channel,
      });

      if (!result.ok) {
        throw new Error(`Failed to approve recommendation (${(result as any).reason || "unknown reason"})`);
      }

      return {
        success: true,
        recommendationId,
        message: "Recommendation approved. Outbound message queued and audit event recorded.",
      };
    }

    case "dismiss_recommendation": {
      const { recommendationId } = args;
      const result = await dismissRec(recommendationId);

      if (!result.ok) {
        throw new Error(`Failed to dismiss recommendation (${(result as any).reason || "unknown reason"})`);
      }

      return {
        success: true,
        recommendationId,
        message: "Recommendation dismissed and removed from active queue.",
      };
    }

    case "chart_tooth_finding": {
      const { patientId, toothCode, finding, surfaces = [], note, encounterId } = args;
      const dentistActor = await getDentistActor();
      const result = await createToothFinding(
        {
          patientId,
          toothCode,
          finding,
          surfaces,
          note,
          encounterId,
        },
        dentistActor
      );

      return {
        success: true,
        findingId: result.id,
        toothCode: result.toothCode,
        finding: result.finding,
        surfaces: result.surfaces,
        note: result.note,
        chartedAt: result.chartedAt,
        message: `Tooth FDI #${toothCode} successfully charted with ${finding}.`,
      };
    }

    case "get_smart_waitlist": {
      const unfilledOnly = args.unfilledOnly !== false;
      const rows = await prisma.waitlistEntry.findMany({
        where: unfilledOnly ? { filledAt: null } : {},
        include: { patient: true },
        orderBy: { addedAt: "asc" },
      });

      return {
        count: rows.length,
        entries: rows.map((w) => ({
          id: w.id,
          patientId: w.patientId,
          patientName: `${w.patient.firstName} ${w.patient.lastName}`,
          patientPhone: w.patient.phone,
          preferredDays: w.preferredDays,
          preferredTime: w.preferredTime,
          procedureType: w.procedureType,
          estimatedMins: w.estimatedMins,
          note: w.note,
          addedAt: w.addedAt.toISOString(),
          isFilled: !!w.filledAt,
        })),
      };
    }

    case "book_appointment": {
      const { patientId, startsAt, endsAt, reason, providerId, estimatedValue } = args;
      const created = await createAppointment({
        patientId,
        providerId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        reason,
        estimatedValue,
      });

      return {
        success: true,
        appointmentId: created.id,
        startsAt: created.startsAt,
        endsAt: created.endsAt,
        reason: created.reason,
        status: created.status,
        message: `Appointment successfully booked for ${new Date(startsAt).toLocaleTimeString()} on ${new Date(startsAt).toDateString()}.`,
      };
    }

    case "get_chair_utilization": {
      const targetDate = args.date ? new Date(args.date) : new Date();
      const utilization = await queryChairUtilization(targetDate);
      return utilization;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
