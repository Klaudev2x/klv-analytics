export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            KLV.AI Analytics
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Pricing Plans</h2>
          <p className="text-slate-400 mb-12">
            Choose the perfect plan for your analytics needs
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Plan */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8">
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-slate-400 text-sm mb-6">For small projects</p>
              <p className="text-4xl font-bold text-cyan-400 mb-6">Free</p>
              <ul className="space-y-3 text-slate-300 mb-8 text-left">
                <li>✓ 1 Site</li>
                <li>✓ 10K events/month</li>
                <li>✓ Basic analytics</li>
                <li>✓ Real-time dashboard</li>
              </ul>
              <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                Get Started
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-slate-900 border border-2 border-cyan-500 rounded-lg p-8 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-slate-950 px-4 py-1 rounded-full text-sm font-semibold">
                POPULAR
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
              <p className="text-slate-400 text-sm mb-6">For growing businesses</p>
              <p className="text-4xl font-bold text-cyan-400 mb-6">
                $29
                <span className="text-lg text-slate-400">/month</span>
              </p>
              <ul className="space-y-3 text-slate-300 mb-8 text-left">
                <li>✓ 5 Sites</li>
                <li>✓ 1M events/month</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Custom events</li>
                <li>✓ Email support</li>
              </ul>
              <button className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition font-semibold">
                Get Started
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8">
              <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
              <p className="text-slate-400 text-sm mb-6">For large scale</p>
              <p className="text-4xl font-bold text-cyan-400 mb-6">Custom</p>
              <ul className="space-y-3 text-slate-300 mb-8 text-left">
                <li>✓ Unlimited sites</li>
                <li>✓ Unlimited events</li>
                <li>✓ Custom integration</li>
                <li>✓ Dedicated support</li>
                <li>✓ SLA guarantee</li>
              </ul>
              <button className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
