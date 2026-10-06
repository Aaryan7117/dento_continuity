const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("voiceSetup", {
  start: () => ipcRenderer.send("voice-model:start"),
  later: () => ipcRenderer.send("voice-model:later"),
  onProgress: (cb) => ipcRenderer.on("voice-model:progress", (_e, p) => cb(p)),
});
