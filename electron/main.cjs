const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const http = require("http");
const fs = require("fs");
const { parse } = require("url");
const dotenv = require("dotenv");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const appDir = isDev ? path.join(__dirname, "..") : app.getAppPath();

// Setup log file for debugging
const logFile = path.join(app.getPath("userData"), "dento-desktop.log");
function log(msg, ...args) {
  const line = `[${new Date().toISOString()}] ${msg} ${args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ")}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch (_) {}
  console.log(msg, ...args);
}

log("Starting DENTO Continuity Desktop... AppDir:", appDir);

// Load environment variables from .env
const envPaths = [
  path.join(appDir, ".env"),
  path.join(process.resourcesPath, ".env"),
  path.join(process.resourcesPath, "app", ".env"),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    log("Loading .env from:", p);
    dotenv.config({ path: p });
  }
}

let mainWindow = null;
let serverInstance = null;

async function startServer() {
  if (isDev) {
    return 3000;
  }

  log("Initializing Next.js production engine...");
  const next = require("next");
  const nextApp = next({
    dev: false,
    dir: appDir,
    hostname: "127.0.0.1",
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();
  log("Next.js production engine prepared successfully.");

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        log("Server request error on URL:", req.url, err.message, err.stack);
        res.statusCode = 500;
        res.end(`Internal server error: ${err.message}`);
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      serverInstance = server;
      log(`DENTO Continuity server listening on http://127.0.0.1:${port}`);
      resolve(port);
    });

    server.on("error", (err) => {
      log("Server listen error:", err.message);
      reject(err);
    });
  });
}

async function createWindow() {
  let port = 3000;
  try {
    port = await startServer();
  } catch (err) {
    log("Failed to start internal server:", err.message, err.stack);
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

  log("Loading start URL in window:", startUrl);
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

app.on("window-all-closed", () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
