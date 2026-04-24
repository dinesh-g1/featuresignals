"use client";
import React, { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [teamSize, setTeamSize] = useState(50);
  
  // Basic formula: $150k blended salary / 2000 hours = $75/hr. 
  // Assume each dev wastes 1 hour per week per 50 stale flags.
  const calculateRot = (size: number) => {
    return (size * 75 * 52 * 1.5).toLocaleString();
  };

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Global Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-accent text-2xl">⚑</span>
            <span className="font-bold tracking-tight text-stone-900 text-lg">FeatureSignals</span>
          </div>
          <div className="hidden md:flex space-x-8 text-sm font-medium text-stone-600">
            <a href="#architecture" className="hover:text-accent transition-colors">Architecture</a>
            <a href="#gitops" className="hover:text-accent transition-colors">GitOps</a>
            <a href="#flag-rot" className="hover:text-accent transition-colors">AI Janitor</a>
            <Link href="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors">Sign In</a>
            <a href="#" className="text-sm font-semibold bg-accent hover:bg-accent-dark text-white px-5 py-2 rounded-md transition-all shadow-sm">Start Free</a>
          </div>
        </div>
      </nav>

      {/* 1. Hero Section */}
      <section className="pt-40 pb-24 px-6 border-b border-stone-200 bg-stone-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
          <div className="flex justify-center items-center space-x-3 mb-8">
            <span className="bg-white border border-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-full font-mono shadow-sm">SOC 2 Type II</span>
            <span className="bg-white border border-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-full font-mono shadow-sm">OpenFeature Native</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
            Mission-critical flags.<br />
            <span className="text-accent">Zero vendor lock-in.</span>
          </h1>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
            The control plane for software delivery. Sub-millisecond latency. Automated tech-debt cleanup. We integrate natively with Terraform and charge for compute—never by Monthly Active Users.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <a href="#" className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-accent text-white font-semibold shadow-md hover:bg-accent-dark transition-colors">Deploy in 3 Minutes</a>
            <a href="#migration" className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-white text-stone-800 font-semibold border border-stone-200 shadow-sm hover:bg-stone-100 transition-colors">Migrate from LaunchDarkly</a>
          </div>
          <p className="text-sm text-stone-500 font-mono mt-4 font-medium">{`>$ fs migrate --from=launchdarkly --project=core`}</p>
        </div>
      </section>

      {/* 2. Architecture (Dark Contrast Card) */}
      <section id="architecture" className="py-24 px-6 border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Built for 100% Availability.</h2>
            <p className="text-lg text-stone-600 leading-relaxed">
              If our core API goes down, your application shouldn't. Our decentralized edge architecture ensures zero-downtime evaluations, while background polling keeps your latency strictly under 5ms globally.
            </p>
          </div>

          <div className="bg-stone-900 p-10 rounded-2xl border border-stone-800 shadow-xl w-full relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 text-stone-800 text-9xl opacity-30">⚑</div>
            <h3 className="text-2xl font-bold text-white mb-4 relative z-10">The Hybrid-Edge Architecture</h3>
            <p className="text-stone-300 text-base leading-relaxed mb-8 relative z-10">
              To win enterprise and startup alike, the control plane (UI, RBAC, Audit) must be managed SaaS, while the data plane runs at the edge (Cloudflare Workers/Fastly) or entirely locally within the customer's VPC via a lightweight binary sidecar.
            </p>
            <div className="flex flex-wrap gap-4 relative z-10">
              <div className="border border-stone-700 bg-stone-800 text-stone-200 font-mono text-sm px-4 py-2 rounded-md">Sub 1ms Latency</div>
              <div className="border border-stone-700 bg-stone-800 text-stone-200 font-mono text-sm px-4 py-2 rounded-md">Zero PII Egress</div>
              <div className="border border-stone-700 bg-stone-800 text-stone-200 font-mono text-sm px-4 py-2 rounded-md">100% Uptime Resiliency</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The "Flag Rot" AI Janitor */}
      <section id="flag-rot" className="py-24 px-6 border-b border-stone-200 bg-stone-50">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">The hidden tax on engineering velocity.</h2>
            <p className="text-lg text-stone-600">Every stale feature flag is a logic path that must be tested and maintained. Eradicate debt with the AI Janitor.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-8">
              <p className="text-stone-700 leading-relaxed text-lg">
                FeatureSignals doesn't just manage flags; it cleans them up. Our AI Janitor monitors your production telemetry. When a feature reaches 100% rollout, the engine automatically issues a GitHub Pull Request to delete the dead code.
              </p>
              
              <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
                <h3 className="text-xl font-bold text-stone-900 mb-6">Calculate Liability</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-semibold text-stone-700">Engineering Team Size</label>
                      <span className="text-accent font-mono font-bold">{teamSize}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="500" 
                      value={teamSize} 
                      onChange={(e) => setTeamSize(Number(e.target.value))}
                      className="w-full" 
                    />
                  </div>
                  <div className="pt-6 border-t border-stone-200">
                    <div className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-2">Annual Financial Hemorrhage</div>
                    <div className="text-5xl font-extrabold text-stone-900 tracking-tight">
                      $<span className="text-accent">{calculateRot(teamSize)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* UI Recreation: Flag Configuration Card */}
            <div className="bg-stone-200 p-8 rounded-2xl border border-stone-300 h-full flex flex-col justify-center">
              <div className="mb-4 text-stone-600 text-sm flex items-center gap-2">
                <span className="text-accent text-lg">🎛️</span>
                <span className="font-bold text-stone-800">Component: Flag Configuration Card</span>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 w-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-stone-900">New Checkout Flow</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded font-semibold border border-emerald-200">Operational</span>
                    </div>
                    <div className="text-stone-500 font-mono text-sm">key: <span className="bg-stone-100 px-1 py-0.5 rounded text-stone-700 border border-stone-200">`new-checkout-flow`</span></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-accent px-3 py-1 text-white text-xs font-bold rounded-full">ON</span>
                  </div>
                </div>

                <hr className="border-stone-100 mb-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Targeting Rules</div>
                    <div className="bg-stone-50 border border-stone-200 rounded p-4 text-sm">
                      <div className="text-stone-700 mb-2">IF <span className="bg-accent/10 text-accent-dark font-mono px-1 rounded">user.plan</span> EQUALS <span className="bg-stone-200 text-stone-800 font-mono px-1 rounded">'enterprise'</span></div>
                      <div className="text-stone-700">SERVE <span className="text-emerald-600 font-bold">True (100%)</span></div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Staleness / Tech Debt</div>
                    <div className="bg-amber-50 border border-amber-200 rounded p-4">
                      <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm mb-2">
                        <span className="text-amber-500 text-lg">⚠</span>
                        <span>Flag is 100% rolled out</span>
                      </div>
                      <p className="text-amber-700 text-xs mb-4">Active in Production for 45 days. Ready for cleanup.</p>
                      <button className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1.5 rounded shadow-sm hover:bg-amber-200 transition-colors">Generate Cleanup PR</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Radical Pricing */}
      <section id="pricing" className="py-24 px-6 border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">Pay for infrastructure. Not your success.</h2>
            <p className="text-lg text-stone-600">Legacy tools tax your growth by charging per Monthly Active User. We charge a flat rate. Unlimited MAUs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-bold text-stone-800 mb-2">Developer</h3>
              <div className="text-4xl font-extrabold text-stone-900 mb-8">Free<span className="text-lg font-medium text-stone-500">/mo</span></div>
              <ul className="space-y-4 text-sm text-stone-600 flex-1 font-medium">
                <li>✓ Unlimited MAUs</li>
                <li>✓ 3 Team Seats</li>
                <li>✓ Core Boolean & JSON Flags</li>
              </ul>
              <button className="w-full mt-8 py-3 rounded-md border border-stone-300 text-stone-800 font-bold hover:bg-stone-100 transition shadow-sm">Start Building</button>
            </div>

            <div className="bg-white p-8 rounded-2xl border-2 border-accent flex flex-col relative shadow-xl transform md:-translate-y-4">
              <div className="absolute -top-3 inset-x-0 text-center"><span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">Most Popular</span></div>
              <h3 className="text-xl font-bold text-accent mb-2">Pro</h3>
              <div className="text-4xl font-extrabold text-stone-900 mb-8">$99<span className="text-lg font-medium text-stone-500">/mo</span></div>
              <ul className="space-y-4 text-sm text-stone-600 flex-1 font-medium">
                <li>✓ Everything in Developer</li>
                <li>✓ 15 Team Seats</li>
                <li>✓ AI Janitor (Automated PRs)</li>
                <li>✓ A/B Testing Engine</li>
              </ul>
              <button className="w-full mt-8 py-3 rounded-md bg-accent text-white font-bold hover:bg-accent-dark transition shadow-md">Upgrade to Pro</button>
            </div>

            <div className="bg-stone-50 p-8 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-bold text-stone-800 mb-2">Enterprise</h3>
              <div className="text-4xl font-extrabold text-stone-900 mb-8">Custom</div>
              <ul className="space-y-4 text-sm text-stone-600 flex-1 font-medium">
                <li>✓ Dedicated VPS / Air-Gapped</li>
                <li>✓ Multi-stage Approvals</li>
                <li>✓ SAML SSO & SCIM</li>
              </ul>
              <button className="w-full mt-8 py-3 rounded-md border border-stone-300 text-stone-800 font-bold hover:bg-stone-100 transition shadow-sm">Talk to Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="py-12 px-6 bg-stone-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2 text-stone-400">
            <div className="w-2.5 h-2.5 bg-accent rounded-full"></div>
            <span className="font-mono text-sm font-medium">All Edge Nodes Operational</span>
          </div>
          <div className="flex gap-8 text-sm text-stone-400 font-medium">
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">Terraform Registry</a>
            <a href="#" className="hover:text-white transition-colors">Security (SOC 2)</a>
          </div>
          <div className="text-stone-500 text-sm font-medium">© 2026 FeatureSignals Inc.</div>
        </div>
      </footer>
    </main>
  );
}