"use client";

import { useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { createTreatmentPlan } from "@/lib/actions";

export default function NewTreatmentPlanPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await createTreatmentPlan({
        patientId,
        title: title.trim(),
        description: description || undefined,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      });
      if (result.ok) {
        router.push(`/patients/${patientId}`);
      } else {
        setError(result.error.message);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h1 className="text-xl font-semibold text-ink mb-4">
        Create Treatment Plan
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Composite restoration — upper right first molar"
            className="w-full border border-line-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Treatment details, number of visits, etc."
            rows={3}
            className="w-full border border-line-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Estimated Cost (₹)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            placeholder="0.00"
            className="w-full border border-line-strong rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="btn-primary text-sm font-medium py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
          >
            {isPending ? "Creating…" : "Create Plan"}
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
