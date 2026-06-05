import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";
import MetricCard from "./MetricCard";

interface SaleRow {
  id: string;
  order_id: string | null;
  product_name: string | null;
  product_category: string | null;
  revenue: number;
  currency: string;
  quantity: number;
  discount: number;
  tax: number;
  payment_method: string | null;
  conversion_source: string | null;
  created_at: string;
}

interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;
  revenueByDay: { date: string; revenue: number }[];
  byCategory: { category: string; revenue: number; count: number }[];
  byPaymentMethod: { method: string; count: number; revenue: number }[];
  recentSales: SaleRow[];
}

interface Props {
  siteId: string;
}

export default function SalesTab({ siteId }: Props) {
  const [stats, setStats] = useState<SalesStats>({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    revenueByDay: [],
    byCategory: [],
    byPaymentMethod: [],
    recentSales: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
    const interval = setInterval(loadSales, 15000);
    return () => clearInterval(interval);
  }, [siteId]);

  const loadSales = async () => {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: sales, error } = await supabase
        .from("analytics_sales")
        .select("*")
        .eq("site_id", siteId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Sales load error:", error);
        setLoading(false);
        return;
      }

      const rows = (sales || []) as SaleRow[];

      // Total revenue & orders
      const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
      const totalOrders = rows.length;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Get session count for conversion rate
      const { count: sessionCount } = await supabase
        .from("analytics_sessions")
        .select("*", { count: "exact", head: true })
        .eq("site_id", siteId)
        .gte("created_at", since);

      const conversionRate = sessionCount ? Math.round((totalOrders / sessionCount) * 10000) / 100 : 0;

      // Revenue by day (last 7 days)
      const now = Date.now();
      const revenueByDay: { date: string; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
        const dayEnd = new Date(now - (i - 1) * 24 * 60 * 60 * 1000);
        const dayRevenue = rows
          .filter((r) => {
            const t = new Date(r.created_at).getTime();
            return t >= dayStart.getTime() && t < dayEnd.getTime();
          })
          .reduce((s, r) => s + Number(r.revenue), 0);
        revenueByDay.push({
          date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
          revenue: Math.round(dayRevenue * 100) / 100,
        });
      }

      // By category
      const catMap = new Map<string, { revenue: number; count: number }>();
      rows.forEach((r) => {
        const cat = r.product_category || "Other";
        const existing = catMap.get(cat) || { revenue: 0, count: 0 };
        catMap.set(cat, {
          revenue: existing.revenue + Number(r.revenue),
          count: existing.count + r.quantity,
        });
      });
      const byCategory = Array.from(catMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // By payment method
      const pmMap = new Map<string, { count: number; revenue: number }>();
      rows.forEach((r) => {
        const m = r.payment_method || "Unknown";
        const existing = pmMap.get(m) || { count: 0, revenue: 0 };
        pmMap.set(m, {
          count: existing.count + 1,
          revenue: existing.revenue + Number(r.revenue),
        });
      });
      const byPaymentMethod = Array.from(pmMap.entries())
        .map(([method, data]) => ({ method, ...data }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        conversionRate,
        revenueByDay,
        byCategory,
        byPaymentMethod,
        recentSales: rows.slice(0, 10),
      });
      setLoading(false);
    } catch (err) {
      console.error("Sales tab error:", err);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading sales data...</div>;
  }

  const maxRevenue = Math.max(...stats.revenueByDay.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Revenue (30d)" value={`$${stats.totalRevenue.toLocaleString()}`} trend={15} icon="$" />
        <MetricCard label="Total Orders" value={stats.totalOrders} trend={8} icon="O" />
        <MetricCard label="Avg Order Value" value={`$${stats.avgOrderValue}`} trend={3} icon="A" />
        <MetricCard label="Conversion Rate" value={`${stats.conversionRate}%`} trend={1} icon="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Revenue Last 7 Days</h3>
          <div className="flex items-end gap-3 h-56">
            {stats.revenueByDay.map((d, i) => {
              const h = Math.max((d.revenue / maxRevenue) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full h-full flex flex-col justify-end">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t opacity-80 hover:opacity-100 transition group-hover:from-emerald-400 group-hover:to-emerald-300"
                      style={{ height: `${h}%` }}
                      title={`$${d.revenue}`}
                    />
                  </div>
                  <span className="text-xs text-slate-400 mt-2 group-hover:text-slate-200 transition">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* By category */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">By Category</h3>
          {stats.byCategory.length === 0 ? (
            <p className="text-slate-500 text-sm">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.byCategory.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <div>
                    <div className="text-sm font-medium text-white">{c.category}</div>
                    <div className="text-xs text-slate-400">{c.count} sold</div>
                  </div>
                  <div className="text-sm font-medium text-emerald-400">${c.revenue.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment methods */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
          {stats.byPaymentMethod.length === 0 ? (
            <p className="text-slate-500 text-sm">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.byPaymentMethod.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50">
                  <span className="text-sm text-white">{p.method}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{p.count} orders</span>
                    <span className="text-sm font-medium text-emerald-400">${p.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Sales</h3>
          {stats.recentSales.length === 0 ? (
            <p className="text-slate-500 text-sm">No sales yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.recentSales.map((s, i) => (
                <div key={s.id || i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-white truncate">{s.product_name || s.order_id || "Sale"}</div>
                    <div className="text-xs text-slate-400">
                      {s.payment_method} &middot; {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-emerald-400 font-medium ml-3">${Number(s.revenue).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
