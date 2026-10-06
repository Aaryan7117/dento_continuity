"use client";

/**
 * Thin wrapper over the browser's speech recognition (Chrome, Edge, Safari 14+).
 * Push-to-talk: `start()` listens until `stop()` or a pause; the final text is
 * handed to `onResult`. Swapping the engine later (on-device or a cloud API)
 * means replacing this hook only.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { startRecording, type Recorder } from "./recorder";

export type SpeechEngine = "local" | "browser" | "none";

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

/** Push-to-talk clips longer than this are cut off; commands are short. */
const MAX_LOCAL_SECONDS = 20;

type RecognitionCtor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
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
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<SpeechEngine | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<Recorder | null>(null);
  const cutoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const finishLocal = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    if (cutoffRef.current) clearTimeout(cutoffRef.current);
    setListening(false);
    setTranscribing(true);
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
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("404")
          ? "The local speech model is not loaded."
          : "Could not transcribe; try again."
      );
    } finally {
      setTranscribing(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current) void finishLocal();
    else recRef.current?.stop();
  }, [finishLocal]);

  const startLocal = useCallback(async () => {
    setError(null);
    setInterim("");
    try {
      recorderRef.current = await startRecording();
      setListening(true);
      cutoffRef.current = setTimeout(() => void finishLocal(), MAX_LOCAL_SECONDS * 1000);
    } catch {
      setError("Microphone access is blocked for this site.");
    }
  }, [finishLocal]);

  const start = useCallback(() => {
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
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(e.error === "not-allowed" ? "Microphone access is blocked for this site." : `Speech error: ${e.error}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      const text = finalRef.current.trim();
      setInterim("");
      if (text) onResultRef.current(text);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [lang, engine, startLocal]);

  useEffect(
    () => () => {
      recRef.current?.abort();
      if (cutoffRef.current) clearTimeout(cutoffRef.current);
    },
    []
  );

  const usable = engine === null ? supported : engine !== "none";
  return { supported: usable, engine, listening, transcribing, interim, error, start, stop };
}

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
