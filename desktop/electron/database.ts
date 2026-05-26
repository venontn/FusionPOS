import crypto from "crypto";
import fs from "fs";
import path from "path";

import Database from "better-sqlite3";

export type Cashier = {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "cashier";
};

export type Product = {
  id: number;
  barcode: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock_qty: number;
  reorder_level: number;
  supplier_id: number | null;
  supplier_name?: string;
  is_active: number;
};

export type Supplier = {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
};

export type CartItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
};

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export class FusionDatabase {
  private db: Database.Database;

  constructor(userDataPath: string) {
    const dir = path.join(userDataPath, "fusionpos");
    fs.mkdirSync(dir, { recursive: true });
    const dbPath = path.join(dir, "fusionpos.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
    this.upgradeSchema();
    this.seedIfEmpty();
    this.ensureDefaultSettings();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cashiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        address TEXT DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT DEFAULT '',
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        price REAL NOT NULL,
        cost REAL NOT NULL DEFAULT 0,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 5,
        supplier_id INTEGER REFERENCES suppliers(id),
        is_active INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_no TEXT NOT NULL UNIQUE,
        cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
        subtotal REAL NOT NULL,
        tax REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name TEXT NOT NULL,
        qty_change INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reference_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS active_sessions (
        session_id TEXT PRIMARY KEY,
        cashier_id INTEGER NOT NULL REFERENCES cashiers(id),
        display_name TEXT NOT NULL,
        role TEXT NOT NULL,
        started_at TEXT NOT NULL,
        last_seen TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
    `);
  }

  private upgradeSchema(): void {
    const saleCols = this.db.prepare("PRAGMA table_info(sales)").all() as { name: string }[];
    if (!saleCols.some((c) => c.name === "refunded_by")) {
      this.db.exec("ALTER TABLE sales ADD COLUMN refunded_by INTEGER");
      this.db.exec("ALTER TABLE sales ADD COLUMN refund_auth TEXT");
    }
  }

  private seedIfEmpty(): void {
    const count = this.db.prepare("SELECT COUNT(*) as c FROM cashiers").get() as { c: number };
    if (count.c > 0) return;

    const insertCashier = this.db.prepare(
      "INSERT INTO cashiers (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)"
    );
    insertCashier.run("admin", hashPassword("admin123"), "Store Admin", "admin");
    insertCashier.run("cashier", hashPassword("cashier123"), "Front Counter", "cashier");

    const supplierId = this.db
      .prepare(
        "INSERT INTO suppliers (name, contact_person, phone, email) VALUES (?, ?, ?, ?)"
      )
      .run("Harare Wholesale Traders", "T. Moyo", "+263 77 000 0000", "orders@example.co.zw")
      .lastInsertRowid;

    const products = [
      ["8901001", "Maize Meal 10kg", "Grocery", 8.5, 120, 20],
      ["8901002", "Cooking Oil 2L", "Grocery", 6.75, 80, 15],
      ["8901003", "Fresh Bread Loaf", "Bakery", 1.2, 45, 10],
      ["8901004", "Bottled Water 500ml", "Beverages", 0.8, 200, 50],
      ["8901005", "Liquid Soap 750ml", "Household", 3.4, 35, 8],
      ["8901006", "Rice 2kg", "Grocery", 4.25, 60, 12],
      ["8901007", "Sugar 2kg", "Grocery", 3.9, 55, 12],
      ["8901008", "Toothpaste 100g", "Personal Care", 2.1, 40, 10],
    ];

    const insertProduct = this.db.prepare(`
      INSERT INTO products (barcode, name, category, price, cost, stock_qty, reorder_level, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [barcode, name, category, price, stock, reorder] of products) {
      insertProduct.run(
        barcode,
        name,
        category,
        price,
        price * 0.7,
        stock,
        reorder,
        supplierId
      );
    }

    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("store_name", "FusionPOS Demo Store");
    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("tax_rate", "0");
    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("api_url", "http://127.0.0.1:8000/api");
    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("refund_pin", "REFUND2026");
    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("shop_id", "001");
    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("shop_name", "Harare CBD Supermarket");
    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run("terminal_id", "T01");
  }

  private ensureDefaultSettings(): void {
    const defaults: Record<string, string> = {
      refund_pin: "REFUND2026",
      shop_id: "001",
      shop_name: "Harare CBD Supermarket",
      terminal_id: "T01",
    };
    for (const [key, value] of Object.entries(defaults)) {
      const row = this.db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
      if (!row) this.setSetting(key, value);
    }

    const current = this.getSettings();
    if (current.shop_id === "SHOP-DEMO-001") {
      this.setSetting("shop_id", "001");
      this.setSetting("shop_name", "Harare CBD Supermarket");
    }
    if (current.terminal_id === "TERM-01") {
      this.setSetting("terminal_id", "T01");
    }
  }

  login(username: string, password: string): Cashier | null {
    const row = this.db
      .prepare(
        `SELECT id, username, display_name, role, password_hash
         FROM cashiers WHERE username = ? AND is_active = 1`
      )
      .get(username) as
      | (Cashier & { password_hash: string })
      | undefined;

    if (!row || row.password_hash !== hashPassword(password)) return null;
    return { id: row.id, username: row.username, display_name: row.display_name, role: row.role };
  }

  listProducts(search = ""): Product[] {
    const q = `%${search.trim()}%`;
    return this.db
      .prepare(
        `SELECT p.*, s.name as supplier_name FROM products p
         LEFT JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.is_active = 1 AND (p.name LIKE ? OR p.barcode LIKE ? OR p.category LIKE ?)
         ORDER BY p.name`
      )
      .all(q, q, q) as Product[];
  }

  findByBarcode(barcode: string): Product | undefined {
    return this.db
      .prepare(
        `SELECT p.*, s.name as supplier_name FROM products p
         LEFT JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.is_active = 1 AND p.barcode = ?`
      )
      .get(barcode) as Product | undefined;
  }

  getProduct(id: number): Product | undefined {
    return this.db
      .prepare(
        `SELECT p.*, s.name as supplier_name FROM products p
         LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?`
      )
      .get(id) as Product | undefined;
  }

  saveProduct(data: Partial<Product> & { name: string; price: number }): Product {
    if (data.id) {
      this.db
        .prepare(
          `UPDATE products SET barcode=?, name=?, category=?, price=?, cost=?, stock_qty=?,
           reorder_level=?, supplier_id=?, is_active=?, updated_at=datetime('now') WHERE id=?`
        )
        .run(
          data.barcode ?? "",
          data.name,
          data.category ?? "",
          data.price,
          data.cost ?? 0,
          data.stock_qty ?? 0,
          data.reorder_level ?? 5,
          data.supplier_id ?? null,
          data.is_active ?? 1,
          data.id
        );
      return this.getProduct(data.id)!;
    }
    const result = this.db
      .prepare(
        `INSERT INTO products (barcode, name, category, price, cost, stock_qty, reorder_level, supplier_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.barcode ?? "",
        data.name,
        data.category ?? "",
        data.price,
        data.cost ?? 0,
        data.stock_qty ?? 0,
        data.reorder_level ?? 5,
        data.supplier_id ?? null
      );
    return this.getProduct(Number(result.lastInsertRowid))!;
  }

  listLowStock(): Product[] {
    return this.db
      .prepare(
        `SELECT p.*, s.name as supplier_name FROM products p
         LEFT JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.is_active = 1 AND p.stock_qty <= p.reorder_level ORDER BY p.stock_qty`
      )
      .all() as Product[];
  }

  listSuppliers(): Supplier[] {
    return this.db.prepare("SELECT * FROM suppliers ORDER BY name").all() as Supplier[];
  }

  saveSupplier(data: Partial<Supplier> & { name: string }): Supplier {
    if (data.id) {
      this.db
        .prepare(
          `UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, address=?,
           updated_at=datetime('now') WHERE id=?`
        )
        .run(
          data.name,
          data.contact_person ?? "",
          data.phone ?? "",
          data.email ?? "",
          data.address ?? "",
          data.id
        );
      return this.db.prepare("SELECT * FROM suppliers WHERE id=?").get(data.id) as Supplier;
    }
    const r = this.db
      .prepare(
        "INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        data.name,
        data.contact_person ?? "",
        data.phone ?? "",
        data.email ?? "",
        data.address ?? ""
      );
    return this.db
      .prepare("SELECT * FROM suppliers WHERE id=?")
      .get(r.lastInsertRowid) as Supplier;
  }

  checkout(
    cashierId: number,
    items: CartItem[],
    paymentMethod: string
  ): { saleId: number; receiptNo: string; total: number } {
    if (!items.length) throw new Error("Cart is empty");

    const taxRate = parseFloat(
      (this.db.prepare("SELECT value FROM settings WHERE key='tax_rate'").get() as { value: string })
        ?.value ?? "0"
    );

    const txn = this.db.transaction(() => {
      for (const item of items) {
        const product = this.getProduct(item.product_id);
        if (!product || product.stock_qty < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product_name}`);
        }
      }

      const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      const receiptNo = `FP-${Date.now().toString(36).toUpperCase()}`;
      const createdAt = new Date().toISOString();

      const sale = this.db
        .prepare(
          `INSERT INTO sales (receipt_no, cashier_id, subtotal, tax, total, payment_method, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(receiptNo, cashierId, subtotal, tax, total, paymentMethod, createdAt);

      const saleId = Number(sale.lastInsertRowid);
      const insertItem = this.db.prepare(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const updateStock = this.db.prepare(
        "UPDATE products SET stock_qty = stock_qty - ?, updated_at=datetime('now') WHERE id = ?"
      );

      for (const item of items) {
        insertItem.run(
          saleId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.unit_price * item.quantity
        );
        updateStock.run(item.quantity, item.product_id);
        this.recordStockMovement(
          item.product_id,
          item.product_name,
          -item.quantity,
          "sale",
          saleId
        );
      }

      return { saleId, receiptNo, total };
    });

    return txn();
  }

  recordStockMovement(
    productId: number,
    productName: string,
    qtyChange: number,
    reason: string,
    referenceId?: number
  ): void {
    this.db
      .prepare(
        `INSERT INTO stock_movements (product_id, product_name, qty_change, reason, reference_id)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(productId, productName, qtyChange, reason, referenceId ?? null);
  }

  verifyRefundAuth(authCode: string, requesterRole: string): { ok: boolean; method: string } {
    if (!authCode.trim()) return { ok: false, method: "" };
    const hash = hashPassword(authCode.trim());
    const settings = this.getSettings();
    const refundPin = settings.refund_pin ?? "";

    if (requesterRole === "admin") {
      const adminMatch = this.db
        .prepare(
          `SELECT id FROM cashiers WHERE role = 'admin' AND is_active = 1 AND password_hash = ?`
        )
        .get(hash);
      if (adminMatch) return { ok: true, method: "admin_password" };
    }

    if (refundPin && authCode.trim() === refundPin) {
      return { ok: true, method: "refund_pin" };
    }

    const anyAdmin = this.db
      .prepare(
        `SELECT id FROM cashiers WHERE role = 'admin' AND is_active = 1 AND password_hash = ?`
      )
      .get(hash);
    if (anyAdmin) return { ok: true, method: "admin_password" };

    return { ok: false, method: "" };
  }

  refundSale(
    saleId: number,
    authorizedById: number,
    authCode: string,
    requesterRole: string
  ): void {
    const auth = this.verifyRefundAuth(authCode, requesterRole);
    if (!auth.ok) {
      throw new Error("Refund not authorized. Use admin password or refund PIN.");
    }

    const sale = this.db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId) as
      | { status: string }
      | undefined;
    if (!sale || sale.status === "refunded") throw new Error("Sale cannot be refunded");

    const items = this.db
      .prepare("SELECT * FROM sale_items WHERE sale_id = ?")
      .all(saleId) as {
      product_id: number;
      product_name: string;
      quantity: number;
    }[];

    const txn = this.db.transaction(() => {
      const restock = this.db.prepare(
        "UPDATE products SET stock_qty = stock_qty + ?, updated_at=datetime('now') WHERE id = ?"
      );
      for (const item of items) {
        restock.run(item.quantity, item.product_id);
        this.recordStockMovement(
          item.product_id,
          item.product_name,
          item.quantity,
          "refund",
          saleId
        );
      }
      this.db
        .prepare(
          `UPDATE sales SET status = 'refunded', synced = 0, refunded_by = ?, refund_auth = ? WHERE id = ?`
        )
        .run(authorizedById, auth.method, saleId);
    });
    txn();
  }

  listSales(limit = 50) {
    return this.db
      .prepare(
        `SELECT s.*, c.display_name as cashier_name FROM sales s
         JOIN cashiers c ON c.id = s.cashier_id
         ORDER BY s.created_at DESC LIMIT ?`
      )
      .all(limit);
  }

  getSale(id: number) {
    const sale = this.db
      .prepare(
        `SELECT s.*, c.display_name as cashier_name FROM sales s
         JOIN cashiers c ON c.id = s.cashier_id WHERE s.id = ?`
      )
      .get(id);
    const items = this.db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(id);
    return { sale, items };
  }

  dashboardStats() {
    const today = new Date().toISOString().slice(0, 10);
    const todayRow = this.db
      .prepare(
        `SELECT COUNT(*) as transactions, COALESCE(SUM(total),0) as revenue
         FROM sales WHERE date(created_at) = date(?) AND status = 'completed'`
      )
      .get(today) as { transactions: number; revenue: number };

    const lowStock = this.db
      .prepare(
        "SELECT COUNT(*) as c FROM products WHERE is_active=1 AND stock_qty <= reorder_level"
      )
      .get() as { c: number };

    const daily = this.db
      .prepare(
        `SELECT date(created_at) as day, SUM(total) as revenue, COUNT(*) as transactions
         FROM sales WHERE status='completed' AND created_at >= date('now', '-6 days')
         GROUP BY date(created_at) ORDER BY day`
      )
      .all();

    const topProducts = this.db
      .prepare(
        `SELECT product_name, SUM(quantity) as qty, SUM(line_total) as revenue
         FROM sale_items si JOIN sales s ON s.id = si.sale_id
         WHERE s.status='completed' GROUP BY product_name ORDER BY qty DESC LIMIT 5`
      )
      .all();

    return {
      today_revenue: todayRow.revenue,
      today_transactions: todayRow.transactions,
      low_stock_count: lowStock.c,
      daily_revenue: daily,
      top_products: topProducts,
    };
  }

  getSettings(): Record<string, string> {
    const rows = this.db.prepare("SELECT key, value FROM settings").all() as {
      key: string;
      value: string;
    }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  setSetting(key: string, value: string): void {
    this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  }

  getUnsyncedPayload() {
    const suppliers = this.listSuppliers();
    const products = this.listProducts("");
    const sales = this.db
      .prepare(
        `SELECT s.* FROM sales s WHERE s.synced = 0 AND s.status = 'completed' ORDER BY s.id`
      )
      .all() as {
      id: number;
      receipt_no: string;
      cashier_id: number;
      subtotal: number;
      tax: number;
      total: number;
      payment_method: string;
      status: string;
      created_at: string;
    }[];

    const salesPayload = sales.map((s) => ({
      local_id: s.id,
      receipt_no: s.receipt_no,
      cashier_id: s.cashier_id,
      subtotal: s.subtotal,
      tax: s.tax,
      total: s.total,
      payment_method: s.payment_method,
      status: s.status,
      created_at: s.created_at,
      items: this.db
        .prepare("SELECT * FROM sale_items WHERE sale_id = ?")
        .all(s.id)
        .map((i: { product_id: number; product_name: string; quantity: number; unit_price: number; line_total: number }) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
        })),
    }));

    return {
      suppliers: suppliers.map((s) => ({ ...s, local_id: s.id })),
      products: products.map((p) => ({ ...p, local_id: p.id, supplier_id: p.supplier_id })),
      sales: salesPayload,
    };
  }

  markSalesSynced(ids: number[]): void {
    if (!ids.length) return;
    const placeholders = ids.map(() => "?").join(",");
    this.db.prepare(`UPDATE sales SET synced = 1 WHERE id IN (${placeholders})`).run(...ids);
  }

  registerSession(
    sessionId: string,
    cashierId: number,
    displayName: string,
    role: string
  ): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT OR REPLACE INTO active_sessions (session_id, cashier_id, display_name, role, started_at, last_seen)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(sessionId, cashierId, displayName, role, now, now);
  }

  unregisterSession(sessionId: string): void {
    this.db.prepare("DELETE FROM active_sessions WHERE session_id = ?").run(sessionId);
  }

  touchSession(sessionId: string): void {
    this.db
      .prepare("UPDATE active_sessions SET last_seen = ? WHERE session_id = ?")
      .run(new Date().toISOString(), sessionId);
  }

  listActiveSessions() {
    this.db
      .prepare("DELETE FROM active_sessions WHERE last_seen < datetime('now', '-3 minutes')")
      .run();
    return this.db
      .prepare(
        `SELECT session_id, cashier_id, display_name, role, started_at, last_seen
         FROM active_sessions ORDER BY role, display_name`
      )
      .all();
  }

  getAnalytics() {
    const base = this.dashboardStats();
    const stockMovement = this.db
      .prepare(
        `SELECT date(created_at) as day,
                SUM(CASE WHEN qty_change < 0 THEN -qty_change ELSE 0 END) as sold,
                SUM(CASE WHEN qty_change > 0 THEN qty_change ELSE 0 END) as restocked
         FROM stock_movements
         WHERE created_at >= date('now', '-29 days')
         GROUP BY date(created_at) ORDER BY day`
      )
      .all();

    const paymentMix = this.db
      .prepare(
        `SELECT payment_method, COUNT(*) as count, SUM(total) as revenue
         FROM sales WHERE status = 'completed' AND created_at >= date('now', '-30 days')
         GROUP BY payment_method`
      )
      .all();

    const monthly = this.db
      .prepare(
        `SELECT strftime('%Y-%m', created_at) as month, SUM(total) as revenue, COUNT(*) as transactions
         FROM sales WHERE status = 'completed'
         GROUP BY month ORDER BY month DESC LIMIT 12`
      )
      .all();

    const weekly = this.db
      .prepare(
        `SELECT strftime('%Y-W%W', created_at) as week, SUM(total) as revenue, COUNT(*) as transactions
         FROM sales WHERE status = 'completed' AND created_at >= date('now', '-84 days')
         GROUP BY week ORDER BY week`
      )
      .all();

    return { ...base, stock_movement: stockMovement, payment_mix: paymentMix, monthly, weekly };
  }

  exportReportCsv(period: "daily" | "weekly" | "monthly"): string {
    let dateFilter: string;
    let label: string;
    if (period === "daily") {
      dateFilter = "date(created_at) = date('now')";
      label = new Date().toISOString().slice(0, 10);
    } else if (period === "weekly") {
      dateFilter = "created_at >= date('now', '-7 days')";
      label = `week-ending-${new Date().toISOString().slice(0, 10)}`;
    } else {
      dateFilter = "created_at >= date('now', 'start of month')";
      label = new Date().toISOString().slice(0, 7);
    }

    const sales = this.db
      .prepare(
        `SELECT s.receipt_no, c.display_name as cashier, s.subtotal, s.tax, s.total,
                s.payment_method, s.status, s.created_at
         FROM sales s JOIN cashiers c ON c.id = s.cashier_id
         WHERE ${dateFilter} ORDER BY s.created_at`
      )
      .all() as Record<string, unknown>[];

    const settings = this.getSettings();
    const lines = [
      `FusionPOS ${period.toUpperCase()} Report`,
      `Store: ${settings.shop_name ?? settings.store_name ?? "Store"}`,
      `Period: ${label}`,
      `Generated: ${new Date().toISOString()}`,
      "",
      "Receipt,Cashier,Subtotal,Tax,Total,Payment,Status,Date",
    ];

    for (const row of sales) {
      lines.push(
        [
          row.receipt_no,
          row.cashier,
          row.subtotal,
          row.tax,
          row.total,
          row.payment_method,
          row.status,
          row.created_at,
        ].join(",")
      );
    }

    const summary = this.db
      .prepare(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(total),0) as rev
         FROM sales WHERE status = 'completed' AND ${dateFilter}`
      )
      .get() as { cnt: number; rev: number };
    lines.push("", `Completed sales,${summary.cnt}`, `Total revenue,${summary.rev}`);

    return lines.join("\n");
  }

  buildMonitorPayload() {
    const settings = this.getSettings();
    const stats = this.dashboardStats();
    const sessions = this.listActiveSessions();
    const recentSales = this.listSales(8);
    const lowStock = this.listLowStock().slice(0, 10);

    return {
      shop_id: settings.shop_id,
      shop_name: settings.shop_name ?? settings.store_name,
      terminal_id: settings.terminal_id,
      timestamp: new Date().toISOString(),
      stats,
      active_sessions: sessions,
      recent_sales: recentSales,
      low_stock: lowStock.map((p) => ({
        id: p.id,
        name: p.name,
        stock_qty: p.stock_qty,
        reorder_level: p.reorder_level,
      })),
    };
  }
}
