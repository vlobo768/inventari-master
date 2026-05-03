const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("printAPI", {
  print: () => ipcRenderer.send("do-print"),
  close: () => ipcRenderer.send("close-print-win")
});
