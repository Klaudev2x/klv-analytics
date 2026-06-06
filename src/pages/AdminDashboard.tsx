import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";
import type { User } from "@supabase/supabase-js";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import SalesTab from "../components/SalesTab";
import AudienceTab from "../components/AudienceTab";
import ApiTab from "../components/ApiTab";
import ConversionsTab from "../components/ConversionsTab";
import SeoTab from "../components/SeoTab";
import AiInsightsTab from "../components/AiInsightsTab";
import ReportsTab from "../components/ReportsTab";

interface Site {
  id: string;
  name: string;
  domain: string;
}

interface Subscription {
  tier: string;
}

type Tab = "overview" | "traffic" | "sales" | "audience" | "api" | "conversions" | "seo" | "insights" | "reports";

const tabs: { id: Tab; label: string; minTier: string }[] = [
  { id: "overview", label: "Overview", minTier: "free" },
  { id: "traffic", label: "Traffic", minTier: "free" },
  { id: "sales", label: "Sales", minTier: "pro" },
  { id: "audience", label: "Audience", minTier: "pro" },
  { id: "api", label: "API", minTier: "pro" },
  { id: "conversions", label: "Conversions", minTier: "pro" },
  { id: "seo", label: "SEO", minTier: "business" },
  { id: "insights", label: "AI Insights", minTier: "business" },
  { id: "reports", label: "Reports", minTier: "pro" },
];

const TIER_ORDER = ["free", "pro", "business", "agency"];

function hasAccess(userTier: string, requiredTier: string): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

const TIER_LIMITS: Record<string, number> = {
  free: 1,
  pro: 5,
  business: 25,
  agency: Infinity,
};

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          loadSubscription();
          loadSites();
        } else {
          window.location.href = "/admin/login";
        }
      } catch {
        setError("Cannot connect to the server. Please check your connection and refresh.");
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("tier")
        .maybeSingle();
      setSubscription(data as Subscription | null);

      // Auto-create free tier if no subscription exists
      if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("subscriptions").insert({
            user_id: user.id,
            tier: "free",
          });
          setSubscription({ tier: "free" });
        }
      }
    } catch {
      setSubscription({ tier: "free" });
    }
  };

  const loadSites = async () => {
    const { data, error } = await supabase
      .from("analytics_sites")
      .select("id, name, domain")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else if (data) {
      setSites(data as Site[]);
      if (data.length > 0) {
        setSelectedSite(data[0].id);
      }
    }
    setLoading(false);
  };

  const userTier = subscription?.tier || "free";
  const siteLimit = TIER_LIMITS[userTier] ?? 1;
  const canCreateSite = sites.length < siteLimit;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const tierBadge = userTier !== "free" ? (
    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full font-medium uppercase">{userTier}</span>
  ) : null;

  const UpgradeBanner = () => (
    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-6 text-center">
      <h3 className="text-white font-semibold mb-2">Upgrade to unlock this feature</h3>
      <p className="text-slate-400 text-sm mb-4">This tab requires the Pro or Business plan.</p>
      <button
        onClick={() => { window.location.href = "/pricing"; }}
        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition"
      >
        View Pricing
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">KLV.AI</h1>
                {tierBadge}
              </div>
              <p className="text-xs text-slate-400">by Claude Atsika</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sites.length > 0 && (
              <select
                value={selectedSite || ""}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 transition"
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.domain})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                if (!canCreateSite) {
                  alert(`Your ${userTier} plan allows ${siteLimit === Infinity ? "unlimited" : siteLimit} site(s). Upgrade to add more.`);
                  return;
                }
                window.location.href = "/admin/setup";
              }}
              className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
            >
              + New Site
            </button>
            <button
              onClick={() => { window.location.href = "/pricing"; }}
              className="px-4 py-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition"
            >
              Pricing
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/admin/login";
              }}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            Error: {error}
          </div>
        )}

        {selectedSite && sites.length > 0 ? (
          <>
            {/* Tab navigation */}
            <div className="mb-8 overflow-x-auto">
              <div className="flex gap-1 bg-slate-900/50 border border-slate-800 rounded-lg p-1 min-w-max">
                {tabs.map((tab) => {
                  const locked = !hasAccess(userTier, tab.minTier);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-md transition whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20"
                          : locked
                          ? "text-slate-500 cursor-not-allowed"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {tab.label}
                      {locked && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "overview" && <AnalyticsDashboard siteId={selectedSite} />}
            {activeTab === "traffic" && <AnalyticsDashboard siteId={selectedSite} />}
            {activeTab === "sales" && (hasAccess(userTier, "pro") ? <SalesTab siteId={selectedSite} /> : <UpgradeBanner />)}
            {activeTab === "audience" && (hasAccess(userTier, "pro") ? <AudienceTab siteId={selectedSite} /> : <UpgradeBanner />)}
            {activeTab === "api" && (hasAccess(userTier, "pro") ? <ApiTab siteId={selectedSite} /> : <UpgradeBanner />)}
            {activeTab === "conversions" && (hasAccess(userTier, "pro") ? <ConversionsTab siteId={selectedSite} /> : <UpgradeBanner />)}
            {activeTab === "seo" && (hasAccess(userTier, "business") ? <SeoTab siteId={selectedSite} /> : <UpgradeBanner />)}
            {activeTab === "insights" && (hasAccess(userTier, "business") ? <AiInsightsTab siteId={selectedSite} /> : <UpgradeBanner />)}
            {activeTab === "reports" && (hasAccess(userTier, "pro") ? <ReportsTab siteId={selectedSite} /> : <UpgradeBanner />)}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No sites configured yet.</p>
            <button
              onClick={() => { window.location.href = "/admin/setup"; }}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition"
            >
              Create Your First Site
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
