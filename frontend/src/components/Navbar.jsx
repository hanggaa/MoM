import React from 'react';
import { KeyRound, ShieldAlert, ShieldCheck, Cpu } from 'lucide-react';

export const Navbar = ({ onOpenSettings, isByokSet, isServerOnline }) => {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 select-none">
      <nav className="glass-panel rounded-full px-6 py-3 flex items-center justify-between border border-border shadow-card backdrop-blur-2xl bg-card">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white text-black flex items-center justify-center rounded-full select-none shadow-sm">
            <Cpu size={16} strokeWidth={2} />
          </div>
          <div className="flex flex-col justify-center select-none">
            <span className="text-sm font-sans font-bold tracking-tight text-white leading-none">
              AIMeetingMoM
            </span>
            <span className="text-[9px] font-mono tracking-wider uppercase text-muted mt-1">
              Local Private Workspace
            </span>
          </div>
        </div>

        {/* Status Pills & BYOK Button */}
        <div className="flex items-center gap-3 select-none">
          {/* Server Connection Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-mono px-3 py-1 border rounded-full transition-all duration-500 ease-spring ${
            isServerOnline 
              ? 'bg-pastel-green-bg text-pastel-green-text border-pastel-green-text/20' 
              : 'bg-pastel-red-bg text-pastel-red-text border-pastel-red-text/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isServerOnline ? 'bg-pastel-green-text animate-pulse' : 'bg-pastel-red-text'}`} />
            <span>SERVER: {isServerOnline ? 'CONNECTED' : 'OFFLINE'}</span>
          </div>

          {/* BYOK Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="group glass-button inline-flex items-center gap-2.5 px-4 py-2 border rounded-full bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-500 ease-spring"
            aria-label="Open BYOK NVIDIA API Settings"
          >
            <KeyRound size={12} className="text-muted group-hover:text-white transition-colors" />
            <span className="font-sans text-xs text-white">AI Config</span>
            {isByokSet ? (
              <span className="inline-flex items-center gap-1 text-[9px] bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/20 px-2 py-0.5 rounded-full font-bold font-mono tracking-wider uppercase">
                <ShieldCheck size={10} className="shrink-0" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[9px] bg-pastel-yellow-bg text-pastel-yellow-text border border-pastel-yellow-text/20 px-2 py-0.5 rounded-full font-bold font-mono tracking-wider uppercase animate-pulse">
                <ShieldAlert size={10} className="shrink-0" /> Required
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
