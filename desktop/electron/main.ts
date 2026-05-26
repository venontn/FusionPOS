import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "path";

import { FusionDatabase } from "./database";
import { checkApiHealth, getMonitorUrl, pushToCloud, sendHeartbeat } from "./sync";

let db: FusionDatabase;
let mainWindow: BrowserWindow | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: "FusionPOS",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function startHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    void sendHeartbeat(db);
  }, 30_000);
  void sendHeartbeat(db);
}

app.whenReady().then(() => {
  db = new FusionDatabase(app.getPath("userData"));
  registerIpc();
  startHeartbeat();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (process.platform !== "darwin") app.quit();
});

function registerIpc(): void {
  ipcMain.handle("auth:login", (_, username: string, password: string) =>
    db.login(username, password)
  );

  ipcMain.handle(
    "session:register",
    (_, sessionId: string, cashierId: number, displayName: string, role: string) => {
      db.registerSession(sessionId, cashierId, displayName, role);
    }
  );
  ipcMain.handle("session:unregister", (_, sessionId: string) => {
    db.unregisterSession(sessionId);
  });
  ipcMain.handle("session:touch", (_, sessionId: string) => {
    db.touchSession(sessionId);
  });
  ipcMain.handle("session:list", () => db.listActiveSessions());

  ipcMain.handle("products:list", (_, search?: string) => db.listProducts(search));
  ipcMain.handle("products:barcode", (_, barcode: string) => db.findByBarcode(barcode));
  ipcMain.handle("products:save", (_, data) => db.saveProduct(data));
  ipcMain.handle("products:lowStock", () => db.listLowStock());

  ipcMain.handle("suppliers:list", () => db.listSuppliers());
  ipcMain.handle("suppliers:save", (_, data) => db.saveSupplier(data));

  ipcMain.handle("sales:checkout", (_, cashierId, items, paymentMethod) =>
    db.checkout(cashierId, items, paymentMethod)
  );
  ipcMain.handle(
    "sales:refund",
    (_, saleId: number, authorizedById: number, authCode: string, requesterRole: string) =>
      db.refundSale(saleId, authorizedById, authCode, requesterRole)
  );
  ipcMain.handle("sales:list", (_, limit?: number) => db.listSales(limit));
  ipcMain.handle("sales:get", (_, id: number) => db.getSale(id));

  ipcMain.handle("dashboard:stats", () => db.dashboardStats());
  ipcMain.handle("analytics:get", () => db.getAnalytics());
  ipcMain.handle("reports:export", (_, period: "daily" | "weekly" | "monthly") =>
    db.exportReportCsv(period)
  );

  ipcMain.handle("settings:get", () => db.getSettings());
  ipcMain.handle("settings:set", (_, key: string, value: string) => db.setSetting(key, value));

  ipcMain.handle("sync:push", () => pushToCloud(db));
  ipcMain.handle("sync:heartbeat", () => sendHeartbeat(db));
  ipcMain.handle("sync:health", async () => {
    const settings = db.getSettings();
    const url = settings.api_url || "http://127.0.0.1:8000/api";
    return checkApiHealth(url);
  });
  ipcMain.handle("monitor:url", () => {
    const settings = db.getSettings();
    return getMonitorUrl(settings);
  });
  ipcMain.handle("monitor:open", async () => {
    const settings = db.getSettings();
    await shell.openExternal(getMonitorUrl(settings));
  });
}
