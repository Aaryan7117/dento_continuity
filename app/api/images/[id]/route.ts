import { NextRequest } from "next/server";
import { fail, handle, ok, parseBody } from "@/lib/api";
import { getImage, updateImage } from "@/lib/images";
import { updateImageSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const image = await getImage(id);
    if (!image) return fail("Image not found", 404);

    return ok(image);
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  return handle(async () => {
    const { id } = await params;
    const body = await parseBody(request, updateImageSchema);
    if (!body.ok) return body.response;

    return ok(await updateImage(id, body.data));
  });
}
