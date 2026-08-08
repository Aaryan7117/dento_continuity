import { handle, ok } from "@/lib/api";
import { getDashboardSummary } from "@/lib/queries";

export async function GET() {
  return handle(async () => ok(await getDashboardSummary()));
}
