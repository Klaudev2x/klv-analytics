import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";
import MetricCard from "./MetricCard";

interface ApiEvent {
  id: string;
  api_endpoint: string | null;
  api_method: string | null;
  api_status: number | null;
  api_response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

interface ApiStats {
  totalRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  byEndpoint: { endpoint: string; count: number; avgMs: number; errors: number }[];
  byMethod: { method: string; count: number }[];
  byStatus: { status: number; count: number }[];
  slowestRequests: ApiEvent[];
  recentErrors: ApiEvent[];
  timeline: { time: string; count: number }[];
}

interface Props {
  siteId: string;
}

export default function ApiTab({ siteId }: Props) {
  const [stats, setStats] = useState<ApiStats>({
    totalRequests: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
    errorRate: 0,
    requestsPerMinute: 0,
    byEndpoint: [],
    byMethod: [],
    byStatus: [],
    slowestRequests: [],
    recentErrors: [],
    timeline: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApi();
    const interval = setInterval(loadApi, 10000);
    return () => clearInterval(interval);
  }, [siteId]);

  const loadApi = async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: events } = await supabase
        .from("analytics_events")
        .select("*")
        .eq("site_id", siteId)
        .eq("event_type", "api_call")
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      const rows = (events || []) as ApiEvent[];
      const totalRequests = rows.length;

      // Response times
      const responseTimes = rows
        .filter((r) => r.api_response_time_ms != null)
        .map((r) => r.api_response_time_ms!);
      responseTimes.sort((a, b) => a - b);

      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
      const p95ResponseTime = responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length * 0.95)]
        : 0;

      // Error rate
      const errors = rows.filter((r) => r.api_status != null && r.api_status >= 400).length;
      const errorRate = totalRequests > 0 ? Math.round((errors / totalRequests) * 100) : 0;

      // Requests per minute (last 5 min)
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      const rpm = rows.filter((r) => new Date(r.created_at).getTime() > fiveMinAgo).length / 5;
      const requestsPerMinute = Math.round(rpm);

      // By endpoint
      const endpointMap = new Map<string, { count: number; totalMs: number; errors: number }>();
      rows.forEach((r) => {
        const ep = r.api_endpoint || "Unknown";
        const existing = endpointMap.get(ep) || { count: 0, totalMs: 0, errors: 0 };
        endpointMap.set(ep, {
          count: existing.count + 1,
          totalMs: existing.totalMs + (r.api_response_time_ms || 0),
          errors: existing.errors + (r.api_status != null && r.api_status >= 400 ? 1 : 0),
        });
      });
      const byEndpoint = Array.from(endpointMap.entries())
        .map(([endpoint, d]) => ({
          endpoint,
          count: d.count,
          avgMs: d.count > 0 ? Math.round(d.totalMs / d.count) : 0,
          errors: d.errors,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // By method
      const methodMap = new Map<string, number>();
      rows.forEach((r) => {
        const m = r.api_method || "Unknown";
        methodMap.set(m, (methodMap.get(m) || 0) + 1);
      });
      const byMethod = Array.from(methodMap.entries())
        .map(([method, count]) => ({ method, count }))
        .sort((a, b) => b.count - a.count);

      // By status
      const statusMap = new Map<number, number>();
      rows.forEach((r) => {
        if (r.api_status != null) {
          statusMap.set(r.api_status, (statusMap.get(r.api_status) || 0) + 1);
        }
      });
      const byStatus = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // Slowest
      const slowestRequests = [...rows]
        .filter((r) => r.api_response_time_ms != null)
        .sort((a, b) => (b.api_response_time_ms || 0) - (a.api_response_time_ms || 0))
        .slice(0, 5);

      // Recent errors
      const recentErrors = rows
        .filter((r) => r.api_status != null && r.api_status >= 400)
        .slice(0, 10);

      // Timeline (hourly)
      const now = Date.now();
      const timeline: { time: string; count: number }[] = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now - i * 60 * 60 * 1000);
        const hourEnd = new Date(now - (i - 1) * 60 * 60 * 1000);
        const count = rows.filter((r) => {
          const t = new Date(r.created_at).getTime();
          return t >= hourStart.getTime() && t < hourEnd.getTime();
        }).length;
        const h = hourStart.getHours();
        const label = `${h === 0 ? '12' : h > 12 ? h - 12 : h}${h < 12 ? 'a' : 'p'}`;
        timeline.push({ time: label, count });
      }

      setStats({
        totalRequests,
        avgResponseTime,
        p95ResponseTime,
        errorRate,
        requestsPerMinute,
        byEndpoint,
        byMethod,
        byStatus,
        slowestRequests,
        recentErrors,
        timeline,
      });
      setLoading(false);
    } catch (err) {
      console.error("API tab error:", err);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading API monitoring data...</div>;

  const statusColor = (s: number) => {
    if (s < 300) return "text-green-400";
    if (s < 400) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard label="Total Requests (24h)" value={stats.totalRequests} trend={5} icon="R" />
        <MetricCard label="Avg Response" value={`${stats.avgResponseTime}ms`} trend={-2} icon="T" />
        <MetricCard label="P95 Response" value={`${stats.p95ResponseTime}ms`} icon="P" />
        <MetricCard label="Error Rate" value={`${stats.errorRate}%`} trend={stats.errorRate > 5 ? -1 : 1} icon="E" />
        <MetricCard label="Req/min" value={stats.requestsPerMinute} icon="M" />
      </div>

      {/* Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-6">API Requests Last 24 Hours</h3>
        <div className="flex items-end gap-2 h-48">
          {stats.timeline.map((p, i) => {
            const max = Math.max(...stats.timeline.map((t) => t.count), 1);
            const h = Math.max((p.count / max) * 100, 3);
            return (
              <div key={i} className="flex-1 flex flex-col items-center group">
                <div className="relative w-full h-full flex flex-col justify-end">
                  <div
                    className={`w-full rounded-t opacity-80 hover:opacity-100 transition ${p.count > max * 0.8 ? "bg-gradient-to-t from-amber-500 to-amber-400" : "bg-gradient-to-t from-cyan-500 to-cyan-400"}`}
                    style={{ height: `${h}%` }}
                    title={`${p.count} requests`}
                  />
                </div>
                <span className="text-xs text-slate-400 mt-2 group-hover:text-slate-200 transition">{p.time}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoints */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Endpoints</h3>
          {stats.byEndpoint.length === 0 ? (
            <p className="text-slate-500 text-sm">No API data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.byEndpoint.map((ep, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-mono truncate">{ep.endpoint}</div>
                    <div className="text-xs text-slate-400">{ep.count} calls &middot; avg {ep.avgMs}ms</div>
                  </div>
                  {ep.errors > 0 && (
                    <span className="ml-3 px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">{ep.errors} errors</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Status Codes</h3>
          {stats.byStatus.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.byStatus.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50 text-sm">
                  <span className={`font-mono font-medium ${statusColor(s.status)}`}>{s.status}</span>
                  <span className="text-slate-400">{s.count}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-700">
            <h4 className="text-sm font-semibold text-white mb-3">Methods</h4>
            <div className="flex flex-wrap gap-2">
              {stats.byMethod.map((m, i) => (
                <span key={i} className="px-3 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">
                  {m.method} ({m.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slowest */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Slowest Requests</h3>
          {stats.slowestRequests.length === 0 ? (
            <p className="text-slate-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.slowestRequests.map((r, i) => (
                <div key={r.id || i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-mono truncate">{r.api_endpoint}</div>
                    <div className="text-xs text-slate-400">{r.api_method} &middot; {new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`ml-3 font-medium ${r.api_response_time_ms! > 1000 ? "text-red-400" : "text-amber-400"}`}>
                    {r.api_response_time_ms}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent errors */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Errors</h3>
          {stats.recentErrors.length === 0 ? (
            <p className="text-slate-500 text-sm">No errors - looking good!</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {stats.recentErrors.map((r, i) => (
                <div key={r.id || i} className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className={`font-mono ${statusColor(r.api_status!)}`}>{r.api_status}</span>
                    <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-300 font-mono truncate mt-1">{r.api_endpoint}</div>
                  {r.error_message && <div className="text-red-300 text-xs mt-1">{r.error_message}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
