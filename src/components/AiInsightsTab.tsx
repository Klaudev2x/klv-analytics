import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";

interface Insight {
  type: "positive" | "negative" | "neutral";
  category: string;
  message: string;
  detail: string;
}

interface Props {
  siteId: string;
}

export default function AiInsightsTab({ siteId }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
    const interval = setInterval(generateInsights, 30000);
    return () => clearInterval(interval);
  }, [siteId]);

  const generateInsights = async () => {
    try {
      const now = Date.now();
      const day7Ago = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      const day14Ago = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();

      // This week vs last week comparisons
      const { data: thisWeekViews } = await supabase
        .from("analytics_events")
        .select("page_url, referrer, created_at")
        .eq("site_id", siteId)
        .eq("event_type", "page_view")
        .gte("created_at", day7Ago);

      const { count: thisWeekCount } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("site_id", siteId)
        .eq("event_type", "page_view")
        .gte("created_at", day7Ago);

      const { count: lastWeekCount } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .eq("site_id", siteId)
        .eq("event_type", "page_view")
        .gte("created_at", day14Ago)
        .lt("created_at", day7Ago);

      const { count: thisWeekSessions } = await supabase
        .from("analytics_sessions")
        .select("*", { count: "exact", head: true })
        .eq("site_id", siteId)
        .gte("created_at", day7Ago);

      const { count: lastWeekSessions } = await supabase
        .from("analytics_sessions")
        .select("*", { count: "exact", head: true })
        .eq("site_id", siteId)
        .gte("created_at", day14Ago)
        .lt("created_at", day7Ago);

      const { data: thisWeekSales } = await supabase
        .from("analytics_sales")
        .select("revenue, conversion_source")
        .eq("site_id", siteId)
        .gte("created_at", day7Ago);

      const { data: lastWeekSales } = await supabase
        .from("analytics_sales")
        .select("revenue")
        .eq("site_id", siteId)
        .gte("created_at", day14Ago)
        .lt("created_at", day7Ago);

      const { data: errors } = await supabase
        .from("analytics_events")
        .select("error_message, page_url")
        .eq("site_id", siteId)
        .eq("event_type", "error")
        .gte("created_at", day7Ago);

      const { data: sessions } = await supabase
        .from("analytics_sessions")
        .select("country, device_type, referrer, duration_seconds, page_views")
        .eq("site_id", siteId)
        .gte("created_at", day7Ago);

      const result: Insight[] = [];

      // Traffic trend
      const viewChange = lastWeekCount ? Math.round(((thisWeekCount || 0) - lastWeekCount) / lastWeekCount * 100) : 0;
      if (viewChange !== 0) {
        result.push({
          type: viewChange > 0 ? "positive" : "negative",
          category: "Traffic",
          message: viewChange > 0
            ? `Traffic increased ${viewChange}% this week`
            : `Traffic decreased ${Math.abs(viewChange)}% this week`,
          detail: viewChange > 0
            ? `${thisWeekCount || 0} page views this week vs ${lastWeekCount} last week. Keep up the momentum!`
            : `${thisWeekCount || 0} page views this week vs ${lastWeekCount} last week. Consider reviewing your content strategy.`,
        });
      }

      // Session trend
      const sessionChange = lastWeekSessions ? Math.round(((thisWeekSessions || 0) - lastWeekSessions) / lastWeekSessions * 100) : 0;
      if (sessionChange !== 0 && sessionChange !== viewChange) {
        result.push({
          type: sessionChange > 0 ? "positive" : "negative",
          category: "Visitors",
          message: sessionChange > 0
            ? `Unique visitors up ${sessionChange}% this week`
            : `Unique visitors down ${Math.abs(sessionChange)}% this week`,
          detail: `${thisWeekSessions || 0} sessions this week vs ${lastWeekSessions} last week.`,
        });
      }

      // Top referrer analysis
      const referrerMap = new Map<string, number>();
      (thisWeekViews || []).forEach((v: Record<string, string>) => {
        const ref = v.referrer || "Direct";
        if (ref && ref !== "Direct") {
          try {
            const host = new URL(ref).hostname;
            referrerMap.set(host, (referrerMap.get(host) || 0) + 1);
          } catch { /* skip invalid */ }
        } else {
          referrerMap.set("Direct", (referrerMap.get("Direct") || 0) + 1);
        }
      });
      const topRefs = Array.from(referrerMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (topRefs.length > 0 && topRefs[0][0] !== "Direct") {
        const topRef = topRefs[0];
        const pct = Math.round((topRef[1] / (thisWeekCount || 1)) * 100);
        result.push({
          type: "positive",
          category: "Referral",
          message: `Traffic increased ${pct}% due to ${topRef[0]} referrals`,
          detail: `${topRef[0]} sent ${topRef[1]} visitors (${pct}% of total). ${topRefs.length > 1 ? `Other sources: ${topRefs.slice(1).map((r) => r[0]).join(", ")}` : ""}`,
        });
      }

      // Revenue trend
      const thisRevenue = (thisWeekSales || []).reduce((s: number, r: Record<string, number>) => s + Number(r.revenue || 0), 0);
      const lastRevenue = (lastWeekSales || []).reduce((s: number, r: Record<string, number>) => s + Number(r.revenue || 0), 0);
      if (thisRevenue > 0 || lastRevenue > 0) {
        const revChange = lastRevenue ? Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 100) : 100;
        result.push({
          type: revChange >= 0 ? "positive" : "negative",
          category: "Revenue",
          message: revChange >= 0
            ? `Revenue up ${revChange}% this week ($${thisRevenue.toFixed(0)})`
            : `Revenue down ${Math.abs(revChange)}% this week ($${thisRevenue.toFixed(0)})`,
          detail: `This week: $${thisRevenue.toFixed(2)} vs last week: $${lastRevenue.toFixed(2)}. ${(thisWeekSales || []).length} orders this week.`,
        });
      }

      // Conversion source analysis
      const sourceMap = new Map<string, number>();
      (thisWeekSales || []).forEach((s: Record<string, string>) => {
        const src = s.conversion_source || "Direct";
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      const topSource = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topSource && topSource[0] !== "Direct") {
        result.push({
          type: "positive",
          category: "Conversion",
          message: `${topSource[0]} is your top conversion source`,
          detail: `${topSource[0]} drove ${topSource[1]} conversions this week. Consider investing more in this channel.`,
        });
      }

      // Error analysis
      const errorCount = (errors || []).length;
      if (errorCount > 0) {
        const errorUrls = new Map<string, number>();
        (errors || []).forEach((e: Record<string, string>) => {
          const url = e.page_url || "Unknown";
          errorUrls.set(url, (errorUrls.get(url) || 0) + 1);
        });
        const topErrorPage = Array.from(errorUrls.entries()).sort((a, b) => b[1] - a[1])[0];
        result.push({
          type: "negative",
          category: "Errors",
          message: `${errorCount} errors detected this week`,
          detail: topErrorPage ? `Most errors on ${topErrorPage[0]} (${topErrorPage[1]} occurrences). Investigate and fix to improve user experience.` : "Check your error logs for details.",
        });
      }

      // Device analysis
      const deviceMap = new Map<string, number>();
      (sessions || []).forEach((s: Record<string, string | number>) => {
        const d = s.device_type || "Unknown";
        deviceMap.set(d as string, (deviceMap.get(d as string) || 0) + 1);
      });
      const mobilePct = Math.round(((deviceMap.get("Mobile") || 0) / (thisWeekSessions || 1)) * 100);
      if (mobilePct > 60) {
        result.push({
          type: "neutral",
          category: "Audience",
          message: `${mobilePct}% of your visitors are on mobile`,
          detail: "Make sure your site is fully mobile-optimized. Test touch targets, font sizes, and load speed on mobile devices.",
        });
      }

      // Bounce rate / engagement
      const avgDuration = (sessions || []).filter((s: Record<string, unknown>) => s.duration_seconds != null)
        .reduce((s: number, r: Record<string, number>) => s + (r.duration_seconds as number), 0) / ((sessions || []).filter((s: Record<string, unknown>) => s.duration_seconds != null).length || 1);
      const shortSessions = (sessions || []).filter((s: Record<string, number>) => (s.page_views || 0) <= 1).length;
      const bouncePct = Math.round((shortSessions / (thisWeekSessions || 1)) * 100);
      if (bouncePct > 70) {
        result.push({
          type: "negative",
          category: "Engagement",
          message: `High bounce rate: ${bouncePct}%`,
          detail: `Most visitors leave after viewing only one page. Average session duration is ${Math.round(avgDuration)}s. Consider improving content relevance and internal linking.`,
        });
      } else if (bouncePct > 0 && bouncePct < 40) {
        result.push({
          type: "positive",
          category: "Engagement",
          message: `Strong engagement: ${bouncePct}% bounce rate`,
          detail: `Visitors are exploring your site. Average ${Math.round(avgDuration)}s session duration with multiple page views. Your content is resonating well.`,
        });
      }

      // Top content insight
      const pageMap = new Map<string, number>();
      (thisWeekViews || []).forEach((v: Record<string, string>) => {
        const url = v.page_url || "/";
        pageMap.set(url, (pageMap.get(url) || 0) + 1);
      });
      const topPage = Array.from(pageMap.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topPage) {
        const topPct = Math.round((topPage[1] / (thisWeekCount || 1)) * 100);
        result.push({
          type: "neutral",
          category: "Content",
          message: `${topPage[0]} is your most visited page (${topPct}% of views)`,
          detail: `Consider optimizing this page for conversions. It receives ${topPage[1]} of ${thisWeekCount || 0} total page views.`,
        });
      }

      setInsights(result.length > 0 ? result : [{
        type: "neutral" as const,
        category: "Getting Started",
        message: "Start collecting data to see AI insights",
        detail: "Install the KLV tracker on your website. Insights will appear as your site accumulates traffic data.",
      }]);
      setLoading(false);
    } catch (err) {
      console.error("AI insights error:", err);
      setLoading(false);
    }
  };

  if (loading) return <div className="text-slate-400">Generating AI insights...</div>;

  const iconMap = {
    positive: (
      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    negative: (
      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
    neutral: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-cyan-500/10 via-slate-900 to-blue-500/10 border border-cyan-500/20 rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI-Powered Insights</h2>
            <p className="text-slate-400 text-sm">Automated analysis of your analytics data</p>
          </div>
        </div>

        <div className="space-y-4">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`p-5 rounded-lg border ${
                insight.type === "positive"
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : insight.type === "negative"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-slate-800/50 border-slate-700/50"
              }`}
            >
              <div className="flex items-start gap-3">
                {iconMap[insight.type]}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{insight.category}</span>
                  </div>
                  <div className="text-white font-medium">{insight.message}</div>
                  <div className="text-slate-400 text-sm mt-1">{insight.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
