"use client";

import { useState } from "react";
import Link from "next/link";
import OdontogramChart from "@/app/components/OdontogramChart";
import AddToothFindingForm from "@/app/components/AddToothFindingForm";
import AddNoteForm, { SignNoteButton } from "@/app/components/AddNoteForm";
import StatusBadge from "@/app/components/StatusBadge";
import type { EncounterDetail, ToothFinding, PatientDetail } from "@/lib/contract";
import { Activity, ArrowLeft, CheckCircle2, Clock, Sparkles, AlertCircle, FileText } from "lucide-react";

export default function EncounterWorkspaceClient({
  encounter,
  patient,
  allPatientFindings,
}: {
  encounter: EncounterDetail;
  patient: PatientDetail;
  allPatientFindings: ToothFinding[];
}) {
  const [findings, setFindings] = useState<ToothFinding[]>(allPatientFindings);
  const [selectedTooth, setSelectedTooth] = useState<number>(11);
  const [activeTab, setActiveTab] = useState<"odontogram" | "notes" | "history">("odontogram");

  function handleToothClick(code: number) {
    setSelectedTooth(code);
  }

  function handleFindingRecorded(newFinding: ToothFinding) {
    setFindings((prev) => {
      // If finding for same tooth & surface exists, replace it, otherwise append
      const filtered = prev.filter((f) => f.id !== newFinding.id);
      return [...filtered, newFinding];
    });
  }

  const encounterFindings = findings.filter(
    (f) => f.encounterId === encounter.id || (new Date(f.chartedAt).toDateString() === new Date(encounter.occurredAt).toDateString())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="card p-5 lg:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <Link
            href={`/patients/${patient.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline mb-2 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to patient chart
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-bold text-ink">
              Clinical Encounter — {patient.firstName} {patient.lastName}
            </h1>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: "rgb(var(--tone-emerald) / 0.1)",
                color: "var(--tone-emerald-ink)",
                border: "1px solid rgb(var(--tone-emerald) / 0.2)",
              }}
            >
              <Activity className="w-3 h-3" /> Live Encounter
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-ink-muted">
            <span>
              Date:{" "}
              <strong className="text-ink font-semibold">
                {new Date(encounter.occurredAt).toLocaleDateString(undefined, { dateStyle: "long" })}
              </strong>
            </span>
            {encounter.provider && (
              <span>
                Provider: <strong className="text-ink font-semibold">{encounter.provider.name}</strong>
              </span>
            )}
            <span>Phone: {patient.phone}</span>
          </div>
        </div>

        {/* Quick Tabs */}
        <div
          className="flex items-center rounded-xl p-1 gap-1"
          style={{ background: "var(--raised)", border: "1px solid var(--line)" }}
        >
          <button
            onClick={() => setActiveTab("odontogram")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "odontogram" ? "bg-surface text-brand shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Odontogram & Findings
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "notes" ? "bg-surface text-brand shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Notes ({encounter.notes.length})
          </button>
        </div>
      </div>

      {/* Main Clinical Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center 7 cols: Interactive Odontogram Chart */}
        <div className="lg:col-span-7 space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="font-bold text-base text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand" /> Interactive Odontogram Chart
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Click any tooth to select and record findings. Updates reflect instantly.
                </p>
              </div>
              <div className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand/10 text-brand border border-brand/20">
                Selected: Tooth FDI #{selectedTooth}
              </div>
            </div>

            {/* Live SVG Odontogram */}
            <div className="p-2 rounded-xl bg-canvas/60 border border-line">
              <OdontogramChart
                findings={findings}
                onToothClick={handleToothClick}
              />
            </div>

            {/* Encounter findings recap */}
            {encounterFindings.length > 0 && (
              <div className="pt-2 border-t border-line space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                  Findings Charted In This Visit ({encounterFindings.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {encounterFindings.map((tf) => (
                    <div
                      key={tf.id}
                      onClick={() => setSelectedTooth(tf.toothCode)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedTooth === tf.toothCode
                          ? "border-brand bg-brand/5 shadow-sm"
                          : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-ink">#{tf.toothCode}</span>
                        <StatusBadge status={tf.finding} />
                        {tf.surfaces.length > 0 && (
                          <span className="text-[10px] text-ink-muted font-mono">
                            {tf.surfaces.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: Record Tooth Finding & Clinical Notes */}
        <div className="lg:col-span-5 space-y-4">
          {/* Record Finding Form Card */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h2 className="font-bold text-sm text-ink flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-brand" /> Record Tooth Finding
              </h2>
              <span className="text-xs font-mono font-bold text-brand px-2 py-0.5 rounded bg-brand/10">
                FDI #{selectedTooth}
              </span>
            </div>
            <AddToothFindingForm
              patientId={patient.id}
              encounterId={encounter.id}
              preselectedTooth={selectedTooth}
              onFindingRecorded={handleFindingRecorded}
            />
          </div>

          {/* Clinical Notes Card */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <h2 className="font-bold text-sm text-ink flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-ink-faint" /> Clinical Notes
              </h2>
              <span className="text-xs text-ink-faint">{encounter.notes.length} note(s)</span>
            </div>

            {/* Existing notes */}
            {encounter.notes.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {encounter.notes.map((note) => (
                  <div
                    key={note.id}
                    className={`bg-surface border rounded-xl p-3 ${
                      note.signed ? "border-green-500/25" : "border-line"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-ink-muted font-medium">
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <SignNoteButton noteId={note.id} signed={note.signed} />
                    </div>
                    <p className="text-xs text-ink whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add note input */}
            <div className="pt-2 border-t border-line">
              <AddNoteForm encounterId={encounter.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
