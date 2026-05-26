/** Demo retail locations — shop IDs 001 onwards */
export const DEMO_SHOPS = [
  {
    id: "001",
    name: "Harare CBD Supermarket",
    city: "Harare",
    terminal: "T01",
  },
  {
    id: "002",
    name: "Borrowdale Mini Mart",
    city: "Harare",
    terminal: "T01",
  },
  {
    id: "003",
    name: "Bulawayo City Grocers",
    city: "Bulawayo",
    terminal: "T01",
  },
  {
    id: "004",
    name: "Mutare Main Street Pharmacy & Goods",
    city: "Mutare",
    terminal: "T01",
  },
  {
    id: "005",
    name: "Gweru Retail Hub",
    city: "Gweru",
    terminal: "T01",
  },
  {
    id: "006",
    name: "Chitungwiza Community Store",
    city: "Chitungwiza",
    terminal: "T01",
  },
] as const;

export function getDemoShop(id: string) {
  return DEMO_SHOPS.find((s) => s.id === id);
}
