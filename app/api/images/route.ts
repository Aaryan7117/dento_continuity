import { NextRequest } from "next/server";
import { fail, handle, ok, parseQuery, validationFailure } from "@/lib/api";
import { getDentistActor } from "@/lib/actors";
import { createImage, listImages } from "@/lib/images";
import { createImageSchema, listImagesQuerySchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(request.nextUrl.searchParams, listImagesQuerySchema);
    if (!query.ok) return query.response;

    return ok(await listImages(query.data));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("Request must be multipart form data", 400);
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail("Validation failed", 422, {
        file: ["A file is required under the 'file' field"],
      });
    }

    const parsed = createImageSchema.safeParse({
      patientId: form.get("patientId") ?? undefined,
      encounterId: form.get("encounterId") ?? undefined,
      kind: form.get("kind") ?? undefined,
      caption: form.get("caption") ?? undefined,
      capturedAt: form.get("capturedAt") ?? undefined,
    });
    if (!parsed.success) return validationFailure(parsed.error);

    const result = await createImage(parsed.data, file, await getDentistActor());
    if (!result.ok) {
      return result.reason === "tooLarge"
        ? fail(`File exceeds the ${result.limitBytes} byte limit`, 413)
        : fail(`Unsupported file type — accepted: ${result.accepted.join(", ")}`, 415);
    }

    return ok(result.image, 201);
  });
}
