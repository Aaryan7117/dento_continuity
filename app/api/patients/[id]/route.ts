import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getPatient, updatePatient } from "@/lib/patients";
import { updatePatientSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const patient = await getPatient(id);
    if (!patient) return fail("Patient not found", 404);

    return ok(patient);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updatePatientSchema);
    if (!body.ok) return body.response;

    const patient = await updatePatient(id, body.data);
    if (!patient) return fail("Patient not found", 404);

    return ok(patient);
  });
}
