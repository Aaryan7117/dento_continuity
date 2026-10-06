"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { prismaUnscoped } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { runAsClinic } from "@/lib/tenant";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type SignInState = { error?: string };

/** Same message for unknown email, wrong password and inactive account. */
const REJECTED = "Email or password is incorrect.";

export async function signIn(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) return { error: "Enter your email and password." };

  const { email, password, next } = parsed.data;
  const user = await prismaUnscoped.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !user.passwordHash) return { error: REJECTED };
  if (!(await verifyPassword(password, user.passwordHash))) return { error: REJECTED };

  await setSessionCookie({
    userId: user.id,
    clinicId: user.clinicId,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  await runAsClinic(user.clinicId, async () => {
    await prismaUnscoped.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await recordAudit({
      actor: { id: user.id, role: user.role },
      action: "user.signed_in",
      entityType: "User",
      entityId: user.id,
    });
  });

  // Only same-site paths are honoured, so a crafted link cannot bounce elsewhere.
  redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/front-desk");
}

export async function signOut(): Promise<void> {
  const session = await getSession();
  if (session) {
    await runAsClinic(session.clinicId, () =>
      recordAudit({
        actor: { id: session.userId, role: session.role },
        action: "user.signed_out",
        entityType: "User",
        entityId: session.userId,
      })
    );
  }
  await clearSessionCookie();
  redirect("/login");
}
