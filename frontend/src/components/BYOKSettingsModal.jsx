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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl overflow-hidden border-2 border-border bg-card shadow-none transition-all font-mono text-xs">
        
        {/* Technical visual decoration - warning stripes */}
        <div className="absolute top-0 left-0 right-0 h-1 warning-stripes opacity-60" />

        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between select-none">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-display font-bold text-phosphor uppercase tracking-wider glow-text">
                [05] MAINBOARD_ENGINE_CONFIGURATION
              </h3>
              <p className="text-[9px] text-muted uppercase mt-1 tracking-widest">// CUSTOMIZE AI MODELS & CRYPTO VAULT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary border border-transparent hover:border-border bg-black transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-black px-6 pt-3 gap-2 select-none">
          <button
            onClick={() => setActiveTab('byok')}
            className={`flex items-center gap-2 pb-3 px-3 text-[10px] font-bold transition-all border-b-2 uppercase tracking-wider ${
              activeTab === 'byok'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted hover:text-phosphor'
            }`}
          >
            <Key size={12} />
            <span>[ VAULT_TOKENS ]</span>
          </button>
          <button
            onClick={() => setActiveTab('stt')}
            className={`flex items-center gap-2 pb-3 px-3 text-[10px] font-bold transition-all border-b-2 uppercase tracking-wider ${
              activeTab === 'stt'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted hover:text-phosphor'
            }`}
          >
            <Cpu size={12} />
            <span>[ STT_RESOLUTION ]</span>
          </button>
        </div>

        {/* Tab 1: BYOK */}
        {activeTab === 'byok' && (
          <div className="p-6 space-y-6">
            {/* Current Status Info Box */}
            <div className="p-4 border border-border bg-black/60 flex items-start gap-3 select-none">
              <Shield size={16} className="text-green shrink-0 mt-0.5" />
              <div className="text-[10px] space-y-2">
                <p className="font-bold text-phosphor uppercase tracking-wider">// ZERO_EXPOSURE_INTEGRITY_CONFIRMED</p>
                <p className="text-muted leading-relaxed font-light">
                  ALL TOKENS ARE STORAGE-ENCRYPTED LOCALLY AND NEVER EXPOSED TO CLIENT BUNDLES.
                </p>
                <div className="pt-2 flex flex-col gap-1.5 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-muted uppercase tracking-wider w-20">NVIDIA_API:</span>
                    <span className={`px-2 py-0.5 border font-bold text-[9px] ${byokStatus?.is_set ? 'text-green border-green bg-green/5' : 'text-primary border-primary bg-primary/5'}`}>
                      {byokStatus?.is_set ? (byokStatus.preview || 'CONNECTED') : 'NOT_SET'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted uppercase tracking-wider w-20">HF_TOKEN:</span>
                    <span className={`px-2 py-0.5 border font-bold text-[9px] ${byokStatus?.hf_is_set ? 'text-green border-green bg-green/5' : 'text-primary border-primary bg-primary/5'}`}>
                      {byokStatus?.hf_is_set ? (byokStatus.hf_preview || 'CONNECTED') : 'NOT_SET'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBYOK} className="space-y-4">
              <div>
                <label htmlFor="apiKeyInput" className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5 select-none">
                  // ENTER_NVIDIA_NIM_API_TOKEN
                </label>
                <input
                  id="apiKeyInput"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="nvapi-................................................"
                  className="w-full px-3 py-2 bg-black border border-border text-xs text-phosphor placeholder-zinc-800 focus:outline-none focus:border-primary transition-all font-mono"
                  disabled={loading}
                />
                <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-[9px] text-muted">
                  <span>REQUIRED FOR SYNTHESIS INDICES.</span>
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    GET TOKEN FROM NVIDIA.COM <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              <div>
                <label htmlFor="hfTokenInput" className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5 select-none">
                  // ENTER_HUGGINGFACE_ACCESS_TOKEN
                </label>
                <input
                  id="hfTokenInput"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..................................."
                  className="w-full px-3 py-2 bg-black border border-border text-xs text-phosphor placeholder-zinc-800 focus:outline-none focus:border-primary transition-all font-mono"
                  disabled={loading}
                />
                <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-[9px] text-muted">
                  <span>REQUIRED FOR PYANNOTE SPEAKER DIARIZATION.</span>
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    GET TOKEN FROM HUGGINGFACE.CO <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {error && (
                <div className="p-3 border border-primary bg-primary/5 text-primary text-[10px] font-bold flex items-center gap-2 select-none uppercase tracking-wider">
                  <span>[ ERROR: {error.toUpperCase()} ]</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 border border-green bg-green/5 text-green text-[10px] font-bold flex items-center gap-2 select-none uppercase tracking-wider">
                  <span>[ SUCCESS: {successMsg.toUpperCase()} ]</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border select-none">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-border hover:border-primary bg-black text-muted hover:text-phosphor transition-colors uppercase tracking-wider text-[10px] font-bold"
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 border border-primary hover:bg-primary hover:text-black bg-black text-primary font-bold uppercase tracking-wider text-[10px] transition-colors"
                >
                  {loading ? '[ VERIFYING_TOKEN... ]' : '[ SECURE_VAULT_KEYS ]'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: STT Resolution & Vocab */}
        {activeTab === 'stt' && (
          <form onSubmit={handleSaveSTT} className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 select-none">
                <Cpu size={14} />
                <span>// SELECT_STT_QUANTIZATION_ENGINE</span>
              </label>
              <p className="text-[10px] text-muted leading-relaxed font-light select-none">
                CHOOSE CPU ACCURACY PRESET. HIGHER PRESETS MAXIMIZE BILINGUAL RECOGNITION BUT CONSUME GREATER PROCESSING MEMORY.
              </p>
              
              <div className="grid grid-cols-1 gap-2 pt-2 select-none">
                {[
                  {
                    id: 'large-v3-turbo',
                    name: '[X] LARGE-V3-TURBO (MAXIMUM_RESOLUTION)',
                    desc: 'MAXIMUM NUANCE RETRIEVAL. REQUIRES >= 6GB ENGINE HEADROOM.'
                  },
                  {
                    id: 'small',
                    name: '[ ] SMALL (BALANCED_InFERENCE)',
                    desc: 'FAST COMPUTATION WITH BALANCED PRECISION. CONSUMES ~2GB.'
                  },
                  {
                    id: 'base',
                    name: '[ ] BASE (LIGHTWEIGHT_DRAFT)',
                    desc: 'HIGHEST SPEED PROFILE FOR CASUAL AUDIO. CONSUMES ~1GB.'
                  }
                ].map((model) => (
                  <label
                    key={model.id}
                    onClick={() => setModelSize(model.id)}
                    className={`cursor-pointer p-4 border transition-all flex flex-col gap-1.5 ${
                      modelSize === model.id
                        ? 'bg-primary/5 border-primary text-phosphor'
                        : 'bg-black/40 border-border text-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <input
                        type="radio"
                        name="sttModel"
                        checked={modelSize === model.id}
                        onChange={() => setModelSize(model.id)}
                        className="accent-primary hidden"
                      />
                      <span>{modelSize === model.id ? model.name.replace('[ ]', '[█]') : model.name}</span>
                    </div>
                    <div className="text-[9px] text-muted uppercase tracking-wide leading-relaxed font-light">{model.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <label htmlFor="vocabInput" className="block text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5 flex items-center gap-2 select-none">
                <BookOpen size={14} />
                <span>// CUSTOM_DICTIONARY_BIASING</span>
              </label>
              <p className="text-[9px] text-muted mb-3 select-none">
                LIST TERMS OR ACRONYMS SEPARATED BY COMMAS TO BIAS THE RECOGNITION ENGINE TOWARD THEM.
              </p>
              <textarea
                id="vocabInput"
                rows="3"
                value={customVocab}
                onChange={(e) => setCustomVocab(e.target.value)}
                placeholder="e.g. KUBERNETES, NEMOTRON, CLOUDFLARE, NGINX, INT8, GCP, MOM, OJK"
                className="w-full p-3 bg-black border border-border font-mono text-xs text-phosphor placeholder-zinc-800 focus:outline-none focus:border-primary transition-all disabled:opacity-50"
                disabled={sttLoading}
              />
            </div>

            {sttError && (
              <div className="p-3 border border-primary bg-primary/5 text-primary text-[10px] font-bold flex items-center gap-2 select-none uppercase tracking-wider">
                <span>[ ERROR: {sttError.toUpperCase()} ]</span>
              </div>
            )}

            {sttSuccess && (
              <div className="p-3 border border-green bg-green/5 text-green text-[10px] font-bold flex items-center gap-2 select-none uppercase tracking-wider">
                <span>[ SUCCESS: {sttSuccess.toUpperCase()} ]</span>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border select-none">
              <button
                type="button"
                onClick={onClose}
                disabled={sttLoading}
                className="px-4 py-2 border border-border hover:border-primary bg-black text-muted hover:text-phosphor transition-colors uppercase tracking-wider text-[10px] font-bold"
              >
                [ CANCEL ]
              </button>
              <button
                type="submit"
                disabled={sttLoading}
                className="px-5 py-2 border border-primary hover:bg-primary hover:text-black bg-black text-primary font-bold uppercase tracking-wider text-[10px] transition-colors"
              >
                {sttLoading ? '[ SAVING_PREFERENCES... ]' : '[ COMMIT_RESOLUTION_CONFIG ]'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BYOKSettingsModal;
