import { getPatients, getProviders } from "@/lib/queries";
import { CalendarClock, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createAppointment } from "@/lib/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage() {
  const [patients, providers] = await Promise.all([
    getPatients(),
    getProviders(),
  ]);

  async function handleCreateAppointment(formData: FormData) {
    "use server";
    const patientId = formData.get("patientId") as string;
    const providerId = formData.get("providerId") as string;
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    const durationStr = formData.get("duration") as string;
    const reason = formData.get("reason") as string;

    const startsAt = new Date(`${date}T${time}`);
    const durationMins = parseInt(durationStr || "30", 10);
    const endsAt = new Date(startsAt.getTime() + durationMins * 60000);

    const res = await createAppointment({
      patientId,
      providerId: providerId || undefined,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      reason,
    });

    if (res.ok) {
      redirect("/front-desk");
    }
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--foreground)",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/front-desk"
          className="p-2 rounded-lg no-press"
          data-no-press
          style={{
            color: "var(--text-tertiary)",
            transition: "color 150ms var(--ease-out)",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <CalendarClock className="w-6 h-6" style={{ color: "#019d8e" }} />
            Schedule Appointment
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Book a new visit for a patient.
          </p>
        </div>
      </div>

      <div className="card p-7">
        <form action={handleCreateAppointment} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Patient <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                required
                name="patientId"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none appearance-none"
                style={inputStyle}
              >
                <option value="">Select a patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} — {p.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                required
                type="date"
                name="date"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Time <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                required
                type="time"
                name="time"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Duration <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                required
                name="duration"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none appearance-none"
                style={inputStyle}
                defaultValue="30"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div className="space-y-1.5 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Provider
              </label>
              <select
                name="providerId"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none appearance-none"
                style={inputStyle}
              >
                <option value="">Any Provider</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.role.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2 stagger-item">
              <label className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Reason for Visit
              </label>
              <textarea
                name="reason"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={inputStyle}
                placeholder="E.g., Routine cleaning and checkup…"
              />
            </div>
          </div>

          <div
            className="pt-4 flex justify-end gap-2.5 stagger-item"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <Link
              href="/front-desk"
              className="px-4 py-2.5 text-sm font-semibold rounded-xl no-press"
              data-no-press
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl"
              style={{ background: "linear-gradient(135deg, #019d8e, #067d73)" }}
            >
              <Save className="w-4 h-4" /> Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
