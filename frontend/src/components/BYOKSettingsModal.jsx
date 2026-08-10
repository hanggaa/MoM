import React, { useState, useEffect } from 'react';
import { X, Key, Shield, Loader2, CheckCircle2, AlertCircle, ExternalLink, Cpu, BookOpen, Sparkles } from 'lucide-react';
import { saveBYOKToken, getSTTSettings, saveSTTSettings } from '../services/api';

export const BYOKSettingsModal = ({ isOpen, onClose, byokStatus, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('byok'); // 'byok' or 'stt'
  
  // BYOK State
  const [apiKey, setApiKey] = useState('');
  const [hfToken, setHfToken] = useState('');
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
    if (!apiKey.trim() && !hfToken.trim()) {
      setError('Please input at least one token to save.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await saveBYOKToken(apiKey, hfToken);
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl glass-panel shadow-2xl transition-all">
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 animate-gradient" />

        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-display font-semibold text-zinc-100">Engine & API Configuration</h3>
              <p className="text-xs text-zinc-400 font-light mt-0.5">Customize AI models, local STT accuracy, and secure tokens</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-black/20 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('byok')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
              activeTab === 'byok'
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Key size={15} />
            <span>NVIDIA BYOK Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('stt')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
              activeTab === 'stt'
                ? 'border-accent text-accent'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Cpu size={15} />
            <span>STT Model Resolution & Vocab</span>
          </button>
        </div>

        {/* Tab 1: BYOK */}
        {activeTab === 'byok' && (
          <div className="p-6 space-y-6">
            {/* Current Status Info Box */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4 shadow-inner">
              <Shield size={22} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-2">
                <p className="font-bold text-zinc-100 uppercase tracking-widest text-[10px]">Server-Side Zero-Exposure Security</p>
                <p className="text-zinc-400 leading-relaxed font-light">
                  Your token is encrypted in SQLite and never exposed to browser clients or third-party tracking.
                </p>
                <div className="pt-2 flex items-center gap-3 font-mono">
                  <span className="text-zinc-500 uppercase text-[10px] tracking-widest font-bold">NVIDIA Token:</span>
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${byokStatus?.is_set ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {byokStatus?.is_set ? (byokStatus.preview || 'Connected') : 'Not Registered'}
                  </span>
                </div>
                <div className="pt-1 flex items-center gap-3 font-mono">
                  <span className="text-zinc-500 uppercase text-[10px] tracking-widest font-bold">HF Token:</span>
                  <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${byokStatus?.hf_is_set ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {byokStatus?.hf_is_set ? (byokStatus.hf_preview || 'Connected') : 'Not Registered'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBYOK} className="space-y-5">
              <div>
                <label htmlFor="apiKeyInput" className="block text-xs font-bold uppercase tracking-widest text-zinc-300 mb-2">
                  Enter NVIDIA NIM API Token
                </label>
                <input
                  id="apiKeyInput"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="nvapi-................................................"
                  className="w-full px-5 py-3 rounded-xl bg-background border border-white/10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-light"
                  disabled={loading}
                />
                <div className="mt-2 flex justify-between items-center text-[11px] text-zinc-500">
                  <span>Required for Nemotron-3 executive MoM reasoning.</span>
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:text-amber-400 transition-colors inline-flex items-center gap-1 font-semibold"
                  >
                    Get token from build.nvidia.com <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              <div>
                <label htmlFor="hfTokenInput" className="block text-xs font-bold uppercase tracking-widest text-zinc-300 mb-2">
                  Enter HuggingFace Access Token
                </label>
                <input
                  id="hfTokenInput"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..................................."
                  className="w-full px-5 py-3 rounded-xl bg-background border border-white/10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-light"
                  disabled={loading}
                />
                <div className="mt-2 flex justify-between items-center text-[11px] text-zinc-500">
                  <span>Required for Pyannote Speaker Diarization.</span>
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:text-amber-400 transition-colors inline-flex items-center gap-1 font-semibold"
                  >
                    Get token from huggingface.co <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary hover:bg-amber-400 text-zinc-950 shadow-glow active:scale-95 transition-all disabled:opacity-50"
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
          <form onSubmit={handleSaveSTT} className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                <Cpu size={16} />
                <span>Select Local Whisper STT Accuracy Model</span>
              </label>
              <p className="text-sm font-light text-zinc-400 leading-relaxed">
                Choose the CPU quantization accuracy. Higher resolution models improve transcription of technical terms and heavy accents while maintaining zero external audio exposure.
              </p>
              
              <div className="grid grid-cols-1 gap-3 pt-2">
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
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      modelSize === model.id
                        ? 'bg-accent/10 border-accent text-zinc-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-background border-white/10 hover:border-white/20 text-zinc-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="sttModel"
                      checked={modelSize === model.id}
                      onChange={() => setModelSize(model.id)}
                      className="mt-1 accent-accent"
                    />
                    <div>
                      <div className="text-sm font-bold text-zinc-200">{model.name}</div>
                      <div className="text-xs text-zinc-500 font-light mt-1.5 leading-relaxed">{model.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <label htmlFor="vocabInput" className="block text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                <BookOpen size={15} />
                <span>Custom Technical Vocabulary Biasing</span>
              </label>
              <p className="text-xs font-light text-zinc-400 mb-3">
                Provide technical terms, product names, or acronyms separated by commas. Whisper STT will bias recognition toward these words.
              </p>
              <textarea
                id="vocabInput"
                rows="3"
                value={customVocab}
                onChange={(e) => setCustomVocab(e.target.value)}
                placeholder="e.g. Kubernetes, Nemotron, Cloudflare, Nginx, INT8, GCP, MoM, Agile, Fintech, OJK"
                className="w-full p-4 rounded-xl bg-background border border-white/10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary transition-all font-light"
                disabled={sttLoading}
              />
            </div>

            {sttError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
                <AlertCircle size={16} className="shrink-0" />
                <span>{sttError}</span>
              </div>
            )}

            {sttSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>{sttSuccess}</span>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={sttLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sttLoading}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent hover:bg-amber-400 text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 transition-all disabled:opacity-50"
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
