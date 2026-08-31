"use client";

import { useTransition } from "react";
import { transitionTreatmentPlan } from "@/lib/actions";
import type { TreatmentPlan } from "@/lib/contract";

const NEXT_STATUS: Record<string, { label: string; target: string } | null> = {
  PROPOSED: { label: "Accept Plan", target: "ACCEPTED" },
  ACCEPTED: { label: "Mark Completed", target: "COMPLETED" },
  COMPLETED: null,
};

export default function TreatmentPlanActions({
  plan,
}: {
  plan: TreatmentPlan;
}) {
  const [isPending, startTransition] = useTransition();
  const next = NEXT_STATUS[plan.status];

  if (!next) return null;

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await transitionTreatmentPlan({
            id: plan.id,
            status: next.target as "PROPOSED" | "ACCEPTED" | "COMPLETED",
          });
        })
      }
      disabled={isPending}
      className="text-xs btn-primary py-1 px-3 rounded disabled:opacity-50 transition-colors"
    >
      {isPending ? "Updating…" : next.label}
    </button>
  );
}
