"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Loader2, Phone, X } from "lucide-react";
import StatusBadge from "@/app/components/StatusBadge";
import {
  cancelViaLink,
  confirmViaLink,
  rebookSlotsViaLink,
  rebookViaLink,
  rescheduleViaLink,
  slotsViaLink,
} from "@/lib/patient-actions";
import type { PortalAppointment, PortalMessage, PortalTreatmentPlan } from "@/lib/contract";

type Clinic = { name: string; phone: string | null; timezone: string };

const pad = (n: number) => String(n).padStart(2, "0");
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const LIVE = new Set(["SCHEDULED", "CONFIRMED"]);
const MISSED = new Set(["NO_SHOW", "CANCELLED"]);

export default function PatientLinkClient({
  token,
  clinic,
  patientFirstName,
  appointments,
  treatmentPlans,
  messages,
  focusAppointmentId,
}: {
  token: string;
  clinic: Clinic;
  patientFirstName: string;
  appointments: PortalAppointment[];
  treatmentPlans: PortalTreatmentPlan[];
  messages: PortalMessage[];
  focusAppointmentId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [picker, setPicker] = useState<{ appointmentId: string; mode: "move" | "rebook" } | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  // Taken once per page load; the page is refreshed after every action anyway.
  const [now] = useState(() => Date.now());

  const upcoming = appointments
    .filter((a) => LIVE.has(a.status) && new Date(a.endsAt).getTime() > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const focus = appointments.find((a) => a.id === focusAppointmentId) ?? null;
  const needsRebook = focus && MISSED.has(focus.status) && !focus.rebookedToId ? focus : null;
  const history = appointments
    .filter((a) => !upcoming.includes(a))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, 8);

  function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>, okText: string) {
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setNotice({ kind: "ok", text: okText });
        setPicker(null);
        setCancelling(null);
        router.refresh();
      } else {
        setNotice({ kind: "error", text: res.error?.message ?? "Something went wrong." });
      }
    });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-surface border-b border-line px-5 py-4">
        <div className="max-w-md mx-auto">
          <p className="text-xs text-ink-muted">{clinic.name}</p>
          <h1 className="text-lg font-semibold text-ink">Hello, {patientFirstName}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-5 space-y-6">
        {notice && (
          <p
            role="status"
            className="text-sm rounded-xl px-3.5 py-2.5"
            style={{
              color: notice.kind === "ok" ? "var(--tone-emerald-ink)" : "#ef4444",
              background: notice.kind === "ok" ? "rgb(var(--tone-emerald) / 0.1)" : "rgba(239,68,68,0.08)",
            }}
          >
            {notice.text}
          </p>
        )}

        {needsRebook && (
          <section className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-ink">
              {needsRebook.status === "NO_SHOW" ? "We missed you" : "Your visit was cancelled"}
            </h2>
            <p className="text-sm text-ink-muted">
              {needsRebook.reason ? `${needsRebook.reason} · ` : ""}
              originally {when(needsRebook.startsAt)}
            </p>
            {picker?.appointmentId === needsRebook.id ? (
              <SlotPicker
                token={token}
                appointmentId={needsRebook.id}
                mode="rebook"
                pending={pending}
                onPick={(iso) =>
                  run(() => rebookViaLink(token, needsRebook.id, iso), `Booked for ${when(iso)}. See you then!`)
                }
                onClose={() => setPicker(null)}
              />
            ) : (
              <button
                onClick={() => setPicker({ appointmentId: needsRebook.id, mode: "rebook" })}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--grad-brand)" }}
              >
                Book a new time
              </button>
            )}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="font-semibold text-ink">Your next visit{upcoming.length > 1 ? "s" : ""}</h2>
          {upcoming.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl p-4 text-sm text-ink-faint text-center">
              Nothing booked yet.
            </div>
          ) : (
            upcoming.map((apt) => (
              <div key={apt.id} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{when(apt.startsAt)}</p>
                    {apt.reason && <p className="text-sm text-ink-muted">{apt.reason}</p>}
                    {apt.providerName && <p className="text-xs text-ink-faint">with {apt.providerName}</p>}
                  </div>
                  <StatusBadge status={apt.status} />
                </div>

                {picker?.appointmentId === apt.id ? (
                  <SlotPicker
                    token={token}
                    appointmentId={apt.id}
                    mode="move"
                    pending={pending}
                    onPick={(iso) =>
                      run(() => rescheduleViaLink(token, apt.id, iso), `Moved to ${when(iso)}.`)
                    }
                    onClose={() => setPicker(null)}
                  />
                ) : cancelling === apt.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(() => cancelViaLink(token, apt.id, cancelReason), "Your visit is cancelled.");
                    }}
                    className="space-y-2"
                  >
                    <input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      maxLength={300}
                      placeholder="Reason (optional)"
                      className="w-full px-3 py-2 rounded-xl text-sm outline-none bg-surface border border-line text-ink"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCancelling(null)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-line text-ink-muted"
                      >
                        Keep it
                      </button>
                      <button
                        type="submit"
                        disabled={pending}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                        style={{ background: "#ef4444" }}
                      >
                        {pending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cancel visit"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      disabled={pending || apt.status === "CONFIRMED"}
                      onClick={() => run(() => confirmViaLink(token, apt.id), "Thanks, your visit is confirmed.")}
                      className="py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <Check className="w-4 h-4" /> {apt.status === "CONFIRMED" ? "Confirmed" : "Confirm"}
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => setPicker({ appointmentId: apt.id, mode: "move" })}
                      className="py-2.5 rounded-xl text-sm font-semibold border border-line text-ink flex items-center justify-center gap-1"
                    >
                      <CalendarClock className="w-4 h-4" /> Move
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => {
                        setCancelReason("");
                        setCancelling(apt.id);
                      }}
                      className="py-2.5 rounded-xl text-sm font-semibold border border-line text-ink-muted flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {treatmentPlans.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold text-ink">Your treatment</h2>
            {treatmentPlans.map((tp) => (
              <div key={tp.id} className="bg-surface border border-line rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{tp.title}</p>
                  <StatusBadge status={tp.status} />
                </div>
                {tp.estimatedCost != null && (
                  <p className="text-xs text-ink-muted mt-1">
                    Estimate ₹{tp.estimatedCost.toLocaleString("en-IN")} · payment {tp.billingStatus.toLowerCase()}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {history.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold text-ink">Past visits</h2>
            {history.map((apt) => (
              <div key={apt.id} className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-ink">
                    {new Date(apt.startsAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · {timeOf(apt.startsAt)}
                  </p>
                  {apt.reason && <p className="text-xs text-ink-muted">{apt.reason}</p>}
                </div>
                <StatusBadge status={apt.status} />
              </div>
            ))}
          </section>
        )}

        {messages.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold text-ink">Messages</h2>
            {messages.slice(0, 5).map((m) => (
              <div key={m.id} className="bg-surface border border-line rounded-2xl px-4 py-3">
                <p className="text-[11px] text-ink-faint mb-1">
                  {m.direction === "OUTBOUND" ? clinic.name : "You"} ·{" "}
                  {new Date(m.sentAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                </p>
                <p className="text-sm text-ink whitespace-pre-line">{m.body}</p>
              </div>
            ))}
          </section>
        )}

        {clinic.phone && (
          <p className="text-center text-sm text-ink-muted flex items-center justify-center gap-1.5">
            <Phone className="w-4 h-4" /> Need help? Call {clinic.phone}
          </p>
        )}
      </main>
    </div>
  );
}

function SlotPicker({
  token,
  appointmentId,
  mode,
  pending,
  onPick,
  onClose,
}: {
  token: string;
  appointmentId: string;
  mode: "move" | "rebook";
  pending: boolean;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(() => toInputDate(new Date()));
  const [result, setResult] = useState<{ date: string; slots: string[]; closed: boolean } | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const loading = result?.date !== date;

  useEffect(() => {
    let cancelled = false;
    const load = mode === "move" ? slotsViaLink : rebookSlotsViaLink;
    load(token, appointmentId, date).then((res) => {
      if (cancelled) return;
      if (res.ok) setResult({ date, slots: res.data.slots, closed: res.data.closed });
      else setResult({ date, slots: [], closed: false });
    });
    return () => {
      cancelled = true;
    };
  }, [token, appointmentId, date, mode]);

  return (
    <div className="space-y-3 pt-1">
      <label className="block text-xs font-semibold text-ink-muted">
        Pick a day
        <input
          type="date"
          value={date}
          min={toInputDate(new Date())}
          onChange={(e) => {
            setDate(e.target.value);
            setChosen(null);
          }}
          className="mt-1 w-full px-3 py-2 rounded-xl text-sm font-normal outline-none bg-surface border border-line text-ink"
        />
      </label>
      {loading ? (
        <p className="text-sm text-ink-faint flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking free times…
        </p>
      ) : result?.closed ? (
        <p className="text-sm text-ink-faint">The clinic is closed that day.</p>
      ) : result && result.slots.length === 0 ? (
        <p className="text-sm text-ink-faint">No free times that day. Try another day.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {result?.slots.map((iso) => (
            <button
              key={iso}
              type="button"
              onClick={() => setChosen(iso)}
              className="px-3 py-2 rounded-lg text-sm font-semibold border"
              style={{
                borderColor: chosen === iso ? "var(--brand)" : "var(--line)",
                color: chosen === iso ? "#fff" : "var(--ink)",
                background: chosen === iso ? "var(--grad-brand)" : "var(--surface)",
              }}
            >
              {timeOf(iso)}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-line text-ink-muted"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!chosen || pending}
          onClick={() => chosen && onPick(chosen)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--grad-brand)" }}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : mode === "move" ? "Move visit" : "Book this time"}
        </button>
      </div>
    </div>
  );
}
