export function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-ZW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
