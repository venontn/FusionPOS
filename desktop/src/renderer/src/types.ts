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

export type Sale = {
  id: number;
  receipt_no: string;
  cashier_name: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
};
