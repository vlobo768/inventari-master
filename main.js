const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const userService = require("./services/userService");
const migrate = require("./database/migrations");
const ensureDefaultUsers = require("./database/ensureDefaultUsers");
const db = require("./database/db");

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
      const [res] = await db.execute(`DELETE FROM inventory_movements WHERE date < NOW() - INTERVAL ? DAY`, [parsedDays]);
      console.log(`✅ Kardex: Eliminados ${res.affectedRows} registros antiguos.`);
    } else if (mode === 'full_delete') {
      // Alerta: Esto afecta reportes de caja. Primero eliminamos items, luego cabeceras.
      await db.execute(`DELETE FROM sales_items WHERE sale_id IN (SELECT id FROM sales_header WHERE date < NOW() - INTERVAL ? DAY)`, [parsedDays]);
      const [res] = await db.execute(`DELETE FROM sales_header WHERE date < NOW() - INTERVAL ? DAY`, [parsedDays]);
      console.log(`✅ Ventas: Eliminados ${res.affectedRows} registros de ventas antiguas.`);
    }
  } catch (e) {
    console.error("❌ Error en auto-limpieza:", e.message);
  }
}

/**
 * SECUENCIA DE ARRANQUE (Boot Sequence)
 * Verifica dependencias críticas antes de lanzar la UI
 */
async function bootSequence() {
    console.log("🏁 Iniciando secuencia de arranque...");
    
    try {
        // 1. Verificar conexión a MySQL
        const connection = await db.testConnection();
        if (!connection.success) {
            throw new Error(`Base de datos no disponible: ${connection.error}`);
        }
        console.log("✅ Conexión MySQL verificada.");

        // 2. Ejecutar migraciones
        const migrationResult = await migrate();
        if (!migrationResult.success) {
            throw new Error(`Error en migraciones: ${migrationResult.error}`);
        }

        // 3. Asegurar usuarios admin
        await ensureDefaultUsers();
        console.log("✅ Usuarios iniciales verificados.");

        // 4. Auto-limpieza de 10 días
        await runAutoCleanup();

        console.log("🚀 Sistema listo para operar.");
        return { success: true };
    } catch (error) {
        console.error("❌ Error crítico en el arranque:", error.message);
        return { success: false, error: error.message };
    }
}

app.whenReady().then(async () => {
  const boot = await bootSequence();

  if (!boot.success) {
    // Mostrar error controlado al usuario antes de cerrar o iniciar en modo limitado
    dialog.showErrorBox(
      "Error de Inicialización",
      `El sistema no pudo iniciar correctamente:\n\n${boot.error}\n\nPor favor, verifique que el servidor MySQL esté ejecutándose y la base de datos 'oswa_inv' exista.`
    );
    // Dependiendo de la política, podríamos cerrar la app o permitir abrirla con errores
    // Para este caso, permitimos abrirla pero el login fallará elegantemente
  }

  createWindow();

  // ================================================================
  // IPC: LOGIN (Refactorizado para evitar crashes)
  // ================================================================
  ipcMain.handle('login', async (event, username, password) => {
    try {
      const user = await userService.authenticate(username, password);
      if (user && user !== false) {
        if (user.error === "User deactivated") {
          return { success: false, message: "Usuario desactivado. Contacte al administrador." };
        }
        currentSession = {
          userId: user.id,
          userLevel: user.user_level,
          username: user.username
        };
        await userService.updateLastLogin(user.id);
        return { success: true, user };
      } else {
        return { success: false, message: "Usuario o contraseña incorrectos." };
      }
    } catch (error) {
      console.error("Error en login:", error);
      if (error.message === "DATABASE_UNAVAILABLE") {
        return { success: false, message: "La base de datos no está disponible en este momento. Intente más tarde." };
      }
      return { success: false, message: "Error interno al iniciar sesión." };
    }
  });

  ipcMain.handle('get-session', async () => {
    return { ...currentSession };
  });

  ipcMain.handle('logout', async () => {
    currentSession = { userId: null, userLevel: null, username: null };
    return { success: true };
  });

  // ================================================================
  // RBAC: Mapa de permisos (1=ADMIN, 2=MANTENIMIENTO, 3=USER)
  // ================================================================
  const PERMISSIONS = {
    'users': { 
        'findAllGroups': 2, 
        'getAllUsers': 2, 
        'addUser': 1, 
        'updateUser': 1, 
        'deleteUser': 1, 
        'getUserProfile': 3, 
        'changePassword': 3, 
        'toggleUserStatus': 1 
    },
    'products': { 
        'getProductById': 3, 
        'getAllProducts': 3, 
        'addProduct': 2, 
        'updateProduct': 2, 
        'deleteProduct': 1, 
        'searchProductByName': 3, 
        'findProductForSale': 3, 
        'getProductKardex': 2 
    },
    'categories': { 
        'getCategoryById': 3, 
        'getAllCategories': 3, 
        'addCategory': 2, 
        'updateCategory': 2, 
        'deleteCategory': 1 
    },
    'sales': { 
        'getAllSales': 2, 
        'getDailySales': 2, 
        'getSalesByDateRange': 2, 
        'searchProduct': 3, 
        'addSale': 3, 
        'updateSale': 2, 
        'deleteSale': 1, 
        'getAnalytics': 2, 
        'getSaleDetails': 3 
    },
    'customers': { 
        'getAllCustomers': 3, 
        'addCustomer': 3, 
        'updateCustomer': 3, 
        'deleteCustomer': 2 
    },
    'suppliers': { 
        'getAllSuppliers': 3, 
        'addSupplier': 2, 
        'updateSupplier': 2, 
        'deleteSupplier': 1 
    },
    'cash': { 
        'openSession': 3, 
        'closeSession': 3, 
        'getActiveSession': 3, 
        'getSessionHistory': 2 
    },
    'purchases': { 
        'createPurchase': 2, 
        'getAllPurchases': 2, 
        'getPurchaseDetails': 2 
    },
    'dashboard': { 
        'getDashboardData': 3 
    },
    'settings': {
        'getSetting': 3,
        'getAllSettings': 3,
        'updateSetting': 1
    }
  };

  ipcMain.handle('api-call', async (event, moduleName, methodName, ...args) => {
    try {
      const requiredLevel = PERMISSIONS[moduleName]?.[methodName];
      if (requiredLevel !== undefined) {
        if (!currentSession.userId) return { success: false, error: "No autenticado." };
        if (currentSession.userLevel > requiredLevel) return { success: false, error: "Acceso denegado." };
      }
      const mod = require(`./modules/${moduleName}`);
      if (typeof mod[methodName] === 'function') {
        const result = await mod[methodName](...args);
        return (result && typeof result === 'object' && 'success' in result) ? result : { success: true, data: result };
      }
      return { success: false, error: `Método ${methodName} no encontrado.` };
    } catch (error) {
      console.error(`Error en ${moduleName}.${methodName}:`, error);
      return { success: false, error: error.message };
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // ================================================================
  // IPC: RECIBO DE VENTA
  // ================================================================
  ipcMain.on('open-receipt', (event, receiptData) => {
    const receiptWin = new BrowserWindow({
      width: 400,
      height: 600,
      title: "Recibo de Venta",
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Recibo de Venta</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; background: #fff; font-size: 14px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
          .header p { margin: 5px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .item-name { flex: 1; margin-right: 10px; }
          .divider { border-top: 1px dashed #000; margin: 15px 0; }
          .total { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; }
          .print-btn { display: block; width: 100%; padding: 12px; background: #2ecc71; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 30px; font-weight: bold; }
          .print-btn:hover { background: #27ae60; }
          @media print { .print-btn { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Ticket de Venta</h2>
          <p>Factura #${receiptData.saleId}</p>
          <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
          <p>Cliente: <strong>${receiptData.customerName || 'Consumidor Final'}</strong></p>
        </div>
        
        <div class="divider"></div>
        
        <div style="font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>CANT  DESCRIPCIÓN</span>
          <span>TOTAL</span>
        </div>

        ${receiptData.items.map(i => `
          <div class="item">
            <div class="item-name">${i.quantity}x ${i.name}</div>
            <div>$${i.total.toFixed(2)}</div>
          </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <div class="total">
          <span>Total USD:</span>
          <span>$${receiptData.total.toFixed(2)}</span>
        </div>
        <div class="total">
          <span>Total Bs:</span>
          <span>Bs ${(receiptData.total * receiptData.bcvRate).toFixed(2)}</span>
        </div>
        
        <div class="divider"></div>
        
        <p style="text-align:center; font-size: 14px;">Método de Pago: <strong>${receiptData.paymentMethod}</strong></p>
        <p style="text-align:center; margin-top:20px; font-size: 12px;">¡Gracias por su compra!</p>
        
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir Recibo</button>
      </body>
      </html>
    `;
    
    receiptWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });

  // ================================================================
  // IPC: ETIQUETA DE CÓDIGO DE BARRAS
  // ================================================================
  ipcMain.on('open-barcode-ticket', (event, ticketData) => {
    const barcodeWin = new BrowserWindow({
      width: 300,
      height: 400,
      title: "Etiqueta de Producto",
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const codeToPrint = ticketData.barcode || ticketData.sku || String(ticketData.id);
    const salePrice = parseFloat(ticketData.sale_price);
    const bcvRate = parseFloat(ticketData.bcvRate);
    const priceBs = salePrice * bcvRate;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Etiqueta de Código de Barras</title>
        <!-- Cargamos JsBarcode via CDN para generar las barras -->
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 10px; margin: 0; text-align: center; background: #fff; color: #000; }
          .product-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; word-wrap: break-word; }
          .price-container { display: flex; justify-content: space-around; margin: 10px 0; font-size: 18px; font-weight: bold; border: 2px solid #000; padding: 5px; border-radius: 5px; }
          .barcode-container { margin: 10px 0; display: flex; justify-content: center; }
          .print-btn { display: block; width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 20px; font-weight: bold; }
          .print-btn:hover { background: #2980b9; }
          @media print { .print-btn { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="product-name">${ticketData.name}</div>
        
        <div class="price-container">
          <span>$${salePrice.toFixed(2)}</span>
          <span>Bs ${priceBs.toFixed(2)}</span>
        </div>

        <div class="barcode-container">
          <svg id="barcode"></svg>
        </div>
        
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir Etiqueta</button>

        <script>
          // Generar el código de barras cuando la ventana cargue
          window.onload = function() {
            try {
              JsBarcode("#barcode", "${codeToPrint}", {
                format: "CODE128",
                width: 2,
                height: 80,
                displayValue: true,
                fontSize: 16,
                margin: 0
              });
            } catch(e) {
              document.getElementById('barcode').innerHTML = '<text x="10" y="20">Error generando código</text>';
            }
          };
        </script>
      </body>
      </html>
    `;
    
    barcodeWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
