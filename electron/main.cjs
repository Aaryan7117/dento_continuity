const { app, BrowserWindow, shell, ipcMain, Menu } = require("electron");
const path = require("path");
const http = require("http");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let mainWindow = null;
let serverInstance = null;

async function startServer() {
  if (isDev) {
    return 3000;
  }

  // In production, start the built Next.js server locally
  const next = require("next");
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname, ".."),
  });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    // Listen on port 0 to get an available system port
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      serverInstance = server;
      console.log(`DENTO Continuity server listening on http://127.0.0.1:${port}`);
      resolve(port);
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

async function createWindow() {
  let port = 3000;
  try {
    port = await startServer();
  } catch (err) {
    console.error("Failed to start server:", err);
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
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});
