import { useState, useEffect } from "react";
import { supabase } from "../lib/analytics";
import type { User } from "@supabase/supabase-js";

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<any[]>([]);
  const [showNewSite, setShowNewSite] = useState(false);
  const [siteName, setSiteName] = useState("");

  useEffect(() => {
    const initDashboard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/admin/login";
        return;
      }
      setUser(user);
      await loadSites();
      setLoading(false);
    };

    initDashboard();
  }, []);

  const loadSites = async () => {
    try {
      // Mock data - replace with actual Supabase query when DB is ready
      setSites([
        {
          id: "site-1",
          name: "My Website",
          domain: "mywebsite.com",
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error loading sites:", error);
    }
  };

  const createSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName || !user) return;

    try {
      const newSite = {
        id: `site-${Date.now()}`,
        name: siteName,
        user_id: user.id,
        domain: siteName.toLowerCase().replace(/\s+/g, "-"),
        created_at: new Date().toISOString(),
      };
      setSites([newSite, ...sites]);
      setSiteName("");
      setShowNewSite(false);
    } catch (error) {
      console.error("Error creating site:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            KLV.AI Analytics
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back!</h2>
          <p className="text-slate-400">
            Manage your analytics sites and track real-time metrics
          </p>
        </div>

        {/* Create Site Button */}
        <div className="mb-8">
          {!showNewSite ? (
            <button
              onClick={() => setShowNewSite(true)}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg transition"
            >
              + Create New Site
            </button>
          ) : (
            <form
              onSubmit={createSite}
              className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md"
            >
              <input
                type="text"
                placeholder="Site name (e.g., mysite.com)"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 mb-4 focus:outline-none focus:border-cyan-500"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSite(false);
                    setSiteName("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-400 mb-4">No sites yet. Create one to get started!</p>
            </div>
          ) : (
            sites.map((site) => (
              <div
                key={site.id}
                className="bg-slate-900 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition"
              >
                <h3 className="text-lg font-semibold text-white mb-2">{site.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{site.domain}</p>
                <button
                  onClick={() => {
                    window.location.href = `/admin/dashboard?siteId=${site.id}`;
                  }}
                  className="w-full px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition text-sm font-medium"
                >
                  View Analytics
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
