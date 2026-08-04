import React, { useState } from 'react';
import { X, Key, Shield, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { saveBYOKToken } from '../services/api';

export const BYOKSettingsModal = ({ isOpen, onClose, byokStatus, onSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please input a valid NVIDIA NIM API token starting with nvapi-');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await saveBYOKToken(apiKey);
      setSuccessMsg(response.message || 'NVIDIA NIM Key verified and secured!');
      setApiKey('');
      onSuccess(response);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to verify API key against NVIDIA servers.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl transition-all p-6">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 animate-gradient" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Key size={18} />
            </div>
            <h3 className="text-lg font-bold text-slate-100">NVIDIA NIM BYOK Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Status Info Box */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3">
          <Shield size={20} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-slate-200">Server-Side Zero-Exposure Security</p>
            <p className="text-slate-400 leading-relaxed">
              Your API token is stored directly in your server's SQLite database and is never exposed to the browser client or third-party analytic trackers.
            </p>
            <div className="pt-1 flex items-center gap-2 font-mono">
              <span className="text-slate-400">Current Token Status:</span>
              <span className={`px-2 py-0.5 rounded ${byokStatus?.is_set ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                {byokStatus?.is_set ? (byokStatus.preview || 'Configured') : 'Not Registered'}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div>
            <label htmlFor="apiKeyInput" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Enter New NVIDIA NIM API Token
            </label>
            <input
              id="apiKeyInput"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="nvapi-................................................"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              disabled={loading}
            />
            <div className="mt-2 flex justify-between items-center text-[11px] text-slate-400">
              <span>Required for Nemotron-3 executive MoM synthesis.</span>
              <a
                href="https://build.nvidia.com"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1"
              >
                Get token from build.nvidia.com <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* Alert messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-bounce">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold tracking-wide bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Verifying & Saving...</span>
                </>
              ) : (
                <span>Test & Save Connection</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BYOKSettingsModal;
