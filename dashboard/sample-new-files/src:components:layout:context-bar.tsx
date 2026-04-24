"use client";
import React from 'react';

export function ContextBar() {
  return (
    <header className="h-14 bg-white border-b border-stone-200 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Breadcrumbs & Context */}
      <div className="flex items-center space-x-2 text-sm font-medium">
        <span className="text-stone-400 hover:text-stone-800 cursor-pointer transition-colors">Acme Corp</span>
        <span className="text-stone-300">/</span>
        
        {/* Project Selector (Drill-down element) */}
        <button className="flex items-center space-x-1 text-stone-900 bg-stone-50 hover:bg-stone-100 px-2 py-1 rounded-md border border-stone-200 transition-all">
          <span>Core API</span>
          <span className="text-stone-400 text-xs">▼</span>
        </button>

        <span className="text-stone-300">/</span>
        
        {/* Environment Selector (Drill-down element) */}
        <button className="flex items-center space-x-1 text-stone-900 bg-stone-50 hover:bg-stone-100 px-2 py-1 rounded-md border border-stone-200 transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
          <span>Production</span>
          <span className="text-stone-400 text-xs">▼</span>
        </button>
      </div>

      {/* Omni-Search & Profile */}
      <div className="flex items-center space-x-4">
        <button className="flex items-center justify-between bg-stone-50 border border-stone-200 text-stone-500 px-3 py-1.5 rounded-md w-64 hover:bg-stone-100 transition-all">
          <span className="text-sm">Search flags, segments...</span>
          <kbd className="font-mono text-[10px] bg-white border border-stone-200 px-1.5 py-0.5 rounded text-stone-400">Cmd K</kbd>
        </button>
        <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm shadow-sm">
          DM
        </div>
      </div>
    </header>
  );
}