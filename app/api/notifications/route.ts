import { handle, ok } from "@/lib/api";
import { getNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ok(await getNotifications()));
}
