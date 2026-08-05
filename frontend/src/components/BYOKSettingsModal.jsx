import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Loader2, CheckCircle2, AlertCircle, ExternalLink, Cpu, BookOpen, Sparkles } from 'lucide-react';
import { saveBYOKToken, getSTTSettings, saveSTTSettings } from '../services/api';

export const BYOKSettingsModal = ({ isOpen, onClose, byokStatus, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('byok'); // 'byok' or 'stt'
  
  // BYOK State
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // STT Settings State
  const [modelSize, setModelSize] = useState('large-v3-turbo');
  const [customVocab, setCustomVocab] = useState('');
  const [sttLoading, setSttLoading] = useState(false);
  const [sttSuccess, setSttSuccess] = useState('');
  const [sttError, setSttError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load current STT settings
      getSTTSettings().then(data => {
        if (data) {
          setModelSize(data.model_size || 'large-v3-turbo');
          setCustomVocab(data.custom_vocabulary || '');
        }
      }).catch(err => console.error("Could not fetch STT settings:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveBYOK = async (e) => {
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
        if (activeTab === 'byok') onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to verify API key against NVIDIA servers.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSTT = async (e) => {
    e.preventDefault();
    setSttLoading(true);
    setSttError('');
    setSttSuccess('');

    try {
      await saveSTTSettings({
        model_size: modelSize,
        custom_vocabulary: customVocab,
        default_language: "Bahasa Indonesia (Formal Corporate)",
        default_style: "General Executive MoM"
      });
      setSttSuccess('Local STT Resolution & Custom Vocabulary saved successfully!');
      setTimeout(() => {
        setSttSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      setSttError(err.message || 'Failed to update STT engine preferences.');
    } finally {
      setSttLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl transition-all">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500 animate-gradient" />

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Engine & API Configuration</h3>
              <p className="text-xs text-slate-400">Customize AI models, local STT accuracy, and secure tokens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('byok')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'byok'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key size={15} />
            <span>NVIDIA BYOK Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('stt')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'stt'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu size={15} />
            <span>STT Model Resolution & Vocab</span>
          </button>
        </div>

        {/* Tab 1: BYOK */}
        {activeTab === 'byok' && (
          <div className="p-6 space-y-5">
            {/* Current Status Info Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-3.5 shadow-inner">
              <Shield size={22} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5">
                <p className="font-bold text-slate-200">Server-Side Zero-Exposure Security</p>
                <p className="text-slate-400 leading-relaxed">
                  Your token is encrypted in SQLite and never exposed to browser clients or third-party tracking.
                </p>
                <div className="pt-1 flex items-center gap-2 font-mono">
                  <span className="text-slate-400">Token Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold ${byokStatus?.is_set ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                    {byokStatus?.is_set ? (byokStatus.preview || 'Connected') : 'Not Registered'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBYOK} className="space-y-4">
              <div>
                <label htmlFor="apiKeyInput" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Enter NVIDIA NIM API Token
                </label>
                <input
                  id="apiKeyInput"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="nvapi-................................................"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  disabled={loading}
                />
                <div className="mt-2 flex justify-between items-center text-[11px] text-slate-400">
                  <span>Required for Nemotron-3 executive MoM reasoning.</span>
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1 font-semibold"
                  >
                    Get token from build.nvidia.com <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

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
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Verifying Token...</span>
                    </>
                  ) : (
                    <span>Verify & Secure Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: STT Resolution & Vocab */}
        {activeTab === 'stt' && (
          <form onSubmit={handleSaveSTT} className="p-6 space-y-5">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Cpu size={16} />
                <span>Select Local Whisper STT Accuracy Model</span>
              </label>
              <p className="text-xs text-slate-400 leading-relaxed">
                Choose the CPU quantization accuracy. Higher resolution models improve transcription of technical terms and heavy accents while maintaining zero external audio exposure.
              </p>
              
              <div className="grid grid-cols-1 gap-3 pt-1">
                {[
                  {
                    id: 'large-v3-turbo',
                    name: '👑 large-v3-turbo (Recommended for Executive Accuracy)',
                    desc: 'Maximum resolution & bilingual nuance. ~5-6 GB RAM usage (Ideal for GCP e2-standard-4 with 16GB RAM).'
                  },
                  {
                    id: 'small',
                    name: '⚡ small (Balanced Resolution & Speed)',
                    desc: 'Great precision for clear audio recordings. ~2 GB RAM consumption with rapid inference speed.'
                  },
                  {
                    id: 'base',
                    name: '🏎️ base (Ultra-Fast Lightweight Drafts)',
                    desc: 'Fastest turn-around for casual internal updates. ~1 GB RAM usage.'
                  }
                ].map((model) => (
                  <label
                    key={model.id}
                    onClick={() => setModelSize(model.id)}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      modelSize === model.id
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10 text-slate-100'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sttModel"
                      checked={modelSize === model.id}
                      onChange={() => setModelSize(model.id)}
                      className="mt-1 accent-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{model.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{model.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <label htmlFor="vocabInput" className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center gap-1.5">
                <BookOpen size={15} />
                <span>Custom Technical Vocabulary Biasing</span>
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                Provide technical terms, product names, or acronyms separated by commas. Whisper STT will bias recognition toward these words.
              </p>
              <textarea
                id="vocabInput"
                rows="3"
                value={customVocab}
                onChange={(e) => setCustomVocab(e.target.value)}
                placeholder="e.g. Kubernetes, Nemotron, Cloudflare, Nginx, INT8, GCP, MoM, Agile, Fintech, OJK"
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-all leading-relaxed"
                disabled={sttLoading}
              />
            </div>

            {sttError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{sttError}</span>
              </div>
            )}

            {sttSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{sttSuccess}</span>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={sttLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sttLoading}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50"
              >
                {sttLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving Engine Config...</span>
                  </>
                ) : (
                  <span>Save Engine Resolution</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BYOKSettingsModal;
