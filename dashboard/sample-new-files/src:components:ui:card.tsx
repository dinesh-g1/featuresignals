import React from 'react';

export function StoneCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-stone-200 shadow-soft hover:shadow-float transition-shadow duration-300 ${className}`}>
      {children}
    </div>
  );
}

// Sub-component for the slide-over panel header
export function SlideOverHeader({ title, onClose }: { title: string, onClose: () => void }) {
  return (
    <div className="flex justify-between items-center p-6 border-b border-stone-100 bg-white sticky top-0 z-10">
      <h2 className="text-xl font-bold text-stone-900">{title}</h2>
      <button onClick={onClose} className="text-stone-400 hover:text-stone-800 bg-stone-50 hover:bg-stone-100 p-2 rounded-full transition-colors">
        ✕
      </button>
    </div>
  );
}