import { contextBridge, ipcRenderer } from "electron";

const api = {
  login: (username: string, password: string) =>
    ipcRenderer.invoke("auth:login", username, password),

  registerSession: (
    sessionId: string,
    cashierId: number,
    displayName: string,
    role: string
  ) => ipcRenderer.invoke("session:register", sessionId, cashierId, displayName, role),
  unregisterSession: (sessionId: string) => ipcRenderer.invoke("session:unregister", sessionId),
  touchSession: (sessionId: string) => ipcRenderer.invoke("session:touch", sessionId),
  listActiveSessions: () => ipcRenderer.invoke("session:list"),

  listProducts: (search?: string) => ipcRenderer.invoke("products:list", search),
  findByBarcode: (barcode: string) => ipcRenderer.invoke("products:barcode", barcode),
  saveProduct: (data: unknown) => ipcRenderer.invoke("products:save", data),
  listLowStock: () => ipcRenderer.invoke("products:lowStock"),
  listSuppliers: () => ipcRenderer.invoke("suppliers:list"),
  saveSupplier: (data: unknown) => ipcRenderer.invoke("suppliers:save", data),

  checkout: (cashierId: number, items: unknown[], paymentMethod: string) =>
    ipcRenderer.invoke("sales:checkout", cashierId, items, paymentMethod),
  refundSale: (
    saleId: number,
    authorizedById: number,
    authCode: string,
    requesterRole: string
  ) => ipcRenderer.invoke("sales:refund", saleId, authorizedById, authCode, requesterRole),
  listSales: (limit?: number) => ipcRenderer.invoke("sales:list", limit),
  getSale: (id: number) => ipcRenderer.invoke("sales:get", id),

  dashboardStats: () => ipcRenderer.invoke("dashboard:stats"),
  getAnalytics: () => ipcRenderer.invoke("analytics:get"),
  exportReport: (period: "daily" | "weekly" | "monthly") =>
    ipcRenderer.invoke("reports:export", period),

  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSetting: (key: string, value: string) => ipcRenderer.invoke("settings:set", key, value),

  syncPush: () => ipcRenderer.invoke("sync:push"),
  syncHeartbeat: () => ipcRenderer.invoke("sync:heartbeat"),
  syncHealth: () => ipcRenderer.invoke("sync:health"),
  getMonitorUrl: () => ipcRenderer.invoke("monitor:url"),
  openMonitor: () => ipcRenderer.invoke("monitor:open"),
};

contextBridge.exposeInMainWorld("fusionpos", api);

export type FusionPosApi = typeof api;
