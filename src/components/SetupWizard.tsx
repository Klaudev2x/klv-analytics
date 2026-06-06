import React, { useState } from "react";
import { supabase } from "../lib/analytics";

interface SetupProps {
  onSiteCreated?: (siteId: string) => void;
}

export default function SetupWizard({ onSiteCreated }: SetupProps) {
  const [step, setStep] = useState(1);
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdSite, setCreatedSite] = useState(null);

  const handleCreateSite = async () => {
    setError("");
    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-api/sites`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            name: siteName,
            domain: siteDomain,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const msg = errData?.error || `Failed to create site (${response.status})`;
        throw new Error(msg);
      }

      const site = await response.json();
      setCreatedSite(site);
      setStep(2);

      if (onSiteCreated) {
        onSiteCreated(site.id);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to KLV.AI Analytics
          </h2>
          <p className="text-slate-400 mb-8">
            Let's set up tracking for your website.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreateSite();
            }}
            className="space-y-6"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Website Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
                placeholder="e.g., My Website"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Website Domain
              </label>
              <input
                type="text"
                value={siteDomain}
                onChange={(e) => setSiteDomain(e.target.value)}
                required
                placeholder="e.g., example.com"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !siteName || !siteDomain}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-600/50 text-white font-medium rounded-lg transition"
            >
              {loading ? "Creating..." : "Create Site"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 2 && createdSite) {
    const trackingCode = `<script>
  window.KLV_SITE_ID = '${createdSite.id}';
  window.KLV_API_URL = '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-track';
</script>
<script src="https://your-domain.com/kla-tracker.js"><\/script>`;

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Site Created Successfully!
          </h2>
          <p className="text-slate-400 mb-8">
            Your site ID: <code className="text-cyan-400">{createdSite.id}</code>
          </p>

          <div className="space-y-8">
            {/* Installation Instructions */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                1. Add Tracking Script to Your Website
              </h3>
              <p className="text-slate-400 mb-4">
                Copy this code and paste it in the <code className="text-cyan-300">&lt;head&gt;</code> section of your website:
              </p>
              <pre className="bg-slate-950 border border-slate-700 rounded p-4 overflow-x-auto">
                <code className="text-slate-300 text-sm">{trackingCode}</code>
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(trackingCode);
                  alert("Copied to clipboard!");
                }}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded transition"
              >
                Copy Code
              </button>
            </div>

            {/* Verification */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                2. Verify Installation
              </h3>
              <p className="text-slate-400 mb-4">
                After adding the script, visit your website and check:
              </p>
              <ul className="list-disc list-inside text-slate-400 space-y-2">
                <li>Browser console for KLV tracker initialization messages</li>
                <li>Network tab for requests to <code className="text-cyan-300">analytics-track</code></li>
                <li>Your dashboard should show live events</li>
              </ul>
            </div>

            {/* Next Steps */}
            <div className="border-t border-slate-700 pt-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                3. View Your Analytics
              </h3>
              <p className="text-slate-400 mb-6">
                Go to your dashboard to start viewing real-time analytics.
              </p>
              <button
                onClick={() => window.location.href = "/admin/dashboard"}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
