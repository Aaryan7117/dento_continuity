import { handle, ok } from "@/lib/api";
import {
  findNoShowsNeedingRecommendation,
  runRetentionAgent,
} from "@/lib/retention-agent";

/** What the agent would pick up right now, without writing anything. */
export async function GET() {
  return handle(async () => {
    const pending = await findNoShowsNeedingRecommendation();
    return ok({
      pendingCount: pending.length,
      appointmentIds: pending.map((a) => a.id),
    });
  });
}

/**
 * Sweeps for no-shows nothing has drafted for yet. Usually a no-op, because
 * `markNoShow` drafts on the transition — this is the backstop for rows that
 * arrived some other way, such as the seed.
 */
export async function POST() {
  return handle(async () => ok({ generated: await runRetentionAgent() }));
}
