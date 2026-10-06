"use client";

/**
 * The one place that shows what the microphone is doing. Used by the voice
 * console and by every "fill by voice" form so the states look and behave the
 * same everywhere:
 *
 *   starting     spinner, "Opening microphone…", do not speak yet
 *   listening    red pulsing dot, live level meter, running clock, Stop and Cancel
 *   transcribing spinner, "Transcribing…"
 */

import { useEffect, useRef } from "react";
import { Loader2, Square, X } from "lucide-react";
import type { Speech } from "./useSpeech";

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Five bars driven by the recorder's peak level; purely decorative when the browser engine is in use. */
function LevelMeter({ level, animate }: { level: () => number; animate: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const v = animate ? 0.25 + 0.2 * Math.abs(Math.sin((t += 0.15))) : Math.min(1, level() * 3);
        const bars = el.children;
        for (let i = 0; i < bars.length; i++) {
          const threshold = (i + 1) / bars.length;
          const h = v >= threshold ? 1 : Math.max(0.2, (v / threshold) * 0.9);
          (bars[i] as HTMLElement).style.transform = `scaleY(${h.toFixed(2)})`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level, animate]);
  return (
    <div ref={ref} className="voice-meter" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} />
      ))}
    </div>
  );
}

export default function VoiceIndicator({
  speech,
  stopLabel = "Stop",
  prompt,
}: {
  speech: Speech;
  /** What pressing Stop leads to, e.g. "Stop & fill". */
  stopLabel?: string;
  /** Shown while recording, under the clock. */
  prompt?: string;
}) {
  const { phase } = speech;
  if (phase === "idle") return null;

  if (phase === "starting") {
    return (
      <div className="voice-state" role="status" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "var(--brand)" }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Opening microphone…</p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Wait for the red light and the tone, then speak.</p>
        </div>
        <button type="button" onClick={speech.cancel} className="voice-btn-ghost ml-auto" aria-label="Cancel">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    );
  }

  if (phase === "transcribing") {
    return (
      <div className="voice-state" role="status" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: "var(--brand)" }} />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Transcribing…</p>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {speech.engine === "local" ? "On this computer; the audio never left it." : "Working out what was said."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="voice-state voice-state-live" role="status" aria-live="polite">
      <span className="voice-dot" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--tone-red-ink, #b91c1c)" }}>Recording</p>
          <span className="text-xs tabular-nums" style={{ color: "var(--ink-muted)" }}>{clock(speech.seconds)}</span>
          <LevelMeter level={speech.level} animate={speech.engine !== "local"} />
        </div>
        <p className="text-xs truncate" style={{ color: "var(--ink-muted)" }}>
          {speech.interim || prompt || "Speak now. Press Stop when you have finished."}
        </p>
      </div>
      <button type="button" onClick={speech.stop} className="voice-btn-stop" autoFocus>
        <Square className="w-3 h-3 fill-current" /> {stopLabel}
      </button>
      <button type="button" onClick={speech.cancel} className="voice-btn-ghost" aria-label="Cancel recording">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
