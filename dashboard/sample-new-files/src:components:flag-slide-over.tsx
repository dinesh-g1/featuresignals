"use client";
import React, { useState } from 'react';

// --- Types ---
interface Rule {
  id: string;
  name: string;
  attribute: string;
  operator: string;
  value: string;
  serveVariation: string;
}

interface FlagSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  flagName?: string;
  flagKey?: string;
}

export function FlagConfigurationSlideOver({ 
  isOpen, 
  onClose, 
  flagName = "New Checkout Flow", 
  flagKey = "new-checkout-flow" 
}: FlagSlideOverProps) {
  const [activeTab, setActiveTab] = useState<'targeting' | 'variations' | 'governance'>('targeting');
  const [isEnabled, setIsEnabled] = useState(true);

  // Mock Rules State for the Drill-Down
  const [rules, setRules] = useState<Rule[]>([
    { id: '1', name: 'Internal Beta Testing', attribute: 'user.email', operator: 'ENDS_WITH', value: '@acmecorp.com', serveVariation: 'True' },
    { id: '2', name: 'Enterprise Plan Users', attribute: 'tenant.plan', operator: 'EQUALS', value: 'enterprise', serveVariation: 'True' }
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Slide-Over Panel */}
      <div className="relative w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-300">
        
        {/* Header: Context & Master Toggle */}
        <header className="px-8 py-6 border-b border-stone-100 bg-stone-50 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h2 className="text-2xl font-bold text-stone-900 tracking-tight">{flagName}</h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                Operational
              </span>
            </div>
            <div className="flex items-center space-x-2 text-stone-500 font-mono text-sm">
              <span>key:</span>
              <span className="bg-stone-200 px-1.5 py-0.5 rounded text-stone-700 select-all">{flagKey}</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Master State</span>
              <button 
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${isEnabled ? 'bg-accent' : 'bg-stone-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${isEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-800 bg-white hover:bg-stone-100 border border-stone-200 p-2 rounded-full transition-colors shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex px-8 border-b border-stone-200 bg-white shrink-0">
          {['targeting', 'variations', 'governance'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-4 text-sm font-semibold capitalize tracking-wide transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'border-accent text-accent' 
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-stone-50/50">
          
          {/* AI Janitor Banner (Tech Debt Warning) */}
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm flex items-start justify-between">
            <div className="flex space-x-3">
              <span className="text-amber-500 text-xl">🤖</span>
              <div>
                <h4 className="text-amber-900 font-bold text-sm">AI Janitor Recommendation</h4>
                <p className="text-amber-700 text-sm mt-1">This flag has served 100% "True" for 45 days in Production. It is safe to remove.</p>
              </div>
            </div>
            <button className="bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-colors whitespace-nowrap">
              Generate Cleanup PR
            </button>
          </div>

          {/* Targeting Rules Editor */}
          {activeTab === 'targeting' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Targeting Rules</h3>
                  <p className="text-sm text-stone-500">Rules are evaluated top-to-bottom. The first matching rule applies.</p>
                </div>
                <button className="text-accent hover:text-accent-dark font-semibold text-sm flex items-center bg-accent/5 hover:bg-accent/10 px-3 py-1.5 rounded-md transition-colors">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  Add Rule
                </button>
              </div>

              {/* Rules List */}
              <div className="space-y-4">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden transition-all hover:border-stone-300">
                    <div className="bg-stone-50 border-b border-stone-100 px-4 py-2.5 flex items-center justify-between cursor-move">
                      <div className="flex items-center space-x-2 text-stone-500 font-semibold text-xs uppercase tracking-wider">
                        <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg>
                        <span>Rule {index + 1}: {rule.name}</span>
                      </div>
                      <button className="text-stone-400 hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                    <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-stone-600">IF</span>
                        <select className="bg-accent/10 text-accent-dark font-mono border border-accent/20 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer">
                          <option>{rule.attribute}</option>
                        </select>
                        <select className="bg-stone-50 text-stone-700 font-semibold border border-stone-200 rounded px-2 py-1 outline-none cursor-pointer">
                          <option>{rule.operator}</option>
                        </select>
                        <input 
                          type="text" 
                          defaultValue={rule.value} 
                          className="bg-stone-100 text-stone-800 font-mono border border-stone-200 rounded px-3 py-1 outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                        />
                      </div>
                      <div className="flex items-center space-x-3 bg-stone-50 px-4 py-2 rounded-lg border border-stone-200 shrink-0">
                        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Serve</span>
                        <select className="font-bold text-emerald-600 bg-transparent outline-none cursor-pointer">
                          <option>True</option>
                          <option>False</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Default Fallback Rule */}
                <div className="bg-stone-100 border border-stone-200 rounded-xl overflow-hidden opacity-80">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <span className="font-bold text-stone-600">Default Rule (Fallback)</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Serve</span>
                      <span className="font-bold text-stone-500 bg-stone-200 px-3 py-1 rounded">False</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer: Enterprise Governance Actions */}
        <footer className="px-8 py-5 border-t border-stone-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-sm text-stone-500 flex items-center">
             <span className="w-2 h-2 rounded-full bg-accent mr-2"></span>
             Unsaved changes
          </div>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-md font-semibold text-stone-600 hover:bg-stone-100 transition-colors">
              Cancel
            </button>
            {/* Enterprise CAB Workflow Integration */}
            <button className="px-6 py-2.5 rounded-md font-bold bg-stone-900 text-white shadow-md hover:bg-black transition-colors flex items-center">
              <svg className="w-4 h-4 mr-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Request CAB Approval
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}