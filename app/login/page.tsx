import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getSession()) redirect("/front-desk");
  const { next } = await searchParams;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--canvas)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ background: "var(--grad-brand)" }}
          >
            D
          </div>
          <span className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
            DENTO<span style={{ color: "var(--brand)", fontWeight: 400 }}>Continuity</span>
          </span>
        </div>
        <div className="card p-7">
          <h1 className="text-lg font-bold mb-1" style={{ color: "var(--ink)" }}>
            Sign in
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--ink-muted)" }}>
            Use the staff account your clinic gave you.
          </p>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
