"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, UserPlus, Users, X, CheckCircle2, AlertCircle,
  ArrowUpDown, RefreshCcw, Wallet, Calendar, Clock,
} from "lucide-react";
import type { Patient } from "@/lib/contract";
import type { RecallWithPatient, BalanceWithPatient } from "@/lib/queries";
import StatusBadge from "@/app/components/StatusBadge";

type FilterStatus = "ALL" | "ACTIVE" | "PENDING";
type SortOption = "name-asc" | "name-desc" | "dob";
type ViewTab = "directory" | "recalls" | "balances";

export default function PatientDirectoryClient({
  initialPatients,
  recalls = [],
  balances = [],
  initialTab = "directory",
}: {
  initialPatients: Patient[];
  recalls?: RecallWithPatient[];
  balances?: BalanceWithPatient[];
  initialTab?: string;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [activeTab, setActiveTab] = useState<ViewTab>(
    initialTab === "recalls" ? "recalls" : initialTab === "balances" ? "balances" : "directory"
  );

  const filteredPatients = useMemo(() => {
    let list = initialPatients.filter((p) => {
      if (filterStatus === "ACTIVE" && !p.consentGiven) return false;
      if (filterStatus === "PENDING" && p.consentGiven) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      return fullName.includes(q) || phone.includes(q) || email.includes(q);
    });

    list.sort((a, b) => {
      if (sortBy === "name-asc") return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
      if (sortBy === "name-desc") return b.lastName.localeCompare(a.lastName) || b.firstName.localeCompare(a.firstName);
      if (sortBy === "dob") return new Date(b.dateOfBirth).getTime() - new Date(a.dateOfBirth).getTime();
      return 0;
    });

    return list;
  }, [initialPatients, search, filterStatus, sortBy]);

  const activeCount = useMemo(() => initialPatients.filter((p) => p.consentGiven).length, [initialPatients]);
  const pendingCount = initialPatients.length - activeCount;

  const filteredRecalls = useMemo(() => {
    if (!search.trim()) return recalls;
    const q = search.toLowerCase();
    return recalls.filter((r) =>
      `${r.patient.firstName} ${r.patient.lastName}`.toLowerCase().includes(q) ||
      (r.reason || "").toLowerCase().includes(q)
    );
  }, [recalls, search]);

  const filteredBalances = useMemo(() => {
    if (!search.trim()) return balances;
    const q = search.toLowerCase();
    return balances.filter((b) =>
      `${b.patient.firstName} ${b.patient.lastName}`.toLowerCase().includes(q) ||
      b.title.toLowerCase().includes(q)
    );
  }, [balances, search]);

  const tabs: { key: ViewTab; label: string; count: number; icon: typeof Users; color: string }[] = [
    { key: "directory", label: "Patients", count: initialPatients.length, icon: Users, color: "var(--brand)" },
    { key: "recalls", label: "Recalls Due", count: recalls.length, icon: RefreshCcw, color: "#f59e0b" },
    { key: "balances", label: "Balances", count: balances.length, icon: Wallet, color: "#ef4444" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Patient Directory
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
            {activeTab === "directory"
              ? `Showing ${filteredPatients.length} of ${initialPatients.length} registered patient${initialPatients.length !== 1 ? "s" : ""}`
              : activeTab === "recalls"
                ? `${filteredRecalls.length} recall${filteredRecalls.length !== 1 ? "s" : ""} due in the next 30 days`
                : `${filteredBalances.length} outstanding balance${filteredBalances.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/patients/new"
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-white rounded-xl text-sm font-semibold w-full sm:w-auto shadow-sm hover:opacity-95 transition-opacity"
          style={{ background: "var(--grad-brand)" }}
        >
          <UserPlus className="w-4 h-4" />
          New Patient
        </Link>
      </div>

      {/* Tab Bar */}
      <div
        className="flex items-center rounded-xl p-1 gap-0.5"
        style={{ background: "var(--raised)", border: "1px solid var(--line)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-surface shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
            style={activeTab === tab.key ? { color: tab.color } : undefined}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold"
              style={{
                background: activeTab === tab.key ? `${tab.color}15` : "var(--surface)",
                color: activeTab === tab.key ? tab.color : "var(--ink-faint)",
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4" style={{ color: "var(--ink-faint)" }} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "directory"
                ? "Search by patient name, phone number, or email…"
                : activeTab === "recalls"
                  ? "Search recalls by patient name or reason…"
                  : "Search by patient name or treatment plan…"
            }
            className="block w-full pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all duration-150 focus:border-brand focus:ring-3 focus:ring-brand/10"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-faint hover:text-ink-muted"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs — only for directory tab */}
        {activeTab === "directory" && (
          <>
            <div
              className="flex items-center rounded-xl p-1 shrink-0"
              style={{ background: "var(--raised)", border: "1px solid var(--line)" }}
            >
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === "ALL" ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                All ({initialPatients.length})
              </button>
              <button
                onClick={() => setFilterStatus("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  filterStatus === "ACTIVE" ? "bg-surface text-emerald-700 shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilterStatus("PENDING")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  filterStatus === "PENDING" ? "bg-surface text-amber-700 shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <AlertCircle className="w-3 h-3 text-amber-500" />
                Pending ({pendingCount})
              </button>
            </div>

            <div
              className="flex items-center px-3 py-2 rounded-xl text-xs font-semibold shrink-0 gap-2"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-ink-faint" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent outline-none cursor-pointer text-ink"
              >
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
                <option value="dob">Date of Birth</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Content based on active tab */}
      {activeTab === "directory" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Contact</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint hidden md:table-cell">Date of Birth</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint hidden sm:table-cell">Status</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "var(--raised)" }}>
                          <Users className="w-5 h-5 text-ink-faint" />
                        </div>
                        <p className="font-semibold text-sm text-ink">
                          {search ? `No patients matching "${search}"` : "No patients in this view"}
                        </p>
                        <p className="text-xs mt-1 text-ink-faint">
                          {search ? "Try clearing your search or checking for spelling errors." : "Change your filter selection to view more patients."}
                        </p>
                        {search && (
                          <button
                            onClick={() => { setSearch(""); setFilterStatus("ALL"); }}
                            className="mt-3 px-3 py-1.5 bg-raised hover:bg-line text-ink text-xs font-semibold rounded-lg transition-colors"
                          >
                            Clear search & filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="stagger-row group hover:bg-canvas/70 transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: "var(--grad-brand-deep)" }}>
                            {patient.firstName[0]}{patient.lastName[0]}
                          </div>
                          <div>
                            <Link href={`/patients/${patient.id}`} className="font-semibold text-sm text-ink hover:text-brand transition-colors">
                              {patient.firstName} {patient.lastName}
                            </Link>
                            {patient.address && (
                              <span className="text-[11px] text-ink-faint block truncate max-w-xs">{patient.address}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-ink">{patient.phone}</div>
                        {patient.email && <div className="text-xs mt-0.5 text-ink-faint hidden md:block">{patient.email}</div>}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell text-ink-muted">
                        {new Date(patient.dateOfBirth).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        {patient.consentGiven ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold" style={{ background: "rgb(var(--tone-emerald) / 0.1)", color: "var(--tone-emerald-ink)" }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold" style={{ background: "rgb(var(--tone-amber) / 0.1)", color: "var(--tone-amber-ink)" }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending Consent
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/patients/${patient.id}`} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-brand bg-brand/10 hover:bg-brand/20 transition-colors">
                          View Record
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredPatients.length > 0 && (
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--line)", background: "var(--raised)" }}>
              <p className="text-xs text-ink-faint">
                Showing <span className="font-semibold text-ink">{filteredPatients.length}</span> of{" "}
                <span className="font-semibold text-ink">{initialPatients.length}</span> patients
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recalls Due Tab */}
      {activeTab === "recalls" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Reason</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Due Date</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Urgency</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecalls.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "rgb(var(--tone-emerald) / 0.1)" }}>
                          <RefreshCcw className="w-5 h-5" style={{ color: "#10b981" }} />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>No recalls due</p>
                        <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>All patients are up to date.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecalls.map((recall) => {
                    const dueDate = new Date(recall.dueAt);
                    const isOverdue = dueDate < new Date();
                    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                    return (
                      <tr key={recall.id} className="stagger-row hover:bg-canvas/70 transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #b45309)" }}>
                              {recall.patient.firstName[0]}{recall.patient.lastName[0]}
                            </div>
                            <div>
                              <Link href={`/patients/${recall.patientId}`} className="font-semibold text-sm text-ink hover:text-brand transition-colors">
                                {recall.patient.firstName} {recall.patient.lastName}
                              </Link>
                              <span className="text-[11px] text-ink-faint block">{recall.patient.phone}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4" style={{ color: "var(--ink-muted)" }}>
                          {recall.reason || "Scheduled recall"}
                        </td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: isOverdue ? "var(--tone-red-ink)" : "var(--ink)" }}>
                            <Calendar className="w-3.5 h-3.5" />
                            {dueDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold" style={{ background: "rgb(var(--tone-red) / 0.1)", color: "var(--tone-red-ink)" }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                              {Math.abs(daysUntil)} days overdue
                            </span>
                          ) : daysUntil <= 7 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold" style={{ background: "rgb(var(--tone-amber) / 0.1)", color: "var(--tone-amber-ink)" }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {daysUntil} day{daysUntil !== 1 ? "s" : ""} left
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-md text-[11px] font-semibold" style={{ background: "rgb(var(--tone-sky) / 0.1)", color: "var(--tone-sky-ink)" }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-status-scheduled" />
                              In {daysUntil} days
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/patients/${recall.patientId}`} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-brand bg-brand/10 hover:bg-brand/20 transition-colors">
                            View Chart
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outstanding Balances Tab */}
      {activeTab === "balances" && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Treatment Plan</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Amount</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Status</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "rgb(var(--tone-emerald) / 0.1)" }}>
                          <Wallet className="w-5 h-5" style={{ color: "#10b981" }} />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>No outstanding balances</p>
                        <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>All accounts are settled.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((balance) => (
                    <tr key={balance.id} className="stagger-row hover:bg-canvas/70 transition-colors" style={{ borderBottom: "1px solid var(--line)" }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}>
                            {balance.patient.firstName[0]}{balance.patient.lastName[0]}
                          </div>
                          <div>
                            <Link href={`/patients/${balance.patientId}`} className="font-semibold text-sm text-ink hover:text-brand transition-colors">
                              {balance.patient.firstName} {balance.patient.lastName}
                            </Link>
                            <span className="text-[11px] text-ink-faint block">{balance.patient.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4" style={{ color: "var(--ink-muted)" }}>
                        {balance.title}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>
                          {balance.estimatedCost != null ? `₹${balance.estimatedCost.toLocaleString("en-IN")}` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={balance.billingStatus} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/patients/${balance.patientId}`} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-brand bg-brand/10 hover:bg-brand/20 transition-colors">
                          View Record
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
