const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { fork } = require("child_process");
const dotenv = require("dotenv");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const appDir = isDev ? path.join(__dirname, "..") : app.getAppPath();

// Load .env
const envPaths = [
  path.join(appDir, ".env"),
  path.join(process.resourcesPath, ".env"),
  path.join(process.resourcesPath, "app", ".env"),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

let mainWindow = null;
let serverProcess = null;

/**
 * Resolve .next/node_modules symlinks that electron-builder can't copy.
 * Prisma v7 + Turbopack creates hashed symlinks like:
 *   .next/node_modules/@prisma/client-<hash> -> node_modules/@prisma/client
 *   .next/node_modules/pg-<hash>             -> node_modules/pg
 * We detect broken symlinks and copy the real modules in their place.
 */
function resolveNextSymlinks() {
  const nextNodeModules = path.join(appDir, ".next", "node_modules");
  if (!fs.existsSync(nextNodeModules)) return;

  // Mapping of hashed names -> real source packages
  const symlinkMap = {
    "@prisma/client-2c3a283f134fdcb6": path.join(appDir, "node_modules", "@prisma", "client"),
    "pg-587764f78a6c7a9c": path.join(appDir, "node_modules", "pg"),
  };

  for (const [hashedName, sourcePath] of Object.entries(symlinkMap)) {
    const targetPath = path.join(nextNodeModules, ...hashedName.split("/"));

    // Check if target already has the expected entry file
    const testFile = hashedName.startsWith("@prisma")
      ? path.join(targetPath, "runtime", "client.js")
      : path.join(targetPath, "lib", "index.js");

    if (fs.existsSync(testFile)) continue;

    // Remove broken symlink/directory if present
    try { fs.rmSync(targetPath, { recursive: true, force: true }); } catch (_) {}

    // Copy real module (cross-platform)
    if (fs.existsSync(sourcePath)) {
      try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to resolve symlink ${hashedName}:`, err);
      }
    }
  }
}

const net = require("net");

function getAvailablePort(preferredPort = 3456) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => {
      const fallback = net.createServer();
      fallback.once("error", () => resolve(3457));
      fallback.listen(0, "127.0.0.1", () => {
        const port = fallback.address().port;
        fallback.close(() => resolve(port));
      });
    });
    tester.listen(preferredPort, "127.0.0.1", () => {
      const port = tester.address().port;
      tester.close(() => resolve(port));
    });
  });
}

async function startServer() {
  if (isDev) {
    return 3000;
  }

  // Fix Windows symlink issues before starting the server
  resolveNextSymlinks();

  const nextCli = path.join(appDir, "node_modules", "next", "dist", "bin", "next");
  const port = await getAvailablePort(3456);
  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
  };

  const logFile = path.join(app.getPath("userData"), "server.log");
  const logStream = fs.createWriteStream(logFile, { flags: "a" });

  serverProcess = fork(nextCli, ["start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: appDir,
    env,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.pipe(logStream);
    serverProcess.stdout.pipe(process.stdout);
  }
  if (serverProcess.stderr) {
    serverProcess.stderr.pipe(logStream);
    serverProcess.stderr.pipe(process.stderr);
  }

  // Poll until the server is ready (max 15 seconds)
  for (let i = 0; i < 75; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/front-desk`);
      if (res.status === 200) {
        break;
      }
    } catch (_) {}
  }

  return port;
}

async function createWindow() {
  let port = 3000;
  try {
    port = await startServer();
  } catch (err) {
    console.error("Failed to start internal server:", err);
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    title: "DENTO Continuity — Intelligent Dental Practice Management",
    backgroundColor: "#080909",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const startUrl = isDev
    ? `http://localhost:${port}/front-desk`
    : `http://127.0.0.1:${port}/front-desk`;

  mainWindow.loadURL(startUrl);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.on("window-minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window-close", () => {
  if (mainWindow) mainWindow.close();
});

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function killServer() {
  if (serverProcess) {
    try {
      serverProcess.kill("SIGTERM");
    } catch (_) {}
    serverProcess = null;
  }
}

app.on("before-quit", () => {
  killServer();
});

app.on("window-all-closed", () => {
  killServer();
  app.quit();
});
