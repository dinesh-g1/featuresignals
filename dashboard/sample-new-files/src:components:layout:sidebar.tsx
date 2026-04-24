"use client";
import React from 'react';
import Link from 'next/link';

export function Sidebar() {
  return (
    <aside className="w-64 bg-stone-50 border-r border-stone-200 h-screen flex flex-col pt-4">
      <div className="px-6 mb-8 flex items-center space-x-2">
        <span className="text-accent text-xl font-bold">⚑</span>
        <span className="font-bold tracking-tight text-stone-900">FeatureSignals</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 px-2 mt-4">Workspace</div>
        
        {/* Active State Example */}
        <Link href="/flags" className="flex items-center justify-between px-2 py-2 rounded-md bg-accent/10 text-accent-dark font-medium transition-colors">
          <div className="flex items-center space-x-3">
            <span className="text-lg">🎛️</span>
            <span>Feature Flags</span>
          </div>
          <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">12</span>
        </Link>

        {/* Inactive State Example */}
        <Link href="/segments" className="flex items-center px-2 py-2 rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors font-medium">
          <div className="flex items-center space-x-3">
            <span className="text-lg">👥</span>
            <span>Segments</span>
          </div>
        </Link>

        <Link href="/metrics" className="flex items-center px-2 py-2 rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors font-medium">
          <div className="flex items-center space-x-3">
            <span className="text-lg">📊</span>
            <span>Metrics & A/B</span>
          </div>
        </Link>

        <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 px-2 pt-8">Governance</div>
        <Link href="/approvals" className="flex items-center px-2 py-2 rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors font-medium">
          <div className="flex items-center space-x-3">
            <span className="text-lg">🛡️</span>
            <span>Approvals (CAB)</span>
          </div>
        </Link>
        <Link href="/audit" className="flex items-center px-2 py-2 rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors font-medium">
          <div className="flex items-center space-x-3">
            <span className="text-lg">📑</span>
            <span>Audit Log</span>
          </div>
        </Link>
      </nav>

      {/* AI Janitor Status - Always visible at bottom */}
      <div className="p-4 m-4 bg-white border border-stone-200 rounded-xl shadow-soft">
        <div className="flex items-center space-x-2 text-stone-800 font-semibold text-sm mb-1">
          <span>🤖</span> <span>AI Janitor</span>
        </div>
        <p className="text-xs text-stone-500 mb-3">2 flags ready for cleanup.</p>
        <button className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold py-1.5 rounded transition-colors border border-stone-200">Review PRs</button>
      </div>
    </aside>
  );
}