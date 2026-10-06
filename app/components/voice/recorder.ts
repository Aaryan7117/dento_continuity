"use client";

/**
 * Push-to-talk recorder that produces a 16 kHz, 16-bit mono WAV in the
 * browser, ready for the local transcription endpoint. No encoding library,
 * no server-side decoding: the audio is already in the model's format.
 */

const TARGET_RATE = 16000;

export interface Recorder {
  stop(): Promise<Blob>;
  /** Stops without producing audio. */
  cancel(): void;
  /** Peak level 0–1 of the latest buffer, for a simple meter. */
  level(): number;
}

export interface RecorderOptions {
  /** Called once the first audio frame has arrived: the microphone is really live. */
  onReady?: () => void;
}

export async function startRecording(opts: RecorderOptions = {}): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  // Browsers that honour the rate hand us 16 kHz directly; others are resampled below.
  let ctx: AudioContext;
  try {
    ctx = new AudioContext({ sampleRate: TARGET_RATE });
  } catch {
    ctx = new AudioContext();
  }
  if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessorNode is deprecated but universal; an AudioWorklet needs a
  // separately served file, which the desktop build makes awkward.
  const processor = ctx.createScriptProcessor(2048, 1, 1);
  const chunks: Float32Array[] = [];
  let peak = 0;
  let ready = false;
  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
    let p = 0;
    for (let i = 0; i < data.length; i += 16) p = Math.max(p, Math.abs(data[i]));
    peak = p;
    if (!ready) {
      ready = true;
      opts.onReady?.();
    }
  };
  source.connect(processor);
  processor.connect(ctx.destination);

  function teardown() {
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
  }

  return {
    level: () => peak,
    cancel() {
      teardown();
      void ctx.close();
    },
    async stop() {
      teardown();
      const inputRate = ctx.sampleRate;
      await ctx.close();
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const joined = new Float32Array(total);
      let off = 0;
      for (const c of chunks) {
        joined.set(c, off);
        off += c.length;
      }
      const pcm = inputRate === TARGET_RATE ? joined : resample(joined, inputRate, TARGET_RATE);
      return encodeWav(pcm, TARGET_RATE);
    },
  };
}

/** A short, quiet "go" tone so the user knows the microphone is live without looking. */
export function playReadyTone() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    osc.onended = () => void ctx.close();
  } catch {
    // The tone is a convenience only.
  }
}

function resample(input: Float32Array, from: number, to: number): Float32Array {
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, input.length - 1);
    out[i] = input[lo] + (input[hi] - input[lo]) * (pos - lo);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
