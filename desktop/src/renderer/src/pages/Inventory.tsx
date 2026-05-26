import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { money } from "../lib/format";
import type { Product, Supplier } from "../types";

const emptyProduct = {
  barcode: "",
  name: "",
  category: "",
  price: 0,
  cost: 0,
  stock_qty: 0,
  reorder_level: 5,
  supplier_id: null as number | null,
};

export default function Inventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [all, low, sup] = await Promise.all([
      window.fusionpos.listProducts(""),
      window.fusionpos.listLowStock(),
      window.fusionpos.listSuppliers(),
    ]);
    setProducts(all);
    setLowStock(low);
    setSuppliers(sup);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    await window.fusionpos.saveProduct({ ...form, id: editingId ?? undefined });
    setForm(emptyProduct);
    setEditingId(null);
    setMessage("Product saved.");
    refresh();
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      barcode: p.barcode,
      name: p.name,
      category: p.category,
      price: p.price,
      cost: p.cost,
      stock_qty: p.stock_qty,
      reorder_level: p.reorder_level,
      supplier_id: p.supplier_id,
    });
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Inventory</h1>
        <p>Manage products and monitor low-stock alerts.</p>
      </header>

      {lowStock.length > 0 && (
        <div className="alert-banner">
          <strong>{lowStock.length} items</strong> at or below reorder level
        </div>
      )}

      {isAdmin && (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <h2>{editingId ? "Edit product" : "Add product"}</h2>
          <input
            placeholder="Barcode"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <input
            placeholder="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            required
            value={form.price || ""}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
          />
          <input
            type="number"
            placeholder="Stock qty"
            value={form.stock_qty || ""}
            onChange={(e) => setForm({ ...form, stock_qty: parseInt(e.target.value) || 0 })}
          />
          <input
            type="number"
            placeholder="Reorder level"
            value={form.reorder_level || ""}
            onChange={(e) => setForm({ ...form, reorder_level: parseInt(e.target.value) || 0 })}
          />
          <select
            value={form.supplier_id ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                supplier_id: e.target.value ? parseInt(e.target.value) : null,
              })
            }
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="form-actions">
            <button type="submit" className="btn primary">
              Save
            </button>
            {editingId && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyProduct);
                }}
              >
                Cancel
              </button>
            )}
          </div>
          {message && <p className="success">{message}</p>}
        </form>
      )}

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Reorder</th>
              {isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.stock_qty <= p.reorder_level ? "low" : ""}>
                <td>{p.barcode}</td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{money(p.price)}</td>
                <td>{p.stock_qty}</td>
                <td>{p.reorder_level}</td>
                {isAdmin && (
                  <td>
                    <button type="button" className="btn ghost" onClick={() => startEdit(p)}>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
