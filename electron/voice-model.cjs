/**
 * On-device speech model for the desktop build.
 *
 * The installer stays small; the model (a public sherpa-onnx release, ~837 MB
 * compressed) is downloaded on first launch into the app's data folder and
 * found there by the server through VOICE_MODEL_DIR. Audio then never leaves
 * the machine. If the download is declined, the browser recogniser is used.
 */

const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { pipeline } = require("stream/promises");

const MODEL = {
  name: "sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25",
  url: "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-qwen3-asr-0.6B-int8-2026-03-25.tar.bz2",
  /** Files that must exist after extraction. */
  required: ["encoder.int8.onnx", "decoder.int8.onnx", "conv_frontend.onnx", "tokenizer"],
  approxBytes: 837 * 1024 * 1024,
};

function modelsDir() {
  return path.join(app.getPath("userData"), "models");
}

function isInstalled() {
  const dir = path.join(modelsDir(), MODEL.name);
  return MODEL.required.every((f) => fs.existsSync(path.join(dir, f)));
}

/** Follows GitHub's redirect to the CDN and streams the body to `file`. */
function fetchToFile(url, file, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "dento-continuity" } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
          res.resume();
          resolve(fetchToFile(res.headers.location, file, onProgress, redirects + 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        const total = Number(res.headers["content-length"]) || MODEL.approxBytes;
        let received = 0;
        res.on("data", (chunk) => {
          received += chunk.length;
          onProgress({ phase: "download", received, total });
        });
        const out = fs.createWriteStream(file);
        pipeline(res, out).then(resolve, reject);
      })
      .on("error", reject);
  });
}

async function extract(archive, destDir, onProgress) {
  // Lazy: these are only needed on the first launch.
  const unbzip2 = require("unbzip2-stream");
  const tar = require("tar");
  onProgress({ phase: "extract" });
  await pipeline(fs.createReadStream(archive), unbzip2(), tar.x({ cwd: destDir }));
}

/**
 * Downloads and unpacks the model. `onProgress` receives
 * { phase: "download", received, total } | { phase: "extract" } | { phase: "done" }.
 */
async function install(onProgress) {
  const dir = modelsDir();
  fs.mkdirSync(dir, { recursive: true });
  const archive = path.join(dir, `${MODEL.name}.tar.bz2.part`);
  try {
    await fetchToFile(MODEL.url, archive, onProgress);
    await extract(archive, dir, onProgress);
    if (!isInstalled()) throw new Error("The model files are missing after extraction.");
    onProgress({ phase: "done" });
  } finally {
    fs.rmSync(archive, { force: true });
  }
}

module.exports = { MODEL, modelsDir, isInstalled, install };
