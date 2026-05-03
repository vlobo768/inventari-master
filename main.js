const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const userService = require("./services/userService");
const migrate = require("./database/migrations");
const ensureDefaultUsers = require("./database/ensureDefaultUsers");
const db = require("./database/db");
const licenseService = require("./services/licenseService");

// ================================================================
// SESIÓN GLOBAL
// ================================================================
let currentSession = {
  userId: null,
  userLevel: null,
  username: null
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");

  if (process.env.NODE_ENV !== 'production') {
    win.webContents.openDevTools();
  }
}

function createActivationWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 650,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("activation.html");
}

/**
 * RUTINA DE AUTO-LIMPIEZA
 */
async function runAutoCleanup() {
  try {
    const SettingService = require('./services/settingService');
    const mode = await SettingService.getSetting('cleanup_mode') || 'kardex_only';
    const days = await SettingService.getSetting('cleanup_days') || '10';
    const parsedDays = parseInt(days);

    console.log(`🧹 Ejecutando auto-limpieza. Modo: ${mode}, Días: ${parsedDays}`);

    if (mode === 'kardex_only') {
      const [res] = await db.execute(`DELETE FROM inventory_movements WHERE date < datetime('now', '-' || ? || ' days')`, [parsedDays]);
      console.log(`✅ Kardex: Eliminados ${res.affectedRows} registros antiguos.`);
    } else if (mode === 'full_delete') {
      await db.execute(`DELETE FROM sales_items WHERE sale_id IN (SELECT id FROM sales_header WHERE date < datetime('now', '-' || ? || ' days'))`, [parsedDays]);
      const [res] = await db.execute(`DELETE FROM sales_header WHERE date < datetime('now', '-' || ? || ' days')`, [parsedDays]);
      console.log(`✅ Ventas: Eliminados ${res.affectedRows} registros de ventas antiguas.`);
    }
  } catch (e) {
    console.error("❌ Error en auto-limpieza:", e.message);
  }
}

/**
 * SECUENCIA DE ARRANQUE
 */
async function bootSequence() {
  try {
    const connection = await db.testConnection();
    if (!connection.success) throw new Error(`Base de datos no disponible: ${connection.error}`);
    await migrate();
    await ensureDefaultUsers();
    await runAutoCleanup();
    return { success: true };
  } catch (error) {
    console.error("❌ Error crítico en el arranque:", error.message);
    return { success: false, error: error.message };
  }
}

app.whenReady().then(async () => {
  const activation = licenseService.checkActivation();

  if (!activation.activated) {
    createActivationWindow();
    return;
  }

  const boot = await bootSequence();
  if (!boot.success) {
    dialog.showErrorBox("Error de Inicialización", boot.error);
  }
  createWindow();
});

// ================================================================
// RBAC: Mapa de permisos
// ================================================================
const PERMISSIONS = {
  'users': { 'findAllGroups': 2, 'getAllUsers': 2, 'addUser': 1, 'updateUser': 1, 'deleteUser': 1, 'getUserProfile': 3, 'changePassword': 3, 'toggleUserStatus': 1 },
  'products': { 'getProductById': 3, 'getAllProducts': 3, 'addProduct': 2, 'updateProduct': 2, 'deleteProduct': 1, 'searchProductByName': 3, 'findProductForSale': 3, 'getProductKardex': 2 },
  'categories': { 'getCategoryById': 3, 'getAllCategories': 3, 'addCategory': 2, 'updateCategory': 2, 'deleteCategory': 1 },
  'sales': { 'getAllSales': 2, 'getDailySales': 2, 'getSalesByDateRange': 2, 'searchProduct': 3, 'addSale': 3, 'updateSale': 2, 'deleteSale': 1, 'purgeSale': 1, 'getAnalytics': 2, 'getSaleDetails': 3 },
  'customers': { 'getAllCustomers': 3, 'addCustomer': 3, 'updateCustomer': 3, 'deleteCustomer': 2, 'getCreditHistory': 3, 'addPayment': 3 },
  'suppliers': { 'getAllSuppliers': 3, 'addSupplier': 2, 'updateSupplier': 2, 'deleteSupplier': 1, 'getPurchaseHistory': 3, 'addPayment': 3 },
  'cash': { 'openSession': 3, 'closeSession': 3, 'getActiveSession': 3, 'getSessionHistory': 2, 'clearSessionHistory': 1, 'deleteSession': 1, 'deleteFirstClosedSession': 1 },
  'purchases': { 'createPurchase': 2, 'getAllPurchases': 2, 'getPurchaseDetails': 2 },
  'dashboard': { 'getDashboardData': 3 },
  'settings': { 'getSetting': 3, 'getAllSettings': 3, 'updateSetting': 1 }
};

// ================================================================
// REGISTRO ÚNICO DE EVENTOS IPC
// ================================================================

ipcMain.handle('login', async (event, username, password) => {
  try {
    const user = await userService.authenticate(username, password);
    if (user && user !== false) {
      if (user.error === "User deactivated") return { success: false, message: "Usuario desactivado." };
      currentSession = { userId: user.id, userLevel: user.user_level, username: user.username };
      await userService.updateLastLogin(user.id);
      return { success: true, user };
    }
    return { success: false, message: "Usuario o contraseña incorrectos." };
  } catch (error) {
    return { success: false, message: "Error interno al iniciar sesión." };
  }
});

ipcMain.handle('get-session', async () => ({ ...currentSession }));
ipcMain.handle('logout', async () => { currentSession = { userId: null, userLevel: null, username: null }; return { success: true }; });

ipcMain.handle('api-call', async (event, moduleName, methodName, ...args) => {
  try {
    const requiredLevel = PERMISSIONS[moduleName]?.[methodName];
    if (requiredLevel !== undefined) {
      if (!currentSession.userId) return { success: false, error: "No autenticado." };
      if (currentSession.userLevel > requiredLevel) return { success: false, error: "Acceso denegado." };
    }
    const modulePath = path.join(__dirname, 'modules', `${moduleName}.js`);
    delete require.cache[require.resolve(modulePath)];
    const mod = require(modulePath);
    if (typeof mod[methodName] === 'function') {
      const result = await mod[methodName](...args);
      return (result && typeof result === 'object' && 'success' in result) ? result : { success: true, data: result };
    }
    return { success: false, error: `Método ${methodName} no encontrado.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// LICENCIAMIENTO
ipcMain.handle('get-machine-id', async () => {
  return licenseService.getMachineId();
});

ipcMain.handle('activate-license', async (event, key) => {
  const validation = licenseService.validateKey(key);
  if (validation.valid) {
    licenseService.saveLicense(key);
    return { success: true };
  }
  return { success: false, message: validation.message };
});

ipcMain.handle('get-license-status', async () => {
  return licenseService.checkActivation();
});

// IMPRESIÓN
ipcMain.removeAllListeners('do-print');
ipcMain.on('do-print', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.webContents.print({
    silent: true,
    printBackground: false,
    deviceName: '',
    pageSize: { width: 58500, height: 2970000 },
    margins: { marginType: 'none' }
  });
});

ipcMain.on('close-print-win', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

// RECIBO
ipcMain.removeAllListeners('open-receipt');
ipcMain.on('open-receipt', (event, receiptData) => {
  const receiptWin = new BrowserWindow({
    width: 250, height: 600, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload-print.js') }
  });

  const currency = receiptData.currency || 'USD';
  const bcvRate = parseFloat(receiptData.bcvRate || 1);

  const itemsHtml = (receiptData.items || []).map(i => {
    const qty = parseFloat(i.quantity);
    const price = parseFloat(i.price);
    const total = qty * price;

    let priceStr, totalStr;
    if (currency === 'VES') {
      priceStr = `Bs ${(price * bcvRate).toFixed(2)}`;
      totalStr = `Bs ${(total * bcvRate).toFixed(2)}`;
    } else {
      priceStr = `$${price.toFixed(2)}`;
      totalStr = `$${total.toFixed(2)}`;
    }

    return `
      <div class="ib">
        <div class="id">${i.name || 'Producto'}</div>
        <div class="is"><span>${qty.toFixed(3).replace(/\.?0+$/, '')} x ${priceStr}</span><span class="it">${totalStr}</span></div>
      </div>
    `;
  }).join('');

  let totalsHtml = '';
  if (currency === 'VES') {
    totalsHtml = `
      <div class="tu"><span>TOTAL Bs:</span><b>Bs ${(receiptData.total * bcvRate).toFixed(2)}</b></div>
    `;
  } else {
    totalsHtml = `
      <div class="tu"><span>TOTAL USD:</span><b>$${receiptData.total.toFixed(2)}</b></div>
      <div class="tb"><span>TOTAL Bs:</span>Bs ${(receiptData.total * bcvRate).toFixed(2)}</div>
    `;
  }

  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      @page { size: 58mm auto; margin: 0mm; }
      body { font-family:"Courier New",monospace; font-size:7pt; font-weight:bold; width:42mm; margin:0; padding:0 1mm; }
      .co { font-size:9pt; text-align:center; text-transform:uppercase; }
      .su { font-size:6pt; text-align:center; }
      .ls { border-top:0.6px solid #000; margin:0.8mm 0; }
      .ld { border-top:0.6px dashed #000; margin:0.8mm 0; }
      .rw { display:flex; justify-content:space-between; }
      .ib { margin:0.4mm 0; }
      .id { word-break:break-word; }
      .is { display:flex; justify-content:space-between; padding-left:1mm; font-size:6.5pt; }
      .it { font-weight:bold; }
      .tu { display:flex; justify-content:space-between; font-size:9pt; }
      .tb { display:flex; justify-content:space-between; color:#111; font-size:7pt; }
      .ft { text-align:center; font-size:6pt; margin-top:1.5mm; }
      .pb { display:none; }
    </style></head><body>
      <div class="co">COMERCIAL MI ENE</div>
      <div class="su">RIF: J-144338550</div>
      <div class="ls"></div>
      <div class="rw"><span>Factura #:</span><b>${receiptData.saleId}</b></div>
      <div class="rw"><span>Fecha:</span>${new Date().toLocaleDateString()}</div>
      <div class="rw"><span>Hora:</span>${(() => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    })()}</div>
      <div class="rw"><span>Cliente:</span>${receiptData.customerName || 'Consumidor Final'}</div>
      <div class="rw"><span>Pago:</span>${receiptData.paymentMethod || 'Efectivo'}</div>
      <div class="rw"><span>Tasa BCV:</span>${bcvRate.toFixed(2)} Bs/$</div>
      <div class="ld"></div>
      ${itemsHtml}
      <div class="ld"></div>
      ${totalsHtml}
      <div class="ls"></div>
      <div class="ft">Gracias por su compra!</div>
      <script>
        window.onload = function() {
          if (window.alreadyPrinted) return;
          window.alreadyPrinted = true;
          setTimeout(() => { if (window.printAPI) window.printAPI.print(); }, 800);
        };
      </script>
    </body></html>
  `;
  receiptWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});

// ETIQUETA
ipcMain.removeAllListeners('open-barcode-ticket');
ipcMain.on('open-barcode-ticket', (event, ticketData) => {
  const barcodeWin = new BrowserWindow({
    width: 220, height: 380, show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload-print.js') }
  });
  const priceBs = parseFloat(ticketData.sale_price) * parseFloat(ticketData.bcvRate || 1);
  const html = `
    <!DOCTYPE html><html><head><meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; font-weight:bold; width:42mm; margin:0; padding:1mm; text-align:center; }
      .pn { font-size:9pt; text-transform:uppercase; margin-bottom:2mm; }
      .pu { font-size:16pt; color:#000; margin-bottom:1mm; }
      .bw { display:flex; justify-content:center; margin-top:1mm; }
      .bw svg { max-width:38mm; height:auto; }
    </style></head><body>
      <div class="pn">${ticketData.name}</div>
      <div class="pu">$${parseFloat(ticketData.sale_price).toFixed(2)}</div>
      <div class="bw"><svg id="barcode"></svg></div>
      <script>
        window.onload = function() {
          try {
            if (typeof JsBarcode === 'function') {
              JsBarcode("#barcode", "${ticketData.barcode || ticketData.sku || '0000'}", {
                format: "CODE128",
                width: 1.8,
                height: 45,
                displayValue: true,
                fontSize: 12
              });
            }
          } catch (e) {
            console.error("Error generando código de barras:", e);
          }

          if (window.alreadyPrinted) return;
          window.alreadyPrinted = true;
          
          setTimeout(() => { 
            if (window.printAPI) {
              window.printAPI.print();
              // Cerrar la ventana oculta después de enviar a la cola de impresión
              setTimeout(() => { window.printAPI.close(); }, 2000);
            }
          }, 800);
        };
      </script>
    </body></html>
  `;
  barcodeWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
