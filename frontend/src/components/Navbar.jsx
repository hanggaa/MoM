import React from 'react';
import { KeyRound, ShieldAlert, ShieldCheck, Cpu } from 'lucide-react';

export const Navbar = ({ onOpenSettings, isByokSet, isServerOnline }) => {
  return (
    <header className="w-full bg-card border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary text-white flex items-center justify-center rounded-lg select-none">
            <Cpu size={16} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col justify-center select-none">
            <span className="text-md font-sans font-bold tracking-tight text-primary leading-none">
              AIMeetingMoM
            </span>
            <span className="text-[9px] font-mono tracking-wider uppercase text-accent mt-1">
              Local Private Workspace
            </span>
          </div>
        </div>

        {/* Status Pills & BYOK Button */}
        <div className="flex items-center gap-3 select-none">
          {/* Server Connection Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 border rounded-full ${
            isServerOnline 
              ? 'bg-pastel-green-bg text-pastel-green-text border-pastel-green-text/10' 
              : 'bg-pastel-red-bg text-pastel-red-text border-pastel-red-text/10'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isServerOnline ? 'bg-pastel-green-text' : 'bg-pastel-red-text'}`} />
            <span>SERVER: {isServerOnline ? 'CONNECTED' : 'OFFLINE'}</span>
          </div>

          {/* BYOK Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="group glass-button inline-flex items-center gap-2 px-4 py-2 border rounded-md"
            aria-label="Open BYOK NVIDIA API Settings"
          >
            <KeyRound size={12} className="text-accent group-hover:text-primary transition-colors" />
            <span className="font-sans text-xs">AI Models</span>
            {isByokSet ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/10 px-1.5 py-0.5 rounded-full font-bold font-mono tracking-wider uppercase">
                <ShieldCheck size={10} className="shrink-0" /> Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[9px] bg-pastel-yellow-bg text-pastel-yellow-text border border-pastel-yellow-text/10 px-1.5 py-0.5 rounded-full font-bold font-mono tracking-wider uppercase animate-pulse">
                <ShieldAlert size={10} className="shrink-0" /> Required
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
