import { handle, ok } from "@/lib/api";
import { listPendingRecommendations } from "@/lib/recommendations";

/** The approval queue. Unpaginated — it is a worklist, not an archive. */
export async function GET() {
  return handle(async () => ok(await listPendingRecommendations()));
}
