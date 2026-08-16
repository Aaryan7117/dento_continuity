import { NextRequest, NextResponse } from "next/server";
import { getChairUtilization } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const weekStartParam = req.nextUrl.searchParams.get("weekStart");
  
  let weekStart: Date;
  if (weekStartParam) {
    weekStart = new Date(weekStartParam);
  } else {
    // Default to current week's Sunday
    weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  }

  const slots = await getChairUtilization(weekStart);
  return NextResponse.json(slots);
}
