import { NextRequest } from "next/server";
import { handle, ok, parseBody, parseQuery } from "@/lib/api";
import { createTreatmentPlan, listTreatmentPlans } from "@/lib/treatment-plans";
import {
  createTreatmentPlanSchema,
  listTreatmentPlansQuerySchema,
} from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      request.nextUrl.searchParams,
      listTreatmentPlansQuerySchema
    );
    if (!query.ok) return query.response;

    return ok(await listTreatmentPlans(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    const body = await parseBody(request, createTreatmentPlanSchema);
    if (!body.ok) return body.response;

    return ok(await createTreatmentPlan(body.data), 201);
  });
}
