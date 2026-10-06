import http from "http";
import path from "path";
import { fork } from "child_process";
import dotenv from "dotenv";

const standaloneDir = "E:\\dento-continuity\\.next\\standalone";

dotenv.config({ path: path.join(standaloneDir, ".env") });

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Defined" : "MISSING");

const serverProcess = fork(path.join(standaloneDir, "server.js"), [], {
  env: {
    ...process.env,
    PORT: "4456",
    HOSTNAME: "127.0.0.1",
  },
  cwd: standaloneDir,
  stdio: "inherit",
});

setTimeout(async () => {
  console.log("Fetching http://127.0.0.1:4456/front-desk...");
  try {
    const resp = await fetch("http://127.0.0.1:4456/front-desk");
    console.log("Status:", resp.status);
    const text = await resp.text();
    console.log("Response length:", text.length);
    console.log("Snippet:", text.slice(0, 300));
  } catch (e) {
    console.error("Fetch error:", e);
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}, 2000);
