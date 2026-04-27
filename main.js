const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const userService = require("./services/userService");
const migrate = require("./database/migrations");
const ensureDefaultUsers = require("./database/ensureDefaultUsers");

// ================================================================
// SESIÓN GLOBAL (proceso principal, persiste entre recargas)
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

  // DevTools solo en desarrollo
  if (process.env.NODE_ENV !== 'production') {
    win.webContents.openDevTools();
  }
}

// ================================================================
// INICIALIZACIÓN
// ================================================================
app.whenReady().then(async () => {
  try {
    await migrate();
    await ensureDefaultUsers();
    console.log("✅ Sistema inicializado correctamente.");
  } catch (err) {
    console.error("❌ Error de inicialización:", err);
  }

  createWindow();

  // ================================================================
  // IPC: LOGIN
  // ================================================================
  ipcMain.handle('login', async (event, username, password) => {
    try {
      const user = await userService.authenticate(username, password);
      if (user && user !== false) {
        if (user.error === "User deactivated") {
          return { success: false, message: "Usuario desactivado. Contacte al administrador." };
        }
        // Establecer sesión global
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
      return { success: false, message: "Error interno al iniciar sesión." };
    }
  });

  // ================================================================
  // IPC: OBTENER SESIÓN ACTIVA
  // ================================================================
  ipcMain.handle('get-session', async () => {
    return { ...currentSession };
  });

  // ================================================================
  // IPC: LOGOUT
  // ================================================================
  ipcMain.handle('logout', async () => {
    currentSession = { userId: null, userLevel: null, username: null };
    return { success: true };
  });

  // ================================================================
  // RBAC: Mapa de permisos por módulo y método
  // Nivel 1=ADMIN, 2=MANTENIMIENTO, 3=USER (menor nivel = más permisos)
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
    }
  };

  // ================================================================
  // IPC: API CALL GENÉRICO (con RBAC)
  // ================================================================
  ipcMain.handle('api-call', async (event, moduleName, methodName, ...args) => {
    try {
      // Validación RBAC
      const requiredLevel = PERMISSIONS[moduleName]?.[methodName];

      if (requiredLevel !== undefined) {
        if (!currentSession.userId) {
          return { success: false, error: "No autenticado. Por favor inicie sesión." };
        }
        if (currentSession.userLevel > requiredLevel) {
          return {
            success: false,
            error: `Acceso denegado: Su rol no tiene permisos para ejecutar '${methodName}'.`
          };
        }
      }

      const mod = require(`./modules/${moduleName}`);
      if (typeof mod[methodName] === 'function') {
        const result = await mod[methodName](...args);
        // Si el resultado ya tiene la forma {success, ...}, lo retornamos tal cual
        if (result && typeof result === 'object' && 'success' in result) {
          return result;
        }
        return { success: true, data: result };
      } else {
        return { success: false, error: `Método '${methodName}' no encontrado en módulo '${moduleName}'.` };
      }
    } catch (error) {
      console.error(`Error en ${moduleName}.${methodName}:`, error);
      return { success: false, error: error.message };
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});