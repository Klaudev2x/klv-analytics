import { useEffect, useState } from "react";
import { supabase } from "../lib/analytics";

interface Goal {
  id: string;
  name: string;
  goal_type: string;
  target_url: string | null;
  target_event: string | null;
  target_duration_seconds: number | null;
  is_active: boolean;
  conversions: number;
  conversionRate: number;
}

interface Props {
  siteId: string;
}

export default function ConversionsTab({ siteId }: Props) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("page_view");
  const [formTarget, setFormTarget] = useState("");
  const [formDuration, setFormDuration] = useState("30");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
    const interval = setInterval(loadGoals, 15000);
    return () => clearInterval(interval);
  }, [siteId]);

  const loadGoals = async () => {
    try {
      const { data: goalsData } = await supabase
        .from("analytics_conversion_goals")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get total sessions for conversion rate
      const { count: totalSessions } = await supabase
        .from("analytics_sessions")
        .select("*", { count: "exact", head: true })
        .eq("site_id", siteId)
        .gte("created_at", since);

      const enriched: Goal[] = await Promise.all(
        (goalsData || []).map(async (g: Record<string, unknown>) => {
          let conversions = 0;

          if (g.goal_type === "page_view" && g.target_url) {
            const { count } = await supabase
              .from("analytics_events")
              .select("*", { count: "exact", head: true })
              .eq("site_id", siteId)
              .eq("event_type", "page_view")
              .gte("created_at", since)
              .eq("page_url", g.target_url as string);
            conversions = count || 0;
          } else if (g.goal_type === "event" && g.target_event) {
            const { count } = await supabase
              .from("analytics_events")
              .select("*", { count: "exact", head: true })
              .eq("site_id", siteId)
              .eq("event_type", g.target_event as string)
              .gte("created_at", since);
            conversions = count || 0;
          } else if (g.goal_type === "duration" && g.target_duration_seconds) {
            const { count } = await supabase
              .from("analytics_sessions")
              .select("*", { count: "exact", head: true })
              .eq("site_id", siteId)
              .gte("created_at", since)
              .gte("duration_seconds", g.target_duration_seconds as number);
            conversions = count || 0;
          } else if (g.goal_type === "custom") {
            const { count } = await supabase
              .from("analytics_sales")
              .select("*", { count: "exact", head: true })
              .eq("site_id", siteId)
              .gte("created_at", since);
            conversions = count || 0;
          }

          const conversionRate = totalSessions ? Math.round((conversions / totalSessions) * 10000) / 100 : 0;

          return {
            id: g.id as string,
            name: g.name as string,
            goal_type: g.goal_type as string,
            target_url: g.target_url as string | null,
            target_event: g.target_event as string | null,
            target_duration_seconds: g.target_duration_seconds as number | null,
            is_active: g.is_active as boolean,
            conversions,
            conversionRate,
          };
        })
      );

      setGoals(enriched);
      setLoading(false);
    } catch (err) {
      console.error("Conversions tab error:", err);
      setLoading(false);
    }
  };

  const createGoal = async () => {
    setSaving(true);
    try {
      const insert: Record<string, unknown> = {
        site_id: siteId,
        name: formName,
        goal_type: formType,
      };

      if (formType === "page_view") insert.target_url = formTarget;
      else if (formType === "event") insert.target_event = formTarget;
      else if (formType === "duration") insert.target_duration_seconds = parseInt(formDuration) || 30;

      const { error } = await supabase
        .from("analytics_conversion_goals")
        .insert(insert);

      if (error) {
        alert(error.message);
      } else {
        setShowForm(false);
        setFormName("");
        setFormTarget("");
        loadGoals();
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (id: string) => {
    await supabase.from("analytics_conversion_goals").delete().eq("id", id);
    loadGoals();
  };

  if (loading) return <div className="text-slate-400">Loading conversion data...</div>;

  const typeLabel = (t: string) => {
    switch (t) {
      case "page_view": return "Page Visit";
      case "event": return "Custom Event";
      case "duration": return "Time on Site";
      case "custom": return "Purchase";
      default: return t;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Active Goals</span>
          <div className="text-3xl font-bold text-white mt-2">{goals.filter((g) => g.is_active).length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Total Conversions (30d)</span>
          <div className="text-3xl font-bold text-white mt-2">{goals.reduce((s, g) => s + g.conversions, 0)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <span className="text-slate-400 text-sm">Avg Conversion Rate</span>
          <div className="text-3xl font-bold text-white mt-2">
            {goals.length > 0
              ? (goals.reduce((s, g) => s + g.conversionRate, 0) / goals.length).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>

      {/* Add goal button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition"
        >
          + Add Goal
        </button>
      </div>

      {/* New goal form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Conversion Goal</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Goal Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Newsletter Signup"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Goal Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="page_view">Page Visit</option>
                <option value="event">Custom Event</option>
                <option value="duration">Time on Site</option>
                <option value="custom">Purchase</option>
              </select>
            </div>
            {(formType === "page_view" || formType === "event") && (
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  {formType === "page_view" ? "Target URL" : "Event Name"}
                </label>
                <input
                  type="text"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder={formType === "page_view" ? "/thank-you" : "signup_complete"}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
            {formType === "duration" && (
              <div>
                <label className="block text-sm text-slate-300 mb-1">Minimum Duration (seconds)</label>
                <input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={createGoal}
                disabled={saving || !formName}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              >
                {saving ? "Creating..." : "Create Goal"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center">
          <p className="text-slate-400 mb-2">No conversion goals set up yet.</p>
          <p className="text-slate-500 text-sm">Add goals to track signups, purchases, page visits, and more.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h4 className="text-white font-medium">{goal.name}</h4>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">
                      {typeLabel(goal.goal_type)}
                    </span>
                    {!goal.is_active && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded">Paused</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">
                    {goal.goal_type === "page_view" && goal.target_url && `Target: ${goal.target_url}`}
                    {goal.goal_type === "event" && goal.target_event && `Event: ${goal.target_event}`}
                    {goal.goal_type === "duration" && goal.target_duration_seconds && `Min ${goal.target_duration_seconds}s`}
                    {goal.goal_type === "custom" && "Tracks completed purchases"}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{goal.conversions}</div>
                    <div className="text-xs text-slate-400">conversions</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{goal.conversionRate}%</div>
                    <div className="text-xs text-slate-400">rate</div>
                  </div>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition"
                    title="Delete goal"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Conversion bar */}
              <div className="mt-4">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(goal.conversionRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
