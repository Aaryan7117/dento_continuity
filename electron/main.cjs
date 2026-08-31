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

async function startServer() {
  if (isDev) {
    return 3000;
  }

  const nextCli = path.join(appDir, "node_modules", "next", "dist", "bin", "next");
  const port = 3456;
  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NODE_ENV: "production",
  };

  serverProcess = fork(nextCli, ["start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: appDir,
    env,
    stdio: "ignore",
  });

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

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
