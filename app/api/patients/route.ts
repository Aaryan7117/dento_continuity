import { NextRequest } from "next/server";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { createPatient, listPatients } from "@/lib/patients";
import { createPatientSchema, listPatientsQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(request.nextUrl.searchParams, listPatientsQuerySchema);
    if (!query.ok) return query.response;

    return ok(await listPatients(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await parseBody(request, createPatientSchema);
    if (!body.ok) return body.response;

    return ok(await createPatient(body.data), 201);
  });
}
