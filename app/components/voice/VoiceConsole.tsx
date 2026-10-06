"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Keyboard, Loader2, Mic, X } from "lucide-react";
import { toast } from "sonner";
import { parseCommand, type Intent } from "@/lib/voice/parse";
import { executeAction, resolveIntent, type Proposal } from "@/lib/voice-actions";
import { speak, useSpeech } from "./useSpeech";
import VoiceIndicator from "./VoiceIndicator";

const EXAMPLES = [
  "Book Priya tomorrow at 5",
  "Rahul is here",
  "Take Priya to chair",
  "How many no-shows today?",
  "Open dashboard",
];

/**
 * One voice button for the whole staff app. Hold or tap to talk (Alt+V), or
 * type the same commands. The app shows what it heard, proposes the action,
 * and nothing changes until the user taps Confirm.
 */
export default function VoiceConsole() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);
  const [busy, startBusy] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleText = useCallback(
    (text: string, chosen?: { patientId?: string; appointmentId?: string; startsAt?: string }, intentOverride?: Intent) => {
      const intent = intentOverride ?? parseCommand(text);
      setHeard(text);
      setLastIntent(intent);
      setOpen(true);
      startBusy(async () => {
        const p = await resolveIntent(intent, chosen);
        if (p.kind === "message" && p.navigateTo && !p.text) {
          setOpen(false);
          router.push(p.navigateTo);
          return;
        }
        setProposal(p);
        if (p.kind === "message") speak(p.text);
      });
    },
    [router]
  );

  const speech = useSpeech((text) => handleText(text));

  // Alt+V toggles listening from anywhere; Escape closes the console.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (speech.phase === "listening") speech.stop();
        else if (speech.phase === "idle") {
          setOpen(true);
          speech.start();
        }
      } else if (e.key === "Escape" && open) {
        if (speech.phase !== "idle") speech.cancel();
        else setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, speech]);

  function reset() {
    setProposal(null);
    setHeard("");
    setTyped("");
    setLastIntent(null);
  }

  function confirm() {
    if (proposal?.kind !== "confirm") return;
    const action = proposal.action;
    startBusy(async () => {
      const r = await executeAction(action);
      if (r.ok) {
        toast.success(r.text);
        speak(r.text);
        reset();
        setOpen(false);
        router.refresh();
        if (r.navigateTo) router.push(r.navigateTo);
      } else {
        toast.error(r.text);
        setProposal({ kind: "message", text: r.text });
      }
    });
  }

  function choose(id: string) {
    if (proposal?.kind !== "choose") return;
    const chosen =
      proposal.choose === "patient" ? { patientId: id } : proposal.choose === "slot" ? { startsAt: id } : { appointmentId: id };
    // Keep an earlier patient choice when the next question is about a slot.
    const merged = { ...(carried.current ?? {}), ...chosen };
    carried.current = merged;
    handleText(heard, merged, proposal.intent);
  }
  const carried = useRef<{ patientId?: string; appointmentId?: string; startsAt?: string } | null>(null);
  useEffect(() => {
    if (!open) carried.current = null;
  }, [open]);

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          if (speech.supported) speech.start();
          else setTimeout(() => inputRef.current?.focus(), 50);
        }}
        title="Voice command (Alt+V)"
        className="relative p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-raised transition-colors"
      >
        <Mic className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]"
          style={{ background: "rgba(0,0,0,0.35)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              speech.cancel();
            }
          }}
        >
          <div
            role="dialog"
            aria-label="Voice command"
            className="w-full max-w-lg rounded-2xl border border-line-strong shadow-2xl overflow-hidden"
            style={{ background: "var(--surface)" }}
          >
            {/* Microphone and what was heard */}
            <div className="px-5 pt-5 pb-4 space-y-3" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="flex items-start gap-3">
                <button
                  onClick={speech.start}
                  disabled={speech.supported === false || speech.phase !== "idle"}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40"
                  style={{ background: "var(--grad-brand)" }}
                  title="Speak (Alt+V)"
                  aria-label="Speak"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  {speech.phase !== "idle" ? (
                    <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
                      {speech.phase === "starting" ? "Getting ready…" : speech.phase === "listening" ? "Say what you need." : "One moment…"}
                    </p>
                  ) : heard ? (
                    <p className="text-sm" style={{ color: "var(--ink)" }}>
                      <span style={{ color: "var(--ink-faint)" }}>Heard: </span>“{heard}”
                    </p>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
                      {speech.supported === false
                        ? "This browser has no speech recognition; type a command instead."
                        : "Tap the mic, wait for the tone, then say what you need. Or type below."}
                    </p>
                  )}
                  {speech.error && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{speech.error}</p>}
                  {!heard && speech.phase === "idle" && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {EXAMPLES.map((ex) => (
                        <button
                          key={ex}
                          onClick={() => handleText(ex)}
                          className="text-[11px] px-2 py-1 rounded-md"
                          style={{ background: "var(--raised)", color: "var(--ink-muted)" }}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    speech.cancel();
                  }}
                  className="p-1"
                  style={{ color: "var(--ink-faint)" }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <VoiceIndicator speech={speech} />
            </div>

            {/* Proposal */}
            <div className="px-5 py-4 space-y-3 min-h-[72px]">
              {busy && (
                <p className="text-sm flex items-center gap-2" style={{ color: "var(--ink-faint)" }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Working it out…
                </p>
              )}
              {!busy && proposal?.kind === "message" && proposal.text && (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: "var(--ink)" }}>{proposal.text}</p>
                  {proposal.navigateTo && (
                    <button
                      onClick={() => { setOpen(false); router.push(proposal.navigateTo!); }}
                      className="text-xs font-semibold"
                      style={{ color: "var(--brand)" }}
                    >
                      Open →
                    </button>
                  )}
                </div>
              )}
              {!busy && proposal?.kind === "choose" && (
                <div className="space-y-2">
                  <p className="text-sm" style={{ color: "var(--ink)" }}>{proposal.prompt}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {proposal.candidates.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => choose(c.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-left"
                        style={{ borderColor: "var(--line)", color: "var(--ink)" }}
                      >
                        {c.label}
                        {c.detail && <span style={{ color: "var(--ink-faint)" }}> · {c.detail}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!busy && proposal?.kind === "confirm" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{proposal.summary}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirm}
                      autoFocus
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl"
                      style={{ background: "var(--grad-brand)" }}
                    >
                      <Check className="w-4 h-4" /> Confirm
                    </button>
                    <button
                      onClick={reset}
                      className="px-4 py-2 text-sm font-semibold rounded-xl"
                      style={{ border: "1px solid var(--line)", color: "var(--ink-muted)" }}
                    >
                      Not that
                    </button>
                  </div>
                </div>
              )}
              {!busy && !proposal && lastIntent?.kind === "unknown" && (
                <p className="text-sm" style={{ color: "var(--ink-faint)" }}>Sorry, I didn’t catch a command in that.</p>
              )}
            </div>

            {/* Typed fallback */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) handleText(typed.trim());
                setTyped("");
              }}
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderTop: "1px solid var(--line)", background: "var(--canvas)" }}
            >
              <Keyboard className="w-4 h-4 shrink-0" style={{ color: "var(--ink-faint)" }} />
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Or type: book Priya tomorrow at 5"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--ink)" }}
              />
              <span className="text-[10px]" style={{ color: "var(--ink-faint)" }}>
                {speech.engine === "local" ? "on-device" : speech.engine === "browser" ? "browser" : ""}
              </span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--raised)", color: "var(--ink-faint)" }}>
                Alt+V
              </kbd>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
