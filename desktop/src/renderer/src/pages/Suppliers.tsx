import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import type { Supplier } from "../types";

const empty = { name: "", contact_person: "", phone: "", email: "", address: "" };

export default function Suppliers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function refresh() {
    setSuppliers(await window.fusionpos.listSuppliers());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    await window.fusionpos.saveSupplier({ ...form, id: editingId ?? undefined });
    setForm(empty);
    setEditingId(null);
    refresh();
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Suppliers</h1>
        <p>Track wholesale partners and reorder contacts.</p>
      </header>

      {isAdmin && (
        <form className="panel form-grid" onSubmit={onSubmit}>
          <h2>{editingId ? "Edit supplier" : "Add supplier"}</h2>
          <input
            placeholder="Company name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            placeholder="Contact person"
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <textarea
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <button type="submit" className="btn primary">
            Save supplier
          </button>
        </form>
      )}

      <div className="panel cards">
        {suppliers.map((s) => (
          <article key={s.id} className="info-card">
            <h3>{s.name}</h3>
            <p>{s.contact_person}</p>
            <p>{s.phone}</p>
            <p className="muted">{s.email}</p>
            {isAdmin && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setEditingId(s.id);
                  setForm({
                    name: s.name,
                    contact_person: s.contact_person,
                    phone: s.phone,
                    email: s.email,
                    address: s.address,
                  });
                }}
              >
                Edit
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
