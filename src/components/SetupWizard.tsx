import { useState, useEffect } from "react";
import { supabase } from "../lib/analytics";
import type { User } from "@supabase/supabase-js";

interface SetupWizardProps {
  onSiteCreated: () => void;
}

export default function SetupWizard({ onSiteCreated }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [siteName, setSiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const getUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    return user;
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const currentUser = user || await getUser();
      if (!currentUser) throw new Error("Not authenticated");

      // Generate a mock site ID
      const newSiteId = `site-${Date.now()}`;
      setSiteId(newSiteId);
      setStep(2);
    } catch (error) {
      console.error("Error creating site:", error);
      alert("Failed to create site");
    } finally {
      setLoading(false);
    }
  };

  const trackingCode = siteId
    ? `<script>
  window.KLA_SITE_ID = '${siteId}';
  window.KLA_API_URL = '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-track';
</script>
<script src="https://your-domain.com/kla-tracker.js"><\/script>`
    : "";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl">
        {/* Progress */}
        <div className="px-8 pt-8">
          <div className="flex items-center justify-between mb-8">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                step >= 1 ? "bg-cyan-500 text-slate-950" : "bg-slate-700 text-slate-400"
              }`}
            >
              1
            </div>
            <div
              className={`flex-1 h-1 mx-4 ${
                step >= 2 ? "bg-cyan-500" : "bg-slate-700"
              }`}
            ></div>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                step >= 2 ? "bg-cyan-500 text-slate-950" : "bg-slate-700 text-slate-400"
              }`}
            >
              2
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-12">
          {step === 1 ? (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Create Your First Site</h2>
              <form onSubmit={handleCreateSite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    placeholder="My Website"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Domain (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !siteName}
                  className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create Site"}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">✓ Site Created!</h2>
              <p className="text-slate-300 mb-6">
                Great! Your site is ready. Now add this tracking code to your website's &lt;head&gt;:
              </p>

              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 overflow-x-auto">
                <pre className="text-cyan-400 text-sm font-mono">{trackingCode}</pre>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(trackingCode);
                  alert("Copied to clipboard!");
                }}
                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition mb-4"
              >
                Copy Code
              </button>

              <button
                onClick={onSiteCreated}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
