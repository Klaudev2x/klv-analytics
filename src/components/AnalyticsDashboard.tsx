import { useEffect, useState } from "react";
import { supabase, subscribeToEvents } from "../lib/analytics";
import MetricCard from "./MetricCard";
import TrafficChart from "./TrafficChart";
import TopPagesTable from "./TopPagesTable";
import ActivityFeed from "./ActivityFeed";

interface TrafficDataPoint {
  time: string;
  views: number;
}

interface PageData {
  url: string;
  title: string;
  count: number;
}

interface EventData {
  id?: string;
  event_type?: string;
  eventType?: string;
  page_url?: string;
  pageUrl?: string;
  error_message?: string;
  errorMessage?: string;
  created_at?: string;
  createdAt?: string;
  api_status?: number;
  api_response_time_ms?: number;
}

interface AnalyticStats {
  activeUsers: number;
  totalEvents: number;
  topPages: PageData[];
  recentErrors: EventData[];
  pageViewsPerMinute: number;
  apiRequestsPerMinute: number;
  avgResponseTime: number;
  successRate: number;
  trafficData: TrafficDataPoint[];
}

interface Props {
  siteId: string;
}

export default function AnalyticsDashboard({ siteId }: Props) {
  const [stats, setStats] = useState<AnalyticStats>({
    activeUsers: 0,
    totalEvents: 0,
    topPages: [],
    recentErrors: [],
    pageViewsPerMinute: 0,
    apiRequestsPerMinute: 0,
    avgResponseTime: 0,
    successRate: 100,
    trafficData: [],
  });
  const [recentEvents, setRecentEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [siteId]);

  useEffect(() => {
    const unsubscribe = subscribeToEvents(siteId, (event) => {
      const typedEvent = event as EventData;
      setRecentEvents((prev) => [typedEvent, ...prev].slice(0, 50));

      setStats((prev) => ({
        ...prev,
        totalEvents: prev.totalEvents + 1,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [siteId]);

  const loadStats = async () => {
    try {
      const { count: activeSessions } = await supabase
        .from("analytics_sessions")
        .select("*", { count: "exact" })
        .eq("site_id", siteId)
        .is("ended_at", null)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: pageViews } = await supabase
        .from("analytics_events")
        .select("*")
        .eq("site_id", siteId)
        .eq("event_type", "page_view")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      const { data: apiCalls } = await supabase
        .from("analytics_events")
        .select("*")
        .eq("site_id", siteId)
        .eq("event_type", "api_call")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: errors } = await supabase
        .from("analytics_events")
        .select("*")
        .eq("site_id", siteId)
        .eq("event_type", "error")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      const { data: allPageViews } = await supabase
        .from("analytics_events")
        .select("page_url, page_title")
        .eq("site_id", siteId)
        .eq("event_type", "page_view")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const pageViewCounts = new Map<string, number>();
      (allPageViews || []).forEach((pv: Record<string, string>) => {
        const key = pv.page_url;
        pageViewCounts.set(key, (pageViewCounts.get(key) || 0) + 1);
      });

      const topPages: PageData[] = Array.from(pageViewCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([url, count]) => ({
          url,
          count,
          title: allPageViews?.find((pv: Record<string, string>) => pv.page_url === url)?.page_title || url,
        }));

      const successfulRequests = (apiCalls as EventData[])?.filter((call) => call.api_status !== undefined && call.api_status >= 200 && call.api_status < 300).length || 0;
      const totalRequests = (apiCalls as EventData[])?.length || 1;
      const successRate = Math.round((successfulRequests / totalRequests) * 100);

      const avgResponseTime = (apiCalls as EventData[]) && (apiCalls as EventData[]).length > 0
        ? Math.round(
            (apiCalls as EventData[]).reduce((sum, call) => sum + (call.api_response_time_ms || 0), 0) /
              (apiCalls as EventData[]).length
          )
        : 0;

      const now = Date.now();
      const oneMinuteAgo = now - 60 * 1000;
      const pageViewsLastMin = (pageViews as EventData[])?.filter((pv) => new Date(pv.created_at!).getTime() > oneMinuteAgo).length || 0;
      const apiCallsLastMin = (apiCalls as EventData[])?.filter((call) => new Date(call.created_at!).getTime() > oneMinuteAgo).length || 0;

      const trafficData: TrafficDataPoint[] = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now - i * 60 * 60 * 1000);
        const hourEnd = new Date(now - (i - 1) * 60 * 60 * 1000);
        const count = (pageViews as EventData[])?.filter(
          (pv) => {
            const time = new Date(pv.created_at!).getTime();
            return time >= hourStart.getTime() && time < hourEnd.getTime();
          }
        ).length || 0;
        const h = hourStart.getHours();
        const label = `${h === 0 ? '12' : h > 12 ? h - 12 : h}${h < 12 ? 'a' : 'p'}`;
        trafficData.push({
          time: label,
          views: count,
        });
      }

      setStats({
        activeUsers: activeSessions || 0,
        totalEvents: pageViews?.length || 0,
        topPages,
        recentErrors: ((errors as EventData[]) || []).slice(0, 5),
        pageViewsPerMinute: pageViewsLastMin,
        apiRequestsPerMinute: apiCallsLastMin,
        avgResponseTime,
        successRate,
        trafficData,
      });

      setLoading(false);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  if (loading) {
    return <div className="text-slate-400">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Users"
          value={stats.activeUsers}
          trend={5}
          icon="U"
        />
        <MetricCard
          label="Page Views (24h)"
          value={stats.totalEvents}
          trend={12}
          icon="P"
        />
        <MetricCard
          label="Avg Response Time"
          value={`${stats.avgResponseTime}ms`}
          trend={-3}
          icon="T"
        />
        <MetricCard
          label="API Success Rate"
          value={`${stats.successRate}%`}
          trend={2}
          icon="S"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrafficChart data={stats.trafficData} />
        </div>
        <div>
          <TopPagesTable pages={stats.topPages} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed
          title="Recent Events"
          events={recentEvents}
          maxItems={10}
        />
        <ActivityFeed
          title="Recent Errors"
          events={stats.recentErrors}
          maxItems={10}
        />
      </div>
    </div>
  );
}
