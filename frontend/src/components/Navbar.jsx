import React from 'react';
import { KeyRound } from 'lucide-react';

export const Navbar = ({ onOpenSettings, isByokSet, isServerOnline }) => {
  return (
    <header className="w-full bg-card border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Title */}
        <div className="flex items-center gap-4">
          <div className="p-2 border border-primary text-primary flex items-center justify-center font-mono font-bold text-xs bg-black select-none tracking-widest">
            [SYS_MOM]
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xl font-display font-bold tracking-wider text-phosphor leading-none uppercase glow-text">
              AIMeetingMoM
            </span>
            <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-primary mt-1 select-none">
              // CORE / PORTABLE MAINBOARD
            </span>
          </div>
        </div>

        {/* Status Pills & BYOK Button */}
        <div className="flex items-center gap-3">
          {/* Server Connection Pill */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 border border-border text-muted bg-black select-none">
            <span className={`w-1.5 h-1.5 ${isServerOnline ? 'bg-green glow-text-green animate-pulse' : 'bg-primary glow-text-primary'}`} />
            <span>NET_STATUS: {isServerOnline ? 'ONLINE' : 'DISCONNECTED'}</span>
          </div>

          {/* BYOK Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="group glass-button inline-flex items-center gap-2 px-5 py-2.5"
            aria-label="Open BYOK NVIDIA API Settings"
          >
            <KeyRound size={12} className="text-muted group-hover:text-black transition-colors" />
            <span>AI CONFIG</span>
            {isByokSet ? (
              <span className="flex items-center gap-1 text-[9px] bg-black text-green border border-green px-1.5 py-0.5 font-bold ml-1 font-mono">
                [READY]
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] bg-black text-primary border border-primary px-1.5 py-0.5 font-bold ml-1 font-mono animate-pulse">
                [REQUIRED]
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
