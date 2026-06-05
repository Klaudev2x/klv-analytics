import { useState } from "react";
import { supabase } from "../lib/analytics";

interface Tier {
  name: string;
  price: string;
  period: string;
  sites: string;
  dataRetention: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    sites: "1 site",
    dataRetention: "30 days",
    features: [
      "1 website tracked",
      "30-day data retention",
      "Basic traffic stats",
      "Real-time visitor count",
      "Top pages report",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    sites: "5 sites",
    dataRetention: "12 months",
    features: [
      "Up to 5 websites",
      "12-month data retention",
      "Conversion tracking",
      "Sales analytics",
      "Audience breakdowns",
      "Email reports (weekly)",
      "API monitoring",
    ],
    cta: "Start Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$29",
    period: "/month",
    sites: "25 sites",
    dataRetention: "24 months",
    features: [
      "Up to 25 websites",
      "24-month data retention",
      "AI-powered summaries",
      "SEO insights",
      "Conversion funnels",
      "Email reports (daily)",
      "Custom event tracking",
      "Priority support",
    ],
    cta: "Start Business",
    highlighted: false,
  },
  {
    name: "Agency",
    price: "$99",
    period: "/month",
    sites: "Unlimited sites",
    dataRetention: "Unlimited",
    features: [
      "Unlimited websites",
      "Unlimited data retention",
      "White-label reports",
      "Client dashboard access",
      "API access for all sites",
      "AI summaries + predictions",
      "Dedicated account manager",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (tier: Tier) => {
    setLoading(tier.name);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/admin/login";
      setLoading(null);
      return;
    }

    if (tier.name === "Free") {
      window.location.href = "/admin/setup";
      setLoading(null);
      return;
    }

    // For paid tiers, redirect to a billing page (Stripe integration placeholder)
    // In production, this would create a Stripe checkout session
    alert(`${tier.name} plan selected! Stripe integration will handle payment processing.`);
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <h1 className="text-xl font-bold text-white">KLV.AI</h1>
          </div>
          <button
            onClick={() => { window.location.href = "/admin/login"; }}
            className="px-4 py-2 text-sm font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition"
          >
            Sign In
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Start free. Upgrade when you need more sites, longer data retention, or advanced analytics features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-slate-900 border rounded-xl p-8 flex flex-col transition hover:scale-[1.02] ${
                tier.highlighted
                  ? "border-cyan-500 shadow-lg shadow-cyan-500/10"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-500 text-white text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-slate-400 text-sm">{tier.period}</span>
                </div>
              </div>

              <div className="mb-6 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-cyan-400">+</span> {tier.sites}
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-cyan-400">+</span> {tier.dataRetention} retention
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(tier)}
                disabled={loading === tier.name}
                className={`w-full py-3 rounded-lg font-medium text-sm transition ${
                  tier.highlighted
                    ? "bg-cyan-600 hover:bg-cyan-700 text-white"
                    : "bg-slate-800 hover:bg-slate-700 text-white"
                } disabled:opacity-50`}
              >
                {loading === tier.name ? "Loading..." : tier.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-400 text-sm">
            All plans include real-time visitor tracking, traffic source analysis, and SSL encryption.
          </p>
        </div>
      </div>
    </div>
  );
}
