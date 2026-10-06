"use client";

/**
 * One hook for speech input, whichever engine is live:
 *  - "local": the browser records 16 kHz WAV and the server's sherpa-onnx model transcribes it;
 *  - "browser": the Web Speech API (Chrome/Edge; audio goes to the browser vendor).
 *
 * Push-to-talk with honest phases, so the UI can show them:
 *   idle → starting (microphone being opened; do not speak yet)
 *        → listening (first audio frame has arrived; a tone confirms it)
 *        → transcribing (clip handed to the model)
 *        → idle, with the text passed to `onResult`.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { playReadyTone, startRecording, type Recorder } from "./recorder";

export type SpeechEngine = "local" | "browser" | "none";
export type SpeechPhase = "idle" | "starting" | "listening" | "transcribing";

/** Asked once per page load: does this server hold a speech model? */
let localProbe: Promise<boolean> | null = null;
function probeLocal(): Promise<boolean> {
  if (!localProbe) {
    localProbe = fetch("/api/voice/transcribe", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((info: { available?: boolean }) => !!info.available)
      .catch(() => false);
  }
  return localProbe;
}

/** Push-to-talk clips longer than this are cut off; commands and form fills are short. */
export const MAX_LOCAL_SECONDS = 30;

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onaudiostart: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscribe = () => () => {};

export function useSpeech(onResult: (text: string) => void, lang = "en-IN") {
  // null while rendering on the server, so the markup matches on first paint.
  const supported = useSyncExternalStore<boolean | null>(
    noSubscribe,
    () => getCtor() !== null,
    () => null
  );
  const [phase, setPhase] = useState<SpeechPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<SpeechEngine | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const cutoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);

  // Prefer the model on our own machine; fall back to the browser recogniser.
  useEffect(() => {
    let live = true;
    probeLocal().then((local) => {
      if (live) setEngine(local ? "local" : getCtor() ? "browser" : "none");
    });
    return () => {
      live = false;
    };
  }, []);
  const finalRef = useRef("");
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const stopTimers = useCallback(() => {
    if (cutoffRef.current) clearTimeout(cutoffRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    cutoffRef.current = null;
    tickRef.current = null;
  }, []);

  const beginListening = useCallback(() => {
    startedAtRef.current = Date.now();
    setSeconds(0);
    setPhase("listening");
    playReadyTone();
    tickRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)), 250);
  }, []);

  const finishLocal = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    stopTimers();
    setPhase("transcribing");
    try {
      const wav = await recorder.stop();
      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: wav,
      });
      if (!res.ok) throw new Error(`transcribe ${res.status}`);
      const data = (await res.json()) as { text: string };
      setInterim("");
      if (data.text) onResultRef.current(data.text);
      else setError("Nothing was heard. Wait for the tone, then speak close to the microphone.");
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("404")
          ? "The local speech model is not loaded."
          : "Could not transcribe; try again."
      );
    } finally {
      setPhase("idle");
    }
  }, [stopTimers]);

  const stop = useCallback(() => {
    if (recorderRef.current) void finishLocal();
    else recRef.current?.stop();
  }, [finishLocal]);

  /** Throws the clip away: nothing is transcribed, nothing is filled. */
  const cancel = useCallback(() => {
    stopTimers();
    cancelledRef.current = true;
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    recRef.current?.abort();
    setInterim("");
    setPhase("idle");
  }, [stopTimers]);

  const startLocal = useCallback(async () => {
    setError(null);
    setInterim("");
    cancelledRef.current = false;
    setPhase("starting");
    try {
      const recorder = await startRecording({ onReady: () => beginListening() });
      if (cancelledRef.current) {
        recorder.cancel();
        return;
      }
      recorderRef.current = recorder;
      cutoffRef.current = setTimeout(() => void finishLocal(), MAX_LOCAL_SECONDS * 1000);
    } catch {
      setPhase("idle");
      setError("Microphone access is blocked for this site.");
    }
  }, [beginListening, finishLocal]);

  const start = useCallback(() => {
    if (phase !== "idle") return;
    if (engine === "local") {
      void startLocal();
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    finalRef.current = "";
    setInterim("");
    setError(null);
    cancelledRef.current = false;
    setPhase("starting");

    rec.onaudiostart = () => beginListening();
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) finalRef.current = finalText;
      setInterim(interimText || finalText);
    };
    rec.onerror = (e) => {
      // "no-speech" and "aborted" are ordinary; everything else is worth showing.
      if (e.error === "no-speech") setError("Nothing was heard. Wait for the tone, then speak.");
      else if (e.error !== "aborted") {
        setError(e.error === "not-allowed" ? "Microphone access is blocked for this site." : `Speech error: ${e.error}`);
      }
    };
    rec.onend = () => {
      stopTimers();
      setPhase("idle");
      const text = finalRef.current.trim();
      setInterim("");
      if (text && !cancelledRef.current) onResultRef.current(text);
    };
    recRef.current = rec;
    rec.start();
  }, [lang, engine, phase, startLocal, beginListening, stopTimers]);

  // Read by the meter's animation frame, never during render.
  const level = useCallback(() => recorderRef.current?.level() ?? 0, []);

  useEffect(
    () => () => {
      recRef.current?.abort();
      recorderRef.current?.cancel();
      if (cutoffRef.current) clearTimeout(cutoffRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    },
    []
  );

  const usable = engine === null ? supported : engine !== "none";
  return {
    supported: usable,
    engine,
    phase,
    listening: phase === "listening" || phase === "starting",
    transcribing: phase === "transcribing",
    seconds,
    interim,
    error,
    /** Peak input level 0–1 (local engine only; 0 for the browser engine). */
    level,
    start,
    stop,
    cancel,
  };
}

export type Speech = ReturnType<typeof useSpeech>;

/** Reads a short answer aloud when the browser can. Silent elsewhere. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch {
    // Speech output is a convenience only.
  }
}
