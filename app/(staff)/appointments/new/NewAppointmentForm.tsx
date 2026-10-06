"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Search, X, Zap } from "lucide-react";
import { createAppointment } from "@/lib/actions";

type PatientOption = { id: string; firstName: string; lastName: string; phone: string };
type ProviderOption = { id: string; name: string; role: string };
type ChairOption = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
};

const MAX_MATCHES = 6;
const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

const pad = (n: number) => String(n).padStart(2, "0");
const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function NewAppointmentForm({
  patients,
  providers,
  chairs,
  defaultVisitMinutes,
  initialWalkIn = false,
}: {
  patients: PatientOption[];
  providers: ProviderOption[];
  chairs: ChairOption[];
  defaultVisitMinutes: number;
  initialWalkIn?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState<PatientOption | null>(null);
  const [walkIn, setWalkIn] = useState(initialWalkIn);
  const [date, setDate] = useState(todayInput);
  const [duration, setDuration] = useState(defaultVisitMinutes);
  const [providerId, setProviderId] = useState("");
  const [chairId, setChairId] = useState("");
  const [slot, setSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [closed, setClosed] = useState(false);
  // Loading is derived: results are stamped with the query they answer.
  const slotKey = `${date}|${duration}|${providerId}|${chairId}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loadingSlots = !walkIn && loadedKey !== slotKey;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const digits = q.replace(/\D/g, "");
    return patients
      .filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          (digits !== "" && p.phone.replace(/\D/g, "").includes(digits))
      )
      .slice(0, MAX_MATCHES);
  }, [patients, query]);

  // Free start times for the chosen day, dentist and chair.
  useEffect(() => {
    if (walkIn || !date) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ date, durationMins: String(duration) });
    if (providerId) params.set("providerId", providerId);
    if (chairId) params.set("chairId", chairId);
    const key = slotKey;
    fetch(`/api/slots?${params}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { slots: string[]; closed: boolean }) => {
        setSlots(data.slots);
        setClosed(data.closed);
        setSlot((current) => (current && data.slots.includes(current) ? current : null));
        setLoadedKey(key);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") {
          setSlots([]);
          setLoadedKey(key);
        }
      });
    return () => controller.abort();
  }, [walkIn, date, duration, providerId, chairId, slotKey]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patient) return setError("Choose a patient first.");
    const startsAt = walkIn ? new Date() : slot ? new Date(slot) : null;
    if (!startsAt) return setError("Pick a time slot.");
    const endsAt = new Date(startsAt.getTime() + duration * 60000);

    setError(null);
    startTransition(async () => {
      const res = await createAppointment({
        patientId: patient.id,
        providerId: providerId || undefined,
        chairId: chairId || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: reason.trim() || undefined,
        walkIn,
      });
      if (res.ok) {
        toast.success(
          walkIn
            ? `${patient.firstName} ${patient.lastName} checked in as a walk-in`
            : `Appointment booked for ${patient.firstName} ${patient.lastName}`
        );
        router.push("/front-desk");
      } else {
        setError(res.error.message);
      }
    });
  }

  const slotLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5 md:col-span-2 stagger-item">
          <label className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Patient <span style={{ color: "#ef4444" }}>*</span>
          </label>
          {patient ? (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm" style={inputStyle}>
              <span>
                {patient.firstName} {patient.lastName}
                <span style={{ color: "var(--ink-faint)" }}> — {patient.phone}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPatient(null);
                  setQuery("");
                }}
                aria-label="Change patient"
                style={{ color: "var(--ink-faint)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
                placeholder="Search by name or phone…"
              />
              {query.trim() !== "" && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-20 py-1"
                  style={{ ...inputStyle, boxShadow: "0 10px 30px -12px rgba(0,0,0,0.4)" }}
                >
                  {matches.length === 0 ? (
                    <div className="px-3.5 py-2.5 text-sm" style={{ color: "var(--ink-faint)" }}>
                      No patient found.{" "}
                      <Link href="/patients/new" className="font-semibold" style={{ color: "var(--brand)" }}>
                        Register a new patient
                      </Link>
                    </div>
                  ) : (
                    matches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPatient(p);
                          setError(null);
                        }}
                        className="w-full text-left px-3.5 py-2 text-sm hover:bg-raised"
                      >
                        {p.firstName} {p.lastName}
                        <span style={{ color: "var(--ink-faint)" }}> — {p.phone}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <label
          className="md:col-span-2 flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm cursor-pointer stagger-item"
          style={{
            ...inputStyle,
            borderColor: walkIn ? "var(--brand)" : "var(--line)",
            background: walkIn ? "rgb(var(--brand-rgb) / 0.06)" : "var(--surface)",
          }}
        >
          <input type="checkbox" checked={walkIn} onChange={(e) => setWalkIn(e.target.checked)} />
          <Zap className="w-4 h-4" style={{ color: "var(--brand)" }} />
          <span>
            <span className="font-semibold" style={{ color: "var(--ink)" }}>Walk-in</span>
            <span style={{ color: "var(--ink-muted)" }}> — patient is here now; check them in straight away</span>
          </span>
        </label>

        {!walkIn && (
          <div className="space-y-1.5 stagger-item">
            <label className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
              Date <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              required
              type="date"
              value={date}
              min={todayInput()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>
        )}

        <div className="space-y-1.5 stagger-item">
          <label className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none appearance-none"
            style={inputStyle}
          >
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : `${m / 60} hours`}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 stagger-item">
          <label className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Dentist
          </label>
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none appearance-none"
            style={inputStyle}
          >
            <option value="">Any dentist</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {chairs.length > 0 && (
          <div className="space-y-1.5 stagger-item">
            <label className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
              Chair
            </label>
            <select
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={inputStyle}
            >
              <option value="">Any chair</option>
              {chairs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!walkIn && (
          <div className="space-y-1.5 md:col-span-2 stagger-item">
            <label className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
              Time <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {loadingSlots && slots === null ? (
              <p className="text-sm flex items-center gap-2" style={{ color: "var(--ink-faint)" }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Finding free times…
              </p>
            ) : closed ? (
              <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
                The clinic is closed that day. Opening hours are set under Settings.
              </p>
            ) : slots && slots.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
                No free {duration}-minute slot that day for this dentist and chair.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5" style={{ opacity: loadingSlots ? 0.6 : 1 }}>
                {(slots ?? []).map((iso) => (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSlot(iso)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{
                      borderColor: slot === iso ? "var(--brand)" : "var(--line)",
                      color: slot === iso ? "#fff" : "var(--ink)",
                      background: slot === iso ? "var(--grad-brand)" : "var(--surface)",
                    }}
                  >
                    {slotLabel(iso)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5 md:col-span-2 stagger-item">
          <label className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
            Reason for visit
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={inputStyle}
            placeholder="E.g., Pain in lower left molar…"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm font-medium rounded-xl px-3.5 py-2.5"
          style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
        >
          {error}
        </p>
      )}

      <div className="pt-4 flex justify-end gap-2.5 stagger-item" style={{ borderTop: "1px solid var(--line)" }}>
        <Link
          href="/front-desk"
          className="px-4 py-2.5 text-sm font-semibold rounded-xl no-press"
          data-no-press
          style={{ color: "var(--ink-muted)", border: "1px solid var(--line)" }}
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
          style={{ background: "var(--grad-brand)" }}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {walkIn ? "Check in now" : "Schedule"}
        </button>
      </div>
    </form>
  );
}
