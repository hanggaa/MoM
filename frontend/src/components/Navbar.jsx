import React from 'react';
import { Sparkles, KeyRound, ShieldCheck } from 'lucide-react';

export const Navbar = ({ onOpenSettings, isByokSet, isServerOnline }) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/80 border-b border-slate-800 shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-xl shadow-lg shadow-cyan-500/20 text-slate-950 flex items-center justify-center">
            <Sparkles size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-cyan-200 to-slate-300 bg-clip-text text-transparent">
              AIMeetingMoM
            </span>
            <span className="ml-2.5 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 shadow-sm">
              PM Executive Instance
            </span>
          </div>
        </div>

        {/* Status Pills & BYOK Button */}
        <div className="flex items-center gap-3">
          {/* Server Connection Pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-950/70 border border-slate-800 text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isServerOnline ? 'Server Active' : 'Connecting...'}</span>
          </div>

          {/* BYOK Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 shadow-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-cyan-500/50 active:scale-95"
            aria-label="Open BYOK NVIDIA API Settings"
          >
            <KeyRound size={15} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span>AI Engine & BYOK Settings</span>
            {isByokSet ? (
              <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-medium">
                <ShieldCheck size={12} /> Connected
              </span>
            ) : (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" title="API Key Required" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
