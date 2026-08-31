"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { createEncounter } from "@/lib/actions";

export default function NewEncounterPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const [summary, setSummary] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      const result = await createEncounter({
        patientId,
        summary: summary || undefined,
      });
      if (result.ok) {
        router.push(`/patients/${patientId}/encounters/${result.data.encounterId}`);
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h1 className="text-xl font-semibold text-ink mb-4">
        Start New Encounter
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Summary (optional)
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Crown fitting — visit 2"
            className="w-full border border-line-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary text-sm font-medium py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creating…" : "Create & Open Encounter"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-ink-muted py-2 px-4 rounded-md hover:bg-raised transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
