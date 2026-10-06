/**
 * Local speech recognition on the machine running this server.
 *
 * Loads a sherpa-onnx model once and keeps it in memory. Which model is a
 * folder decision: `VOICE_MODEL_DIR` (or `models/` in the project) holding a
 * Qwen3-ASR or Omnilingual export from the sherpa-onnx releases. When no model
 * is present, `isAvailable()` is false and the browser's own recogniser is used.
 *
 * Audio never leaves the machine. The desktop build downloads the model on
 * first launch; the web build simply has none.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

export interface LocalAsrInfo {
  available: boolean;
  engine: "qwen3-asr" | "omnilingual" | null;
  modelDir: string | null;
}

interface Recognizer {
  createStream(): Stream;
  decode(stream: Stream): void;
  getResult(stream: Stream): { text: string; lang?: string };
}
interface Stream {
  acceptWaveform(input: { sampleRate: number; samples: Float32Array }): void;
}

const SAMPLE_RATE = 16000;

function modelsRoot(): string {
  return process.env.VOICE_MODEL_DIR ?? path.resolve(process.cwd(), "models");
}

function findModel(): { engine: LocalAsrInfo["engine"]; dir: string } | null {
  const root = modelsRoot();
  if (!fs.existsSync(root)) return null;
  const names = fs.readdirSync(root);
  const qwen = names.find((n) => n.startsWith("sherpa-onnx-qwen3-asr"));
  if (qwen && fs.existsSync(path.join(root, qwen, "encoder.int8.onnx"))) {
    return { engine: "qwen3-asr", dir: path.join(root, qwen) };
  }
  const omni = names.find((n) => n.startsWith("sherpa-onnx-omnilingual"));
  if (omni && fs.existsSync(path.join(root, omni, "tokens.txt"))) {
    return { engine: "omnilingual", dir: path.join(root, omni) };
  }
  return null;
}


let loaded: { engine: LocalAsrInfo["engine"]; dir: string; recognizer: Recognizer; hotwordsKey: string } | null = null;
let loading: Promise<Recognizer> | null = null;

function buildConfig(engine: LocalAsrInfo["engine"], dir: string, hotwords: string[]) {
  const threads = Math.max(2, Math.min(4, os.cpus().length - 1));
  if (engine === "qwen3-asr") {
    return {
      featConfig: { sampleRate: SAMPLE_RATE, featureDim: 80 },
      modelConfig: {
        qwen3Asr: {
          convFrontend: path.join(dir, "conv_frontend.onnx"),
          encoder: path.join(dir, "encoder.int8.onnx"),
          decoder: path.join(dir, "decoder.int8.onnx"),
          tokenizer: path.join(dir, "tokenizer"),
          // Comma-separated context the model is nudged towards (names, Hindi words).
          hotwords: hotwords.join(","),
        },
        tokens: "",
        numThreads: threads,
        provider: "cpu",
        debug: 0,
      },
    };
  }
  const model = fs.readdirSync(dir).find((n) => n.endsWith(".onnx"))!;
  return {
    featConfig: { sampleRate: SAMPLE_RATE, featureDim: 80 },
    modelConfig: {
      omnilingual: { model: path.join(dir, model) },
      tokens: path.join(dir, "tokens.txt"),
      numThreads: threads,
      provider: "cpu",
      debug: 0,
    },
  };
}

export function localAsrInfo(): LocalAsrInfo {
  const found = findModel();
  return found
    ? { available: true, engine: found.engine, modelDir: found.dir }
    : { available: false, engine: null, modelDir: null };
}

/** Loads once; a changed hotword list reloads (Qwen3 reads it at load time). */
async function getRecognizer(hotwords: string[]): Promise<Recognizer | null> {
  const found = findModel();
  if (!found) return null;
  const key = found.engine === "qwen3-asr" ? hotwords.join("|") : "";
  if (loaded && loaded.dir === found.dir && loaded.hotwordsKey === key) return loaded.recognizer;
  if (loading) return loading;

  loading = (async () => {
    const require = createRequire(import.meta.url);
    // Native binding; resolved at runtime so the web build never bundles it.
    const sherpa = require("sherpa-onnx-node");
    const recognizer: Recognizer = new sherpa.OfflineRecognizer(buildConfig(found.engine, found.dir, hotwords));
    loaded = { engine: found.engine, dir: found.dir, recognizer, hotwordsKey: key };
    return recognizer;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

/** Parses a 16-bit PCM WAV (any sample rate; mono preferred) into float samples. */
export function decodeWav(buffer: Buffer): { sampleRate: number; samples: Float32Array } {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a WAV file");
  }
  let offset = 12;
  let sampleRate = SAMPLE_RATE;
  let channels = 1;
  let bits = 16;
  let data: Buffer | null = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bits = buffer.readUInt16LE(body + 14);
    } else if (id === "data") {
      data = buffer.subarray(body, Math.min(body + size, buffer.length));
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!data) throw new Error("WAV has no data chunk");
  if (bits !== 16) throw new Error("Only 16-bit PCM WAV is supported");

  const frames = Math.floor(data.length / 2 / channels);
  const samples = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    // Downmix by taking the first channel; clinic mics are mono anyway.
    samples[i] = data.readInt16LE(i * 2 * channels) / 32768;
  }
  return { sampleRate, samples };
}

/** Plain linear resample to 16 kHz when a browser could not record at that rate. */
export function resampleTo16k(samples: Float32Array, from: number): Float32Array {
  if (from === SAMPLE_RATE) return samples;
  const ratio = from / SAMPLE_RATE;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, samples.length - 1);
    out[i] = samples[lo] + (samples[hi] - samples[lo]) * (pos - lo);
  }
  return out;
}

/**
 * Loads the model ahead of the first clip (about five seconds on a laptop).
 * Called when a page probes for the engine, so the first command is quick.
 */
let warming: Promise<void> | null = null;
export function warmUp(hotwords: string[] = []): Promise<void> {
  if (!warming) {
    warming = getRecognizer(hotwords)
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        warming = null;
      });
  }
  return warming;
}

export interface TranscribeResult {
  text: string;
  engine: NonNullable<LocalAsrInfo["engine"]>;
  audioSeconds: number;
  decodeMs: number;
}

export async function transcribeWav(wav: Buffer, hotwords: string[] = []): Promise<TranscribeResult | null> {
  const recognizer = await getRecognizer(hotwords);
  if (!recognizer || !loaded) return null;
  const { sampleRate, samples } = decodeWav(wav);
  const pcm = resampleTo16k(samples, sampleRate);
  const stream = recognizer.createStream();
  stream.acceptWaveform({ sampleRate: SAMPLE_RATE, samples: pcm });
  const start = performance.now();
  recognizer.decode(stream);
  const decodeMs = performance.now() - start;
  return {
    text: (recognizer.getResult(stream).text ?? "").trim(),
    engine: loaded.engine!,
    audioSeconds: pcm.length / SAMPLE_RATE,
    decodeMs,
  };
}
