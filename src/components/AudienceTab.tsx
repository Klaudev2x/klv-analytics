import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";

interface SessionRow {
  id: string;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  page_views: number;
  events_count: number;
  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;
}

interface AudienceData {
  byCountry: { country: string; count: number }[];
  byDevice: { device: string; count: number }[];
  byBrowser: { browser: string; count: number }[];
  byOS: { os: string; count: number }[];
  byReferrer: { referrer: string; count: number }[];
  avgDuration: number;
  avgPageViews: number;
  totalSessions: number;
  bounceRate: number;
  recentSessions: SessionRow[];
}

interface Props {
  siteId: string;
}

export default function AudienceTab({ siteId }: Props) {
  const [data, setData] = useState<AudienceData>({
    byCountry: [],
    byDevice: [],
    byBrowser: [],
    byOS: [],
    byReferrer: [],
    avgDuration: 0,
    avgPageViews: 0,
    totalSessions: 0,
    bounceRate: 0,
    recentSessions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudience();
    const interval = setInterval(loadAudience, 15000);
    return () => clearInterval(interval);
  }, [siteId]);

  const loadAudience = async () => {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: sessions } = await supabase
        .from("analytics_sessions")
        .select("*")
        .eq("site_id", siteId)
        .gte("created_at", since)
        .order("started_at", { ascending: false });

      const rows = (sessions || []) as SessionRow[];
      const totalSessions = rows.length;

      // Aggregations
      const countryMap = new Map<string, number>();
      const deviceMap = new Map<string, number>();
      const browserMap = new Map<string, number>();
      const osMap = new Map<string, number>();
      const referrerMap = new Map<string, number>();
      let totalDuration = 0;
      let durationCount = 0;
      let totalPV = 0;
      let bounced = 0;

      rows.forEach((r) => {
        const country = r.country || "Unknown";
        countryMap.set(country, (countryMap.get(country) || 0) + 1);

        const device = r.device_type || "Unknown";
        deviceMap.set(device, (deviceMap.get(device) || 0) + 1);

        const browser = r.browser || "Unknown";
        browserMap.set(browser, (browserMap.get(browser) || 0) + 1);

        const os = r.os || "Unknown";
        osMap.set(os, (osMap.get(os) || 0) + 1);

        const ref = r.referrer || "Direct";
        if (ref && ref !== "Direct") {
          try {
            const hostname = new URL(ref).hostname;
            referrerMap.set(hostname, (referrerMap.get(hostname) || 0) + 1);
          } catch {
            referrerMap.set(ref.substring(0, 40), (referrerMap.get(ref.substring(0, 40)) || 0) + 1);
          }
        } else {
          referrerMap.set("Direct", (referrerMap.get("Direct") || 0) + 1);
        }

        if (r.duration_seconds) {
          totalDuration += r.duration_seconds;
          durationCount++;
        }
        totalPV += r.page_views || 0;
        if (r.page_views <= 1) bounced++;
      });

      const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;
      const avgPageViews = totalSessions > 0 ? Math.round((totalPV / totalSessions) * 10) / 10 : 0;
      const bounceRate = totalSessions > 0 ? Math.round((bounced / totalSessions) * 100) : 0;

      const sortMap = (map: Map<string, number>) =>
        Array.from(map.entries())
          .map(([name, count]) => ({ [map === countryMap ? "country" : map === deviceMap ? "device" : map === browserMap ? "browser" : map === osMap ? "os" : "referrer"]: name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);

      setData({
        byCountry: sortMap(countryMap) as { country: string; count: number }[],
        byDevice: sortMap(deviceMap) as { device: string; count: number }[],
        byBrowser: sortMap(browserMap) as { browser: string; count: number }[],
        byOS: sortMap(osMap) as { os: string; count: number }[],
        byReferrer: sortMap(referrerMap) as { referrer: string; count: number }[],
        avgDuration,
        avgPageViews,
        totalSessions,
        bounceRate,
        recentSessions: rows.slice(0, 10),
      });
      setLoading(false);
    } catch (err) {
      console.error("Audience tab error:", err);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading audience data...</div>;

  const fmtDuration = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const renderBreakdown = (title: string, items: { name: string; count: number }[]) => (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-slate-500 text-sm">No data yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const max = items[0].count || 1;
            const pct = Math.round((item.count / data.totalSessions) * 100);
            return (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-slate-400">{item.count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500/70 rounded-full transition-all"
                    style={{ width: `${(item.count / max) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Total Sessions (30d)</span>
          <div className="text-3xl font-bold text-white mt-2">{data.totalSessions}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Avg Duration</span>
          <div className="text-3xl font-bold text-white mt-2">{fmtDuration(data.avgDuration)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Avg Pages/Session</span>
          <div className="text-3xl font-bold text-white mt-2">{data.avgPageViews}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Bounce Rate</span>
          <div className="text-3xl font-bold text-white mt-2">{data.bounceRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBreakdown("Countries", data.byCountry.map((c) => ({ name: c.country, count: c.count })))}
        {renderBreakdown("Devices", data.byDevice.map((d) => ({ name: d.device, count: d.count })))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBreakdown("Browsers", data.byBrowser.map((b) => ({ name: b.browser, count: b.count })))}
        {renderBreakdown("Operating Systems", data.byOS.map((o) => ({ name: o.os, count: o.count })))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBreakdown("Referrers", data.byReferrer.map((r) => ({ name: r.referrer, count: r.count })))}

        {/* Recent sessions */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Sessions</h3>
          {data.recentSessions.length === 0 ? (
            <p className="text-slate-500 text-sm">No sessions yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentSessions.map((s, i) => (
                <div key={s.id || i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded border border-slate-700/50 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-white">{s.city || s.country || "Unknown location"}</div>
                    <div className="text-xs text-slate-400">
                      {s.device_type} &middot; {s.browser} &middot; {s.os}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 ml-3">
                    {s.page_views}pv &middot; {s.duration_seconds ? fmtDuration(s.duration_seconds) : "active"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
