import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const standaloneDir = path.join(rootDir, ".next", "standalone");

console.log("Preparing Next.js standalone assets for desktop packaging...");

// 1. Copy public/ to .next/standalone/public
const publicSrc = path.join(rootDir, "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log("Copied public/ -> .next/standalone/public");
}

// 2. Copy .next/static/ to .next/standalone/.next/static
const staticSrc = path.join(rootDir, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log("Copied .next/static/ -> .next/standalone/.next/static");
}

// 3. Copy .env to .next/standalone/.env
const envSrc = path.join(rootDir, ".env");
const envDest = path.join(standaloneDir, ".env");
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log("Copied .env -> .next/standalone/.env");
}

console.log("Standalone preparation complete!");
