const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Login: autentica y retorna el usuario real
  login: (username, password) => ipcRenderer.invoke('login', username, password),

  // Llamada genérica a módulos backend (RBAC protegido)
  apiCall: (moduleName, methodName, ...args) =>
    ipcRenderer.invoke('api-call', moduleName, methodName, ...args),

  // Obtener sesión activa del proceso principal
  getSession: () => ipcRenderer.invoke('get-session'),

  // Logout: limpiar sesión en proceso principal
  logout: () => ipcRenderer.invoke('logout'),

  // Abrir ventana de recibo
  openReceipt: (data) => ipcRenderer.send('open-receipt', data),

  // Abrir ventana de ticket de código de barras
  openBarcodeTicket: (data) => ipcRenderer.send('open-barcode-ticket', data),

  // Licenciamiento
  getMachineId: () => ipcRenderer.invoke('get-machine-id'),
  activateLicense: (key) => ipcRenderer.invoke('activate-license', key),
  getLicenseStatus: () => ipcRenderer.invoke('get-license-status')
});