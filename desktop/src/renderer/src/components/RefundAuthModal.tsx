import { FormEvent, useState } from "react";

type Props = {
  onConfirm: (authCode: string) => void;
  onCancel: () => void;
  isAdmin: boolean;
};

export default function RefundAuthModal({ onConfirm, onCancel, isAdmin }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Authorization required");
      return;
    }
    onConfirm(code.trim());
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Authorize refund</h2>
        <p className="muted">
          {isAdmin
            ? "Enter your admin password to confirm this refund."
            : "Cashiers must enter the refund PIN or an administrator password."}
        </p>
        <label>
          {isAdmin ? "Admin password" : "Refund PIN or admin password"}
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
            placeholder={isAdmin ? "Your password" : "PIN or admin password"}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Authorize refund
          </button>
        </div>
      </form>
    </div>
  );
}
