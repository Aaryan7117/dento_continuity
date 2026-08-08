import { handle, ok } from "@/lib/api";
import { getRevenueRecovered } from "@/lib/recovery";

/**
 * Treatment value put back on track by the agent. The contributing plans come
 * back with the total so the number can be defended on stage.
 */
export async function GET() {
  return handle(async () => ok(await getRevenueRecovered()));
}
