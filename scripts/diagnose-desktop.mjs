import { createRequire } from "module";
import http from "http";
import path from "path";
import { parse } from "url";
import dotenv from "dotenv";
import next from "next";

const require = createRequire(import.meta.url);

process.env.NODE_ENV = "production";
const appDir = "E:\\dento-continuity\\dist-desktop\\win-unpacked\\resources\\app";
process.env.NODE_PATH = path.join(appDir, "node_modules");
require("module").Module._initPaths();

dotenv.config({ path: path.join(appDir, ".env") });

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Defined" : "MISSING");
console.log("DIRECT_DATABASE_URL:", process.env.DIRECT_DATABASE_URL ? "Defined" : "MISSING");

const nextApp = next({
  dev: false,
  dir: appDir,
  hostname: "127.0.0.1",
});

const handle = nextApp.getRequestHandler();

async function test() {
  console.log("Preparing Next.js...");
  await nextApp.prepare();
  console.log("Next.js prepared!");

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("SERVER ERROR:", err);
      res.statusCode = 500;
      res.end(err.stack || err.message);
    }
  });

  server.listen(4455, "127.0.0.1", async () => {
    console.log("Listening on 4455. Fetching /front-desk...");
    try {
      const resp = await fetch("http://127.0.0.1:4455/front-desk");
      console.log("Status:", resp.status);
      const text = await resp.text();
      console.log("Response (first 500 chars):", text.slice(0, 500));
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

test();
