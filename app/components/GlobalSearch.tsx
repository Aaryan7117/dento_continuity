"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Calendar, X, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";

interface PatientResult {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string;
  consentGiven: boolean;
}

interface AppointmentResult {
  id: string;
  patientId: string;
  patientName: string;
  startsAt: string;
  status: string;
  reason: string | null;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setPatients([]);
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.patients || []);
          setAppointments(data.appointments || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 160);

    return () => clearTimeout(timeout);
  }, [query]);

  const totalItems = patients.length + appointments.length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || totalItems === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < patients.length) {
        const p = patients[selectedIndex];
        router.push(`/patients/${p.id}`);
      } else {
        const apt = appointments[selectedIndex - patients.length];
        router.push(`/patients/${apt.patientId}`);
      }
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.userAgent || ""));
    }
  }, []);

  return (
    <div ref={containerRef} className="max-w-md w-full relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#019d8e]" />
          ) : (
            <Search className="h-4 w-4" style={{ color: "var(--text-tertiary)" }} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search patients, appointments…"
          className="block w-full pl-9 pr-16 py-[7px] rounded-xl text-[13px] outline-none transition-all duration-150 focus:border-[#019d8e] focus:ring-3 focus:ring-[#019d8e]/10"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-14 pr-2 flex items-center text-stone-400 hover:text-stone-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <kbd className="absolute inset-y-0 right-2.5 my-auto h-5 px-1.5 flex items-center text-[10px] font-medium text-stone-400 bg-stone-100 rounded border border-stone-200 pointer-events-none">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </div>

      {/* Results Dropdown Popover */}
      {isOpen && query.length >= 2 && (
        <div
          className="absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-xl z-50 overflow-hidden border border-stone-200/80 max-h-[420px] overflow-y-auto"
          style={{
            background: "var(--surface)",
            backdropFilter: "blur(20px)",
          }}
        >
          {loading && totalItems === 0 && (
            <div className="p-6 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#019d8e]" />
              Searching…
            </div>
          )}

          {!loading && totalItems === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold text-stone-800">No results found</p>
              <p className="text-xs text-stone-400 mt-1">
                No patient or appointment matches &ldquo;{query}&rdquo;
              </p>
              <Link
                href="/patients/new"
                onClick={() => setIsOpen(false)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#019d8e] hover:underline"
              >
                Add as new patient <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Patients Section */}
          {patients.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Patients ({patients.length})
              </div>
              {patients.map((p, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <Link
                    key={p.id}
                    href={`/patients/${p.id}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 mx-1.5 rounded-xl transition-colors text-xs ${
                      isSelected
                        ? "bg-[#019d8e]/10 text-[#019d8e]"
                        : "hover:bg-stone-50 text-stone-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                        style={{
                          background: "linear-gradient(135deg, #019d8e, #0d524d)",
                        }}
                      >
                        {p.firstName[0]}
                        {p.lastName[0]}
                      </div>
                      <div>
                        <span className="font-semibold block">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          {p.phone} {p.email && `· ${p.email}`}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                      DOB: {p.dateOfBirth}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Appointments Section */}
          {appointments.length > 0 && (
            <div className="py-2 border-t border-stone-100">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Appointments ({appointments.length})
              </div>
              {appointments.map((apt, idx) => {
                const globalIdx = patients.length + idx;
                const isSelected = selectedIndex === globalIdx;
                return (
                  <Link
                    key={apt.id}
                    href={`/patients/${apt.patientId}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 mx-1.5 rounded-xl transition-colors text-xs ${
                      isSelected
                        ? "bg-[#019d8e]/10 text-[#019d8e]"
                        : "hover:bg-stone-50 text-stone-800"
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{apt.patientName}</span>
                      <span className="text-[11px] text-stone-400">
                        {apt.reason || "Appointment"} ·{" "}
                        {new Date(apt.startsAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <StatusBadge status={apt.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
