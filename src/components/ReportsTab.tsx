import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";

interface EmailReport {
  id: string;
  email: string;
  frequency: string;
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
}

interface Props {
  siteId: string;
}

export default function ReportsTab({ siteId }: Props) {
  const [reports, setReports] = useState<EmailReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState("");
  const [formFrequency, setFormFrequency] = useState("weekly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReports();
  }, [siteId]);

  const loadReports = async () => {
    try {
      const { data } = await supabase
        .from("analytics_email_reports")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

      setReports((data || []) as EmailReport[]);
      setLoading(false);
    } catch (err) {
      console.error("Reports tab error:", err);
      setLoading(false);
    }
  };

  const createReport = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("analytics_email_reports")
        .insert({
          site_id: siteId,
          email: formEmail,
          frequency: formFrequency,
          is_active: true,
        });

      if (error) {
        alert(error.message);
      } else {
        setShowForm(false);
        setFormEmail("");
        loadReports();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleReport = async (id: string, isActive: boolean) => {
    await supabase
      .from("analytics_email_reports")
      .update({ is_active: !isActive })
      .eq("id", id);
    loadReports();
  };

  const deleteReport = async (id: string) => {
    await supabase.from("analytics_email_reports").delete().eq("id", id);
    loadReports();
  };

  const freqLabel = (f: string) => {
    switch (f) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      default: return f;
    }
  };

  if (loading) return <div className="text-slate-400">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Email Reports</h3>
            <p className="text-sm text-slate-400 mt-1">Get analytics summaries delivered to your inbox</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition"
          >
            + Add Recipient
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <h4 className="text-white text-sm font-medium mb-3">New Email Report</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@example.com"
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
              <select
                value={formFrequency}
                onChange={(e) => setFormFrequency(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={createReport}
                  disabled={saving || !formEmail}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400 mb-2">No email reports configured.</p>
            <p className="text-slate-500 text-xs">Add an email address to receive scheduled analytics reports.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-white text-sm">{report.email}</div>
                    <div className="text-xs text-slate-400">
                      {freqLabel(report.frequency)}
                      {report.last_sent_at && ` - Last sent ${new Date(report.last_sent_at).toLocaleDateString()}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleReport(report.id, report.is_active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      report.is_active ? "bg-cyan-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        report.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Report Preview</h3>
        <div className="bg-white rounded-lg p-6 text-slate-900">
          <div className="border-b border-slate-200 pb-4 mb-4">
            <h4 className="text-lg font-bold text-slate-900">KLV.AI Analytics Report</h4>
            <p className="text-slate-500 text-sm">Weekly summary for your website</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Page Views</span>
              <span className="font-medium">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Unique Visitors</span>
              <span className="font-medium">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Avg Session Duration</span>
              <span className="font-medium">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Bounce Rate</span>
              <span className="font-medium">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Conversions</span>
              <span className="font-medium">--</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Revenue</span>
              <span className="font-medium">--</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400">Powered by KLV.AI Analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
}
