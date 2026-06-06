import { useEffect, useState } from "react";
import { supabase, checkConnection } from "./lib/analytics";
import type { User } from "@supabase/supabase-js";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import PricingPage from "./pages/PricingPage";
import SetupWizard from "./components/SetupWizard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const init = async () => {
      // Check if Supabase is reachable
      const { ok, error } = await checkConnection();
      if (!ok) {
        setConnectionError(error || "Cannot connect to Supabase");
        setLoading(false);
        return;
      }

      // Get auth state
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-slate-400">Connecting...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Connection Error</h2>
          <p className="text-slate-400 mb-2">{connectionError}</p>
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-lg p-6 text-left">
            <h3 className="text-white font-medium mb-3">Troubleshooting</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>1. Make sure <code className="text-cyan-400 bg-slate-800 px-1 rounded">VITE_SUPABASE_URL</code> is set in your deployment environment</li>
              <li>2. Make sure <code className="text-cyan-400 bg-slate-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> is set in your deployment environment</li>
              <li>3. Check that your Supabase project is active and not paused</li>
              <li>4. Verify the Supabase URL is correct and accessible from your network</li>
            </ul>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPath === "/pricing") {
    return <PricingPage />;
  }

  if (currentPath === "/admin/login" || currentPath.startsWith("/admin/login")) {
    return <AdminLogin />;
  }

  if (currentPath === "/admin/dashboard" || currentPath.startsWith("/admin/dashboard")) {
    if (!user) {
      window.location.href = "/admin/login";
      return null;
    }
    return <AdminDashboard />;
  }

  if (currentPath === "/admin/setup" || currentPath.startsWith("/admin/setup")) {
    if (!user) {
      window.location.href = "/admin/login";
      return null;
    }
    return (
      <div className="min-h-screen bg-slate-950 py-12 px-4">
        <SetupWizard onSiteCreated={() => {
          window.location.href = "/admin/dashboard";
        }} />
      </div>
    );
  }

  if (user) {
    window.location.href = "/admin/dashboard";
  } else {
    window.location.href = "/admin/login";
  }

  return null;
}
