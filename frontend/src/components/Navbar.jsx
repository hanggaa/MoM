import React from 'react';
import { KeyRound, ShieldAlert, ShieldCheck, Cpu } from 'lucide-react';

export const Navbar = ({ onOpenSettings, isByokSet, isServerOnline }) => {
  return (
    <header className="w-full bg-card border-b border-border select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent text-white flex items-center justify-center rounded-none select-none font-bold text-xs">
            MOM
          </div>
          <div className="flex flex-col justify-center select-none font-mono">
            <span className="text-xs font-bold tracking-widest text-primary leading-none uppercase">
              // AIMeetingMoM
            </span>
            <span className="text-[9px] tracking-wider uppercase text-muted mt-1">
              SYS_LOC_INTEG: ACTIVE
            </span>
          </div>
        </div>

        {/* Status Pills & BYOK Button */}
        <div className="flex items-center gap-4 select-none font-mono">
          {/* Server Connection Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 text-[9px] font-bold px-3 py-1 border rounded-none ${
            isServerOnline 
              ? 'bg-pastel-green-bg text-pastel-green-text border-pastel-green-text/20' 
              : 'bg-pastel-red-bg text-pastel-red-text border-pastel-red-text/20'
          }`}>
            <span className={`w-1.5 h-1.5 ${isServerOnline ? 'bg-green' : 'bg-accent'}`} />
            <span>SERVER: {isServerOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* BYOK Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="group glass-button inline-flex items-center gap-2 px-3 py-1.5 border bg-transparent font-mono text-[10px] tracking-widest"
            aria-label="Open BYOK settings"
          >
            <span>[ CONFIG_MODELS ]</span>
            {isByokSet ? (
              <span className="text-green font-bold">[READY]</span>
            ) : (
              <span className="text-accent font-bold animate-pulse">[SETUP]</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
