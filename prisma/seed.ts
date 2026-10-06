import "dotenv/config";
import {
  Role,
  AppointmentStatus,
  FindingType,
  ToothSurface,
  ImageKind,
  TreatmentPlanStatus,
  BillingStatus,
  RecommendationStatus,
  MessageChannel,
  MessageDirection,
} from "../app/generated/prisma/client";
import type { AuditAction } from "../lib/audit";

const auditAction = (action: AuditAction) => action;

import { prisma, prismaUnscoped } from "../lib/db";
import { runAsClinic } from "../lib/tenant";
import { hashPassword } from "../lib/auth";

/// The seed targets one clinic; it is created if missing so a fresh database works.
const SEED_CLINIC = { slug: "demo", name: "DENTO Demo Clinic" };

const DAY = 24 * 60 * 60 * 1000;

/// Anchored to midnight so "today's schedule" is stable regardless of run time.
const today = new Date();
today.setHours(0, 0, 0, 0);

function at(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(today.getTime() + dayOffset * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dob(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

async function reset() {
  await prisma.auditEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.recall.deleteMany();
  await prisma.treatmentPlan.deleteMany();
  await prisma.image.deleteMany();
  await prisma.toothFinding.deleteMany();
  await prisma.note.deleteMany();
  await prisma.encounter.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
}

const PATIENTS = [
  { firstName: "Amara",   lastName: "Okonkwo",  dateOfBirth: dob(1986, 3, 14),  phone: "+234 802 445 1120", email: "amara.okonkwo@example.com" },
  { firstName: "Tobiloba", lastName: "Adeyemi", dateOfBirth: dob(1974, 11, 2),  phone: "+234 803 991 7745", email: "t.adeyemi@example.com" },
  { firstName: "Chiamaka", lastName: "Eze",     dateOfBirth: dob(1995, 6, 21),  phone: "+234 805 210 3388", email: "chiamaka.eze@example.com" },
  { firstName: "Ifeanyi", lastName: "Nwosu",    dateOfBirth: dob(1968, 1, 30),  phone: "+234 806 774 5521", email: null },
  { firstName: "Zainab",  lastName: "Bello",    dateOfBirth: dob(1990, 9, 8),   phone: "+234 807 332 9014", email: "zainab.bello@example.com" },
  { firstName: "Emeka",   lastName: "Obi",      dateOfBirth: dob(2001, 4, 17),  phone: "+234 808 665 2277", email: "emeka.obi@example.com" },
  { firstName: "Folake",  lastName: "Adebayo",  dateOfBirth: dob(1982, 12, 5),  phone: "+234 809 118 4463", email: "folake.a@example.com" },
  { firstName: "Suleiman", lastName: "Yusuf",   dateOfBirth: dob(1979, 7, 25),  phone: "+234 810 447 8890", email: null },
  { firstName: "Ngozi",   lastName: "Okafor",   dateOfBirth: dob(1993, 2, 11),  phone: "+234 811 903 5546", email: "ngozi.okafor@example.com" },
  { firstName: "Babatunde", lastName: "Salami", dateOfBirth: dob(1965, 8, 3),   phone: "+234 812 556 1178", email: "b.salami@example.com" },
  { firstName: "Halima",  lastName: "Ibrahim",  dateOfBirth: dob(2010, 5, 19),  phone: "+234 813 229 6634", email: null },
  { firstName: "Chidinma", lastName: "Uche",    dateOfBirth: dob(1988, 10, 27), phone: "+234 814 771 3309", email: "chidinma.uche@example.com" },
  { firstName: "Olumide", lastName: "Fashola",  dateOfBirth: dob(1997, 1, 9),   phone: "+234 815 384 7752", email: "olumide.f@example.com" },
  { firstName: "Aisha",   lastName: "Garba",    dateOfBirth: dob(1971, 4, 23),  phone: "+234 816 640 2295", email: "aisha.garba@example.com" },
  { firstName: "Kelechi", lastName: "Anyanwu",  dateOfBirth: dob(2005, 11, 16), phone: "+234 817 052 8871", email: null },
  { firstName: "Yewande", lastName: "Ogunleye", dateOfBirth: dob(1984, 6, 30),  phone: "+234 818 495 6613", email: "yewande.o@example.com" },
  { firstName: "Ikenna",  lastName: "Madu",     dateOfBirth: dob(1992, 3, 4),   phone: "+234 819 738 1140", email: "ikenna.madu@example.com" },
];

/// The no-show the whole demo hangs on. Kept separate so the golden path never
/// depends on ordering inside PATIENTS.
const DEMO_PATIENT = {
  firstName: "Marcus",
  lastName: "Delgado",
  dateOfBirth: dob(1981, 5, 12),
  phone: "+234 801 224 7788",
  email: "marcus.delgado@example.com",
  address: "17 Bourdillon Road, Ikoyi, Lagos",
};

/// Every seeded staff account gets the same dev password (override with SEED_PASSWORD).
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "dento-demo-2026";

async function main(clinicId: string) {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  await reset();

  const drAdeleke = await prisma.user.create({
    data: { clinicId, name: "Dr. Simisola Adeleke", email: "s.adeleke@dentocontinuity.demo", role: Role.DENTIST, passwordHash },
  });
  const drNnamdi = await prisma.user.create({
    data: { clinicId, name: "Dr. Nnamdi Chukwu", email: "n.chukwu@dentocontinuity.demo", role: Role.DENTIST, passwordHash },
  });
  const frontDesk = await prisma.user.create({
    data: { clinicId, name: "Blessing Adeniyi", email: "front.desk@dentocontinuity.demo", role: Role.FRONT_DESK, passwordHash },
  });

  const dentists = [drAdeleke, drNnamdi];

  // ---------------------------------------------------------------------------
  // General patient population
  // ---------------------------------------------------------------------------
  const patients = [];
  for (let i = 0; i < PATIENTS.length; i++) {
    const p = PATIENTS[i];
    const consented = i % 7 !== 0;
    patients.push(
      await prisma.patient.create({
        data: { clinicId,
          ...p,
          consentGiven: consented,
          consentAt: consented ? at(-200 + i * 6, 9, 15) : null,
        },
      }),
    );
  }

  // Past visits with signed notes, spread across the last few months.
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    const provider = dentists[i % 2];
    const visitDay = -150 + i * 8;

    const appointment = await prisma.appointment.create({
      data: { clinicId,
        patientId: patient.id,
        providerId: provider.id,
        startsAt: at(visitDay, 10 + (i % 6)),
        endsAt: at(visitDay, 10 + (i % 6), 45),
        status: AppointmentStatus.COMPLETED,
        reason: "Routine examination and scale",
        estimatedValue: 120,
      },
    });

    const encounter = await prisma.encounter.create({
      data: { clinicId,
        patientId: patient.id,
        appointmentId: appointment.id,
        providerId: provider.id,
        occurredAt: at(visitDay, 10 + (i % 6), 5),
        summary: "Routine recall examination.",
      },
    });

    await prisma.note.create({
      data: { clinicId,
        encounterId: encounter.id,
        authorId: provider.id,
        body:
          "Soft tissues healthy. Calculus on lower anteriors, scaled and polished. " +
          "Oral hygiene instruction reinforced. Patient reports no pain or sensitivity.",
        signed: true,
        signedAt: at(visitDay, 11, 30),
      },
    });
  }

  // Odontogram findings on a subset — sparse by design, healthy teeth have no rows.
  const findingSpread: Array<{ tooth: number; finding: FindingType; surfaces: ToothSurface[] }> = [
    { tooth: 16, finding: FindingType.CARIES, surfaces: [ToothSurface.OCCLUSAL] },
    { tooth: 26, finding: FindingType.RESTORATION, surfaces: [ToothSurface.OCCLUSAL, ToothSurface.MESIAL] },
    { tooth: 36, finding: FindingType.ENDODONTIC, surfaces: [] },
    { tooth: 47, finding: FindingType.MISSING, surfaces: [] },
    { tooth: 24, finding: FindingType.SEALANT, surfaces: [ToothSurface.OCCLUSAL] },
    { tooth: 11, finding: FindingType.FRACTURE, surfaces: [ToothSurface.BUCCAL] },
  ];

  for (let i = 0; i < patients.length; i += 2) {
    const spread = findingSpread[(i / 2) % findingSpread.length];
    await prisma.toothFinding.create({
      data: { clinicId,
        patientId: patients[i].id,
        chartedById: dentists[i % 2].id,
        toothCode: spread.tooth,
        finding: spread.finding,
        surfaces: spread.surfaces,
        chartedAt: at(-140 + i * 8, 10, 30),
      },
    });
  }

  // Treatment plans across all three states, with varied billing.
  const planSpecs = [
    { idx: 0, title: "Composite restoration — upper right first molar", status: TreatmentPlanStatus.PROPOSED,  billing: BillingStatus.PENDING, cost: 310 },
    { idx: 2, title: "Root canal therapy — lower left first molar",     status: TreatmentPlanStatus.ACCEPTED,  billing: BillingStatus.PENDING, cost: 890 },
    { idx: 4, title: "Scale, polish and fluoride course",               status: TreatmentPlanStatus.COMPLETED, billing: BillingStatus.PAID,    cost: 180 },
    { idx: 6, title: "Porcelain crown — upper left central incisor",    status: TreatmentPlanStatus.ACCEPTED,  billing: BillingStatus.OVERDUE, cost: 1250 },
    { idx: 8, title: "Extraction — lower right third molar",            status: TreatmentPlanStatus.COMPLETED, billing: BillingStatus.PAID,    cost: 420 },
    { idx: 10, title: "Fissure sealants — permanent molars",            status: TreatmentPlanStatus.PROPOSED,  billing: BillingStatus.PENDING, cost: 240 },
    { idx: 12, title: "Two-surface amalgam replacement",                status: TreatmentPlanStatus.ACCEPTED,  billing: BillingStatus.PENDING, cost: 365 },
  ];

  for (const spec of planSpecs) {
    const plan = await prisma.treatmentPlan.create({
      data: { clinicId,
        patientId: patients[spec.idx].id,
        dentistId: dentists[spec.idx % 2].id,
        title: spec.title,
        status: spec.status,
        billingStatus: spec.billing,
        estimatedCost: spec.cost,
        proposedAt: at(-90 + spec.idx, 11),
        acceptedAt: spec.status === TreatmentPlanStatus.PROPOSED ? null : at(-85 + spec.idx, 11),
        completedAt: spec.status === TreatmentPlanStatus.COMPLETED ? at(-40 + spec.idx, 11) : null,
      },
    });

    await prisma.recall.create({
      data: { clinicId,
        patientId: patients[spec.idx].id,
        treatmentPlanId: plan.id,
        dueAt: at(20 + spec.idx * 5, 9),
        reason: "Six-month review",
      },
    });
  }

  // Upcoming appointments, including a handful on today's schedule.
  const upcoming = [
    { idx: 1,  day: 0, hour: 8,  status: AppointmentStatus.COMPLETED, reason: "Scale and polish",            value: 120 },
    { idx: 3,  day: 0, hour: 11, status: AppointmentStatus.CONFIRMED, reason: "Filling — lower left",        value: 310 },
    { idx: 5,  day: 0, hour: 14, status: AppointmentStatus.SCHEDULED, reason: "Consultation",                value: 90 },
    { idx: 7,  day: 0, hour: 16, status: AppointmentStatus.SCHEDULED, reason: "Review — post extraction",    value: 90 },
    { idx: 9,  day: 1, hour: 9,  status: AppointmentStatus.CONFIRMED, reason: "Root canal — visit 1",        value: 540 },
    { idx: 11, day: 2, hour: 10, status: AppointmentStatus.SCHEDULED, reason: "Fissure sealants",            value: 240 },
    { idx: 13, day: 3, hour: 15, status: AppointmentStatus.SCHEDULED, reason: "Crown fitting",               value: 1250 },
    { idx: 15, day: 6, hour: 12, status: AppointmentStatus.SCHEDULED, reason: "Routine examination",         value: 120 },
  ];

  for (const u of upcoming) {
    await prisma.appointment.create({
      data: { clinicId,
        patientId: patients[u.idx].id,
        providerId: dentists[u.idx % 2].id,
        startsAt: at(u.day, u.hour),
        endsAt: at(u.day, u.hour, 45),
        status: u.status,
        reason: u.reason,
        estimatedValue: u.value,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Prior recoveries — give the dashboard a non-zero baseline before the demo runs.
  // ---------------------------------------------------------------------------
  for (const past of [
    { idx: 2, missedDay: -45, rebookedDay: -38, value: 540 },
    { idx: 14, missedDay: -21, rebookedDay: -13, value: 310 },
  ]) {
    const patient = patients[past.idx];

    const missed = await prisma.appointment.create({
      data: { clinicId,
        patientId: patient.id,
        providerId: drAdeleke.id,
        startsAt: at(past.missedDay, 10),
        endsAt: at(past.missedDay, 10, 45),
        status: AppointmentStatus.NO_SHOW,
        reason: "Treatment appointment",
        estimatedValue: past.value,
      },
    });

    await prisma.appointment.create({
      data: { clinicId,
        patientId: patient.id,
        providerId: drAdeleke.id,
        startsAt: at(past.rebookedDay, 10),
        endsAt: at(past.rebookedDay, 10, 45),
        status: AppointmentStatus.COMPLETED,
        reason: "Treatment appointment (rebooked)",
        estimatedValue: past.value,
        rebookedFromId: missed.id,
      },
    });

    const rec = await prisma.recommendation.create({
      data: { clinicId,
        patientId: patient.id,
        appointmentId: missed.id,
        status: RecommendationStatus.SENT,
        reason: "Missed a treatment appointment with an active plan in progress.",
        draftMessage: `Hello ${patient.firstName}, we missed you at your appointment. Would you like us to find you another slot this week?`,
        channel: MessageChannel.SMS,
        approvedById: frontDesk.id,
        approvedAt: at(past.missedDay, 14),
        sentAt: at(past.missedDay, 14, 1),
      },
    });

    await prisma.message.create({
      data: { clinicId,
        patientId: patient.id,
        recommendationId: rec.id,
        sentById: frontDesk.id,
        channel: MessageChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        body: rec.draftMessage,
        sentAt: at(past.missedDay, 14, 1),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // The demo case: Marcus Delgado, mid-treatment, no-showed this morning.
  // ---------------------------------------------------------------------------
  const marcus = await prisma.patient.create({
    data: { clinicId, ...DEMO_PATIENT, consentGiven: true, consentAt: at(-730, 9, 20) },
  });

  const marcusHistory = [
    { day: -730, reason: "New patient examination and radiographs", value: 180, note: "Full charting completed. Moderate calculus. Two carious lesions identified on upper right quadrant. Radiographs taken." },
    { day: -540, reason: "Scale, polish and oral hygiene review",   value: 120, note: "Good response to hygiene instruction. Calculus reduced. Carious lesions stable, monitoring." },
    { day: -300, reason: "Composite restoration — upper right",     value: 340, note: "Two-surface composite placed on 16. Occlusion checked and adjusted. Patient tolerated well." },
    { day: -120, reason: "Six-month recall examination",            value: 120, note: "Restoration on 16 intact. Discussed crown for 26 given extent of existing restoration and cusp fracture risk." },
    { day: -45,  reason: "Crown preparation — visit 1 of 3",        value: 620, note: "Tooth 26 prepared for full porcelain crown. Impressions taken, temporary crown cemented. Shade A2 selected." },
  ];

  for (const visit of marcusHistory) {
    const appointment = await prisma.appointment.create({
      data: { clinicId,
        patientId: marcus.id,
        providerId: drAdeleke.id,
        startsAt: at(visit.day, 9, 30),
        endsAt: at(visit.day, 10, 30),
        status: AppointmentStatus.COMPLETED,
        reason: visit.reason,
        estimatedValue: visit.value,
      },
    });

    const encounter = await prisma.encounter.create({
      data: { clinicId,
        patientId: marcus.id,
        appointmentId: appointment.id,
        providerId: drAdeleke.id,
        occurredAt: at(visit.day, 9, 35),
        summary: visit.reason,
      },
    });

    await prisma.note.create({
      data: { clinicId,
        encounterId: encounter.id,
        authorId: drAdeleke.id,
        body: visit.note,
        signed: true,
        signedAt: at(visit.day, 11),
      },
    });
  }

  for (const f of [
    { tooth: 16, finding: FindingType.RESTORATION, surfaces: [ToothSurface.OCCLUSAL, ToothSurface.DISTAL], note: "Two-surface composite, placed in-house." },
    { tooth: 26, finding: FindingType.CROWN, surfaces: [], note: "Prepared for full porcelain crown. Temporary in place." },
    { tooth: 36, finding: FindingType.ENDODONTIC, surfaces: [], note: "Root canal treated prior to registration with this practice." },
    { tooth: 48, finding: FindingType.MISSING, surfaces: [], note: "Extracted 2019." },
    { tooth: 27, finding: FindingType.CARIES, surfaces: [ToothSurface.MESIAL], note: "Early lesion, monitoring." },
  ]) {
    await prisma.toothFinding.create({
      data: { clinicId,
        patientId: marcus.id,
        chartedById: drAdeleke.id,
        toothCode: f.tooth,
        finding: f.finding,
        surfaces: f.surfaces,
        note: f.note,
        chartedAt: at(-120, 10),
      },
    });
  }

  await prisma.image.create({
    data: { clinicId,
      patientId: marcus.id,
      uploadedById: drAdeleke.id,
      kind: ImageKind.PANORAMIC,
      storagePath: "seed/marcus-delgado/panoramic-2024.jpg",
      mimeType: "image/jpeg",
      caption: "Panoramic radiograph taken at new patient examination",
      capturedAt: at(-730, 10),
    },
  });

  const marcusPlan = await prisma.treatmentPlan.create({
    data: { clinicId,
      patientId: marcus.id,
      dentistId: drAdeleke.id,
      title: "Porcelain crown — upper left first molar (26)",
      description:
        "Three-visit crown: preparation and temporary, fitting, then cementation and review. " +
        "Visit 1 completed. Temporary crown is not a long-term restoration.",
      status: TreatmentPlanStatus.ACCEPTED,
      billingStatus: BillingStatus.PENDING,
      estimatedCost: 1480,
      proposedAt: at(-120, 11),
      acceptedAt: at(-115, 9),
    },
  });

  await prisma.recall.create({
    data: { clinicId,
      patientId: marcus.id,
      treatmentPlanId: marcusPlan.id,
      dueAt: at(4, 9),
      reason: "Crown fitting must be completed — temporary crown in place since preparation",
    },
  });

  for (const m of [
    { day: -3, body: "Reminder: your appointment with Dr. Adeleke is on Friday at 9:30am. Reply YES to confirm." },
    { day: -1, body: "Reminder: your crown fitting is tomorrow at 9:30am. Please arrive 5 minutes early." },
  ]) {
    await prisma.message.create({
      data: { clinicId,
        patientId: marcus.id,
        sentById: frontDesk.id,
        channel: MessageChannel.SMS,
        direction: MessageDirection.OUTBOUND,
        body: m.body,
        sentAt: at(m.day, 8),
      },
    });
  }

  // The flagged no-show on today's schedule.
  const missedToday = await prisma.appointment.create({
    data: { clinicId,
      patientId: marcus.id,
      providerId: drAdeleke.id,
      startsAt: at(0, 9, 30),
      endsAt: at(0, 10, 30),
      status: AppointmentStatus.NO_SHOW,
      reason: "Crown fitting — visit 2 of 3",
      estimatedValue: 620,
    },
  });

  // What the Retention Agent has already drafted, awaiting front-desk approval.
  const pending = await prisma.recommendation.create({
    data: { clinicId,
      patientId: marcus.id,
      appointmentId: missedToday.id,
      status: RecommendationStatus.PENDING,
      reason:
        "Marcus missed visit 2 of an accepted 3-visit crown plan and is currently wearing a temporary crown. " +
        "He has attended all five previous appointments, so this is out of character. " +
        "Leaving the temporary in place risks failure and rework, and ₹86,000 of the accepted plan is unbilled.",
      draftMessage:
        `Hi ${marcus.firstName}, we missed you this morning for your crown fitting with Dr. Adeleke. ` +
        "Since you're still in a temporary crown we'd like to get you rebooked soon. " +
        "We have space Thursday 10:00am or Friday 2:30pm — just reply with whichever suits you.",
      channel: MessageChannel.SMS,
    },
  });

  // Backdated to the morning of the demo, so these bypass `recordAudit` (which
  // always stamps now). `auditAction` still checks the strings against the
  // shared vocabulary so the log cannot grow a second spelling of an event.
  await prisma.auditEvent.createMany({
    data: [
      {
        clinicId,
        actorId: frontDesk.id,
        actorRole: Role.FRONT_DESK,
        action: auditAction("appointment.no_show"),
        entityType: "Appointment",
        entityId: missedToday.id,
        metadata: { patientId: marcus.id, from: "CONFIRMED" },
        createdAt: at(0, 10, 35),
      },
      {
        clinicId,
        actorId: null,
        actorRole: null,
        action: auditAction("recommendation.generated"),
        entityType: "Recommendation",
        entityId: pending.id,
        metadata: { source: "retention_agent", trigger: "appointment.no_show" },
        createdAt: at(0, 10, 36),
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // Smart Waitlist entries
  // ---------------------------------------------------------------------------
  await prisma.waitlistEntry.createMany({
    data: [
      {
        clinicId,
        patientId: patients[0].id, // Amara Okonkwo
        preferredDays: "Monday,Wednesday,Friday",
        preferredTime: "morning",
        procedureType: "Scale and polish",
        estimatedMins: 30,
        note: "Available on short notice for morning slots",
        addedAt: at(-4, 9),
      },
      {
        clinicId,
        patientId: patients[2].id, // Chiamaka Eze
        preferredDays: "Tuesday,Thursday",
        preferredTime: "morning",
        procedureType: "Crown fitting",
        estimatedMins: 45,
        note: "Needs earlier slot if possible before traveling next week",
        addedAt: at(-6, 14),
      },
      {
        clinicId,
        patientId: patients[4].id, // Zainab Bello
        preferredDays: "any",
        preferredTime: "any",
        procedureType: "Filling — lower left",
        estimatedMins: 40,
        note: "Flexible, can arrive in 20 mins",
        addedAt: at(-2, 11),
      },
      {
        clinicId,
        patientId: patients[6].id, // Folake Adebayo
        preferredDays: "Monday,Tuesday,Thursday",
        preferredTime: "afternoon",
        procedureType: "Consultation",
        estimatedMins: 30,
        note: "Prefers afternoons after 2pm",
        addedAt: at(-8, 16),
      },
      {
        clinicId,
        patientId: patients[8].id, // Ngozi Okafor
        preferredDays: "Friday,Saturday",
        preferredTime: "morning",
        procedureType: "Routine examination",
        estimatedMins: 20,
        note: "Weekend or Friday morning preferred",
        addedAt: at(-1, 10),
      },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    patients: await prisma.patient.count(),
    appointments: await prisma.appointment.count(),
    encounters: await prisma.encounter.count(),
    notes: await prisma.note.count(),
    toothFindings: await prisma.toothFinding.count(),
    images: await prisma.image.count(),
    treatmentPlans: await prisma.treatmentPlan.count(),
    recalls: await prisma.recall.count(),
    recommendations: await prisma.recommendation.count(),
    waitlistEntries: await prisma.waitlistEntry.count(),
    messages: await prisma.message.count(),
    auditEvents: await prisma.auditEvent.count(),
  };

  console.table(counts);
  console.log(`\nDemo no-show: ${marcus.firstName} ${marcus.lastName} at ${missedToday.startsAt.toLocaleString()}`);
  console.log(`Pending recommendation: ${pending.id}`);
}

async function run() {
  const clinic = await prismaUnscoped.clinic.upsert({
    where: { slug: SEED_CLINIC.slug },
    update: {},
    create: SEED_CLINIC,
  });
  return runAsClinic(clinic.id, () => main(clinic.id));
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
