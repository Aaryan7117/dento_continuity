const { contextBridge, ipcRenderer } = require("electron");

// Expose safe desktop platform APIs to the renderer window
contextBridge.exposeInMainWorld("dentoDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: "1.0.0",
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
});
