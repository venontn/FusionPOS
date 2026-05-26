import { money, dateTime } from "../lib/format";

type Props = {
  receiptNo: string;
  total: number;
  paymentMethod: string;
  items: { product_name: string; quantity: number; unit_price: number; line_total: number }[];
  createdAt: string;
  storeName: string;
  onClose: () => void;
};

export default function ReceiptModal({
  receiptNo,
  total,
  paymentMethod,
  items,
  createdAt,
  storeName,
  onClose,
}: Props) {
  const print = () => window.print();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-print" id="receipt-print">
          <h2>{storeName}</h2>
          <p className="muted">Receipt {receiptNo}</p>
          <p className="muted">{dateTime(createdAt)}</p>
          <hr />
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.product_name}</td>
                  <td>{i.quantity}</td>
                  <td>{money(i.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <p className="receipt-total">
            <strong>Total:</strong> {money(total)}
          </p>
          <p className="muted">Payment: {paymentMethod.replace("_", " ")}</p>
          <p className="muted">Thank you for shopping with us!</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={print}>
            Print receipt
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
