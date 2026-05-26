import { FormEvent, useEffect, useRef, useState } from "react";

import ReceiptModal from "../components/ReceiptModal";
import { useAuth } from "../context/AuthContext";
import { money } from "../lib/format";
import type { CartItem, Product } from "../types";

export default function POS() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("cash");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    receiptNo: string;
    total: number;
    items: CartItem[];
    createdAt: string;
  } | null>(null);
  const [storeName, setStoreName] = useState("FusionPOS Store");
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.fusionpos.listProducts(search).then(setProducts);
  }, [search]);

  useEffect(() => {
    window.fusionpos.getSettings().then((s) => {
      if (s.store_name) setStoreName(s.store_name);
    });
    barcodeRef.current?.focus();
  }, []);

  function addToCart(product: Product, qty = 1) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product_id === product.id ? { ...c, quantity: c.quantity + qty } : c
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: qty,
          unit_price: product.price,
        },
      ];
    });
  }

  async function scanBarcode(e: FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    const product = await window.fusionpos.findByBarcode(barcode.trim());
    if (product) addToCart(product);
    else setError(`No product for barcode ${barcode}`);
    setBarcode("");
    barcodeRef.current?.focus();
  }

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  async function checkout() {
    setError("");
    try {
      const result = await window.fusionpos.checkout(user!.id, cart, payment);
      const sale = await window.fusionpos.getSale(result.saleId);
      setReceipt({
        receiptNo: result.receiptNo,
        total: result.total,
        items: cart,
        createdAt: (sale.sale as { created_at: string }).created_at,
      });
      setCart([]);
      setSearch("");
      window.fusionpos.listProducts("").then(setProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    }
  }

  return (
    <div className="page pos-page">
      <header className="page-header">
        <h1>Point of Sale</h1>
        <p>Scan barcodes or search products — works fully offline.</p>
      </header>

      <div className="pos-grid">
        <section className="panel">
          <form className="barcode-row" onSubmit={scanBarcode}>
            <input
              ref={barcodeRef}
              placeholder="Scan or enter barcode…"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
            <button type="submit" className="btn">
              Add
            </button>
          </form>
          <input
            className="search"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="product-grid">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="product-card"
                disabled={p.stock_qty <= 0}
                onClick={() => addToCart(p)}
              >
                <strong>{p.name}</strong>
                <span>{money(p.price)}</span>
                <small>Stock: {p.stock_qty}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel cart-panel">
          <h2>Current sale</h2>
          {cart.length === 0 ? (
            <p className="muted">Cart is empty</p>
          ) : (
            <ul className="cart-list">
              {cart.map((item) => (
                <li key={item.product_id}>
                  <div>
                    <strong>{item.product_name}</strong>
                    <div className="qty-controls">
                      <button
                        type="button"
                        onClick={() =>
                          setCart((c) =>
                            c
                              .map((x) =>
                                x.product_id === item.product_id
                                  ? { ...x, quantity: x.quantity - 1 }
                                  : x
                              )
                              .filter((x) => x.quantity > 0)
                          )
                        }
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((c) =>
                            c.map((x) =>
                              x.product_id === item.product_id
                                ? { ...x, quantity: x.quantity + 1 }
                                : x
                            )
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span>{money(item.unit_price * item.quantity)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="cart-total">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>

          <label>
            Payment method
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="card">Card</option>
            </select>
          </label>

          {error && <p className="error">{error}</p>}

          <button
            type="button"
            className="btn primary block"
            disabled={!cart.length}
            onClick={checkout}
          >
            Complete sale
          </button>
        </section>
      </div>

      {receipt && (
        <ReceiptModal
          receiptNo={receipt.receiptNo}
          total={receipt.total}
          paymentMethod={payment}
          items={receipt.items.map((i) => ({
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            line_total: i.unit_price * i.quantity,
          }))}
          createdAt={receipt.createdAt}
          storeName={storeName}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
