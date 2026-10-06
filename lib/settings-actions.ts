"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { ApiResult } from "@/lib/contract";
import {
  chairNameSchema,
  createChair,
  setChairActive,
  updateClinicSettings,
  updateClinicSettingsSchema,
} from "@/lib/clinic";

const invalid = (message = "Validation failed") =>
  ({ ok: false, error: { message } }) as const;

export async function saveClinicSettings(
  input: z.input<typeof updateClinicSettingsSchema>
): Promise<ApiResult<null>> {
  const parsed = updateClinicSettingsSchema.safeParse(input);
  if (!parsed.success) return invalid("Check the opening hours: use HH:MM and end after start.");

  const result = await updateClinicSettings(parsed.data);
  if (!result.ok) return invalid("Each range must end after it starts.");

  revalidatePath("/settings");
  revalidatePath("/appointments/new");
  return { ok: true, data: null };
}

export async function addChair(name: string): Promise<ApiResult<{ chairId: string }>> {
  const parsed = chairNameSchema.safeParse(name);
  if (!parsed.success) return invalid("Give the chair a name of up to 40 characters.");

  const result = await createChair(parsed.data);
  if (!result.ok) return invalid("A chair with that name already exists.");

  revalidatePath("/settings");
  revalidatePath("/appointments/new");
  return { ok: true, data: { chairId: result.chair.id } };
}

export async function toggleChair(id: string, isActive: boolean): Promise<ApiResult<null>> {
  if (!z.uuid().safeParse(id).success) return invalid();
  if (!(await setChairActive(id, isActive))) return invalid("Chair not found.");

  revalidatePath("/settings");
  revalidatePath("/appointments/new");
  return { ok: true, data: null };
}
