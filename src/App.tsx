import { useEffect, useState } from "react";
import { supabase } from "./lib/analytics";
import type { User } from "@supabase/supabase-js";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import PricingPage from "./pages/PricingPage";
import SetupWizard from "./components/SetupWizard";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    initAuth();

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
          <p className="mt-4 text-slate-400">Loading...</p>
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
