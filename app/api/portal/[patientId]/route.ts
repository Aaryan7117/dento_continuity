import { NextRequest, NextResponse } from "next/server";
import { getPatientPortal } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  const { patientId } = await params;
  const portal = await getPatientPortal(patientId);
  if (!portal) {
    return NextResponse.json({ message: "Patient not found" }, { status: 404 });
  }
  return NextResponse.json(portal);
}
