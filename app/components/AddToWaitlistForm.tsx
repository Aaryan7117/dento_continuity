"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Search, X } from "lucide-react";

type PatientHit = { id: string; firstName: string; lastName: string; phone: string };

const MIN_QUERY = 2;

const fieldStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
};

export default function AddToWaitlistForm({ onAdded }: { onAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [preferredTime, setPreferredTime] = useState("any");
  const [procedureType, setProcedureType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setHits(data.patients ?? []))
        .catch(() => {});
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Results from an earlier, longer query are hidden once the box is cleared.
  const visibleHits = query.trim().length < MIN_QUERY ? [] : hits;

  function reset() {
    setQuery("");
    setHits([]);
    setPatient(null);
    setPreferredTime("any");
    setProcedureType("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) {
      setError("Choose a patient first.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          preferredTime,
          ...(procedureType.trim() ? { procedureType: procedureType.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Could not add to the waitlist.");
        return;
      }
      toast.success(`${patient.firstName} ${patient.lastName} added to the waitlist`);
      reset();
      setIsOpen(false);
      onAdded();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold"
        style={{ border: "1px dashed var(--line-strong)", color: "var(--ink-muted)" }}
      >
        <Plus className="w-3.5 h-3.5" /> Add a patient to the waitlist
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {patient ? (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm" style={fieldStyle}>
          <span>
            {patient.firstName} {patient.lastName}
            <span style={{ color: "var(--ink-faint)" }}> — {patient.phone}</span>
          </span>
          <button
            type="button"
            onClick={() => setPatient(null)}
            aria-label="Change patient"
            style={{ color: "var(--ink-faint)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--ink-faint)" }}
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or phone…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
              style={fieldStyle}
            />
          </div>
          {visibleHits.length > 0 && (
            <div className="mt-1.5 rounded-lg overflow-hidden py-1" style={fieldStyle}>
              {visibleHits.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPatient(p);
                    setError(null);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-raised"
                >
                  {p.firstName} {p.lastName}
                  <span style={{ color: "var(--ink-faint)" }}> — {p.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <select
          value={preferredTime}
          onChange={(e) => setPreferredTime(e.target.value)}
          aria-label="Preferred time"
          className="px-3 py-2 rounded-lg text-sm outline-none appearance-none"
          style={fieldStyle}
        >
          <option value="any">Any time</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
        </select>
        <input
          value={procedureType}
          onChange={(e) => setProcedureType(e.target.value)}
          placeholder="Visit type (optional)"
          maxLength={80}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={fieldStyle}
        />
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
          className="px-3 py-2 text-xs font-semibold rounded-lg"
          style={{ border: "1px solid var(--line)", color: "var(--ink-muted)" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg disabled:opacity-60"
          style={{ background: "var(--grad-brand)" }}
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Add to waitlist
        </button>
      </div>
    </form>
  );
}
