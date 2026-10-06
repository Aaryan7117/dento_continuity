/**
 * Benchmarks a local speech model on the test WAVs in models/test-audio.
 *
 *   npx tsx scripts/voice-bench.ts qwen3 [--hotwords]
 *   npx tsx scripts/voice-bench.ts omni
 *
 * Reports time per file, realtime factor, memory, and word error rate against
 * models/test-audio/expected.txt. Nothing here touches the database.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sherpa = require("sherpa-onnx-node");

const MODELS = path.resolve("models");
const AUDIO = path.join(MODELS, "test-audio");
const which = process.argv[2] ?? "qwen3";
const useHotwords = process.argv.includes("--hotwords");

function findDir(prefix: string): string {
  const d = fs.readdirSync(MODELS).find((n) => n.startsWith(prefix));
  if (!d) throw new Error(`No model folder starting with ${prefix} in ${MODELS}`);
  return path.join(MODELS, d);
}

function config() {
  const threads = Math.max(2, Math.min(4, (require("node:os").cpus().length || 2) - 1));
  if (which === "qwen3") {
    const dir = findDir("sherpa-onnx-qwen3-asr");
    // A comma-separated list, not a file: the model reads it as context.
    const hot = useHotwords
      ? fs.readFileSync(path.join(AUDIO, "hotwords.txt"), "utf8").split(/\r?\n/).filter(Boolean).join(",")
      : "";
    return {
      featConfig: { sampleRate: 16000, featureDim: 80 },
      modelConfig: {
        qwen3Asr: {
          convFrontend: path.join(dir, "conv_frontend.onnx"),
          encoder: path.join(dir, "encoder.int8.onnx"),
          decoder: path.join(dir, "decoder.int8.onnx"),
          tokenizer: path.join(dir, "tokenizer"),
          hotwords: hot,
        },
        tokens: "",
        numThreads: threads,
        provider: "cpu",
        debug: 0,
      },
    };
  }
  const dir = findDir("sherpa-onnx-omnilingual");
  const model = fs.readdirSync(dir).find((n) => n.endsWith(".onnx"))!;
  return {
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      omnilingual: { model: path.join(dir, model) },
      tokens: path.join(dir, "tokens.txt"),
      numThreads: threads,
      provider: "cpu",
      debug: 0,
    },
  };
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

function wer(ref: string, hyp: string): number {
  const r = norm(ref).split(" ").filter(Boolean);
  const h = norm(hyp).split(" ").filter(Boolean);
  const d: number[][] = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++)
    for (let j = 1; j <= h.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return r.length ? d[r.length][h.length] / r.length : 0;
}

async function main() {
  const expected = new Map(
    fs.readFileSync(path.join(AUDIO, "expected.txt"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => {
      const [id, ...rest] = l.split("|");
      return [id, rest.join("|")] as const;
    })
  );

  const t0 = performance.now();
  const recognizer = new sherpa.OfflineRecognizer(config());
  const loadMs = performance.now() - t0;
  const memAfterLoad = process.memoryUsage().rss / 1048576;
  console.log(`model: ${which}${useHotwords ? " +hotwords" : ""} | load ${loadMs.toFixed(0)} ms | rss ${memAfterLoad.toFixed(0)} MB`);

  let totalAudio = 0, totalMs = 0, totalWer = 0, n = 0;
  for (const [id, ref] of expected) {
    const file = path.join(AUDIO, `${id}.wav`);
    if (!fs.existsSync(file)) continue;
    const wave = sherpa.readWave(file);
    const seconds = wave.samples.length / wave.sampleRate;
    const stream = recognizer.createStream();
    stream.acceptWaveform({ sampleRate: wave.sampleRate, samples: wave.samples });
    const s = performance.now();
    recognizer.decode(stream);
    const ms = performance.now() - s;
    const text: string = recognizer.getResult(stream).text ?? "";
    const w = wer(ref, text);
    totalAudio += seconds; totalMs += ms; totalWer += w; n++;
    console.log(`${id} | ${seconds.toFixed(1)}s audio | ${ms.toFixed(0)} ms | WER ${(w * 100).toFixed(0)}%\n    ref: ${ref}\n    got: ${text.trim()}`);
  }
  const peak = process.memoryUsage().rss / 1048576;
  console.log(`\nfiles ${n} | audio ${totalAudio.toFixed(1)}s | decode ${totalMs.toFixed(0)} ms | realtime factor ${(totalMs / 1000 / totalAudio).toFixed(2)} | mean WER ${((totalWer / n) * 100).toFixed(0)}% | rss ${peak.toFixed(0)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
