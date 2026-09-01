export const PROMPTS = [
  {
    name: "morning_briefing",
    description: "Generate a comprehensive clinical & front-desk morning briefing covering today's appointments, high-value procedures, potential chair bottlenecks, and pending retention recoveries.",
    arguments: [],
  },
  {
    name: "chairside_patient_summary",
    description: "Prepare a fast, chairside clinical case summary for a dentist before a patient procedure, highlighting medical notes, active tooth findings, and open treatment plan items.",
    arguments: [
      {
        name: "patientId",
        description: "UUID of the patient about to be treated",
        required: true,
      },
    ],
  },
  {
    name: "retention_audit",
    description: "Run a clinical retention and revenue loss audit to summarize no-show patterns, unrecovered revenue, and recommended patient re-engagement actions.",
    arguments: [],
  },
];

export async function handlePromptGet(name: string, args?: Record<string, string>) {
  switch (name) {
    case "morning_briefing": {
      return {
        description: "Morning clinical and operational briefing prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please generate a structured Morning Briefing for the DENTO Continuity dental practice today.

Steps to take:
1. Call 'get_practice_summary' to see overall clinic metrics and revenue stats.
2. Call 'get_today_schedule' to inspect every appointment today.
3. Call 'get_pending_recommendations' to check unapproved retention messages.
4. Call 'get_smart_waitlist' to see if any patients can fill open chair gaps.

Output format:
- ☀️ **Executive Overview**: Total appointments, estimated revenue, chair occupancy.
- 🦷 **Chairside High-Priority Cases**: Flag any complex procedures (crowns, endodontics, surgical extractions).
- 🚨 **Retention & No-Show Alerts**: Immediate recovery follow-ups needed.
- 💡 **Action Items for Front Desk & Assistants**: Specific recommendations for the morning huddle.`,
            },
          },
        ],
      };
    }

    case "chairside_patient_summary": {
      const patientId = args?.patientId || "[PATIENT_ID]";
      return {
        description: "Chairside patient case review prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please prepare an immediate chairside clinical summary for patient ID: ${patientId}.

Steps to take:
1. Call 'get_patient_chart' with patientId: "${patientId}".
2. Review active FDI odontogram findings, past encounters, notes, and accepted treatment plans.

Output format:
- 👤 **Patient Quick Profile**: Name, Age, Contact, and Consent status.
- 🦷 **Active Tooth Findings (FDI)**: Table of affected teeth, surfaces, and conditions (caries, crown, implant, etc.).
- 📋 **Accepted / Proposed Treatment Plans**: Open phases and estimated costs.
- ⚠️ **Clinical Cautions & Recent Notes**: Key takeaways from the last encounter.`,
            },
          },
        ],
      };
    }

    case "retention_audit": {
      return {
        description: "Practice retention and revenue recovery audit prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Conduct a complete Retention & Continuity Audit for DENTO Continuity.

Steps to take:
1. Call 'get_practice_summary' to retrieve current recovered revenue vs lost revenue risk.
2. Call 'get_pending_recommendations' to inspect all unhandled drafts.
3. Call 'get_smart_waitlist' to review unfilled patient demand.

Output format:
- 📊 **Revenue Continuity Health Check**: Total recovered revenue vs at-risk revenue.
- 📬 **Pending Action Items**: Breakdown of unreviewed drafts with recommended 1-click approvals.
- ⚡ **Optimization Strategies**: Concrete suggestions to improve chair utilization and prevent no-shows.`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}
