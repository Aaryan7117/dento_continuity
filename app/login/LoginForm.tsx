"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signIn, type SignInState } from "@/lib/auth-actions";

const inputStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  color: "var(--ink)",
};

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block space-y-1.5 text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="w-full px-3.5 py-2.5 rounded-xl text-sm font-normal outline-none"
          style={inputStyle}
        />
      </label>
      <label className="block space-y-1.5 text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full px-3.5 py-2.5 rounded-xl text-sm font-normal outline-none"
          style={inputStyle}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm font-medium" style={{ color: "#ef4444" }}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60"
        style={{ background: "var(--grad-brand)" }}
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
        Sign in
      </button>
    </form>
  );
}
