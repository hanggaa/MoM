import React from 'react';
import { Sparkles, KeyRound, ShieldCheck } from 'lucide-react';

export const Navbar = ({ onOpenSettings, isByokSet, isServerOnline }) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/80 border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20 text-primary flex items-center justify-center">
            <Sparkles size={24} className="stroke-[2]" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-2xl font-display font-semibold tracking-tight text-white leading-none">
              AIMeetingMoM
            </span>
            <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-muted mt-1">
              Executive Instance
            </span>
          </div>
        </div>

        {/* Status Pills & BYOK Button */}
        <div className="flex items-center gap-3">
          {/* Server Connection Pill */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border border-white/5 text-muted bg-white/5">
            <span className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-accent shadow-[0_0_10px_rgba(217,119,6,0.6)] animate-pulse' : 'bg-red-500'}`} />
            <span>{isServerOnline ? 'Active' : 'Connecting'}</span>
          </div>

          {/* BYOK Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="group glass-button inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide"
            aria-label="Open BYOK NVIDIA API Settings"
          >
            <KeyRound size={16} className="text-muted group-hover:text-primary transition-colors" />
            <span className="text-zinc-200">AI Engine</span>
            {isByokSet ? (
              <span className="flex items-center gap-1 text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg font-medium ml-1">
                <ShieldCheck size={12} /> Ready
              </span>
            ) : (
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-ping ml-1" title="API Key Required" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
