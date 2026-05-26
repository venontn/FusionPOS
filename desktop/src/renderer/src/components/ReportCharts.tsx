import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Analytics = {
  daily_revenue: { day: string; revenue: number; transactions: number }[];
  stock_movement: { day: string; sold: number; restocked: number }[];
  payment_mix: { payment_method: string; count: number; revenue: number }[];
  monthly: { month: string; revenue: number; transactions: number }[];
  weekly: { week: string; revenue: number; transactions: number }[];
};

const COLORS = ["#2dd4bf", "#3b82f6", "#fbbf24", "#a78bfa"];

export default function ReportCharts({ data }: { data: Analytics }) {
  const salesSeries = data.daily_revenue.map((d) => ({
    label: d.day?.slice(5) ?? d.day,
    revenue: Number(d.revenue),
    transactions: d.transactions,
  }));

  const stockSeries = data.stock_movement.map((d) => ({
    label: d.day?.slice(5) ?? d.day,
    sold: Number(d.sold),
    restocked: Number(d.restocked),
  }));

  const payments = data.payment_mix.map((p) => ({
    name: String(p.payment_method).replace("_", " "),
    value: Number(p.revenue),
    count: p.count,
  }));

  const monthly = [...data.monthly].reverse().map((m) => ({
    month: m.month,
    revenue: Number(m.revenue),
  }));

  return (
    <div className="charts-grid">
      <div className="panel chart-panel">
        <h3>Sales trend (7 days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={salesSeries}>
            <CartesianGrid stroke="#2f3f56" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#9aa8bc" fontSize={11} />
            <YAxis stroke="#9aa8bc" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #2f3f56" }} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#2dd4bf" strokeWidth={2} name="Revenue" />
            <Line type="monotone" dataKey="transactions" stroke="#3b82f6" name="Transactions" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel chart-panel">
        <h3>Stock movement (30 days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stockSeries}>
            <CartesianGrid stroke="#2f3f56" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#9aa8bc" fontSize={11} />
            <YAxis stroke="#9aa8bc" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #2f3f56" }} />
            <Legend />
            <Bar dataKey="sold" fill="#f87171" name="Units sold" />
            <Bar dataKey="restocked" fill="#4ade80" name="Units restocked" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel chart-panel">
        <h3>Payment mix (30 days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={payments} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
              {payments.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #2f3f56" }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="panel chart-panel">
        <h3>Monthly revenue</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthly}>
            <CartesianGrid stroke="#2f3f56" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#9aa8bc" fontSize={11} />
            <YAxis stroke="#9aa8bc" fontSize={11} />
            <Tooltip contentStyle={{ background: "#1a2332", border: "1px solid #2f3f56" }} />
            <Line type="monotone" dataKey="revenue" stroke="#a78bfa" strokeWidth={2} name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
