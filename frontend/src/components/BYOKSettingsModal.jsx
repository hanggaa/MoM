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
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg border-2 border-border bg-card shadow-none rounded-none transition-none font-mono text-xs text-primary">
        
        {/* Header */}
        <div className="p-5 border-b border-border bg-white/5 flex items-center justify-between select-none">
          <div>
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              // VAULT_CONFIGURATION_MODULE
            </h3>
            <p className="text-[10px] text-muted mt-0.5">MANAGE SECURITY KEY VAULTS & STT RESOLUTIONS</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-white hover:bg-white/5 rounded-none transition-colors"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-[#0A0A0A] px-6 pt-3 gap-2 select-none">
          <button
            onClick={() => setActiveTab('byok')}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold transition-all border-b-2 tracking-wide uppercase ${
              activeTab === 'byok'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <Key size={12} strokeWidth={2} />
            <span>[ CREDENTIAL_VAULT ]</span>
          </button>
          <button
            onClick={() => setActiveTab('stt')}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold transition-all border-b-2 tracking-wide uppercase ${
              activeTab === 'stt'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <Cpu size={12} strokeWidth={2} />
            <span>[ STT_RESOLUTION ]</span>
          </button>
        </div>

        {/* Tab 1: BYOK */}
        {activeTab === 'byok' && (
          <div className="p-6 space-y-6">
            {/* Current Status Info Box */}
            <div className="p-4 border border-green/30 bg-green/5 text-green rounded-none flex items-start gap-3 select-none text-xs">
              <Shield size={16} strokeWidth={2} className="text-green shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold">// LOCKDOWN_PROTOCOL_ACTIVE</p>
                <p className="text-green/80 leading-relaxed font-light">
                  TOKENS RESIDE EXCLUSIVELY ON ENCRYPTED SERVER STORAGE. CLIENT-SIDE CODE HAS ZERO EXPOSURE TO PLAINTEXT VALUES.
                </p>
                <div className="pt-2 flex flex-col gap-1.5 font-mono text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-green/75 uppercase tracking-wider w-24">NVIDIA_NIM:</span>
                    <span className={`px-2 py-0.5 border font-bold text-[9px] rounded-none ${byokStatus?.is_set ? 'text-green border-green/20 bg-background' : 'text-accent border-accent/20 bg-background'}`}>
                      {byokStatus?.is_set ? '[CONNECTED]' : '[REQUIRED]'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green/75 uppercase tracking-wider w-24">HF_PIPELINE:</span>
                    <span className={`px-2 py-0.5 border font-bold text-[9px] rounded-none ${byokStatus?.hf_is_set ? 'text-green border-green/20 bg-background' : 'text-accent border-accent/20 bg-background'}`}>
                      {byokStatus?.hf_is_set ? '[CONNECTED]' : '[REQUIRED]'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBYOK} className="space-y-4">
              <div>
                <label htmlFor="apiKeyInput" className="block text-[10px] font-bold uppercase tracking-widest text-white mb-1.5 select-none">
                  // NVIDIA_NIM_API_KEY
                </label>
                <input
                  id="apiKeyInput"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="nvapi-................................................"
                  className="w-full px-3 py-2 bg-background border border-border rounded-none text-xs text-white placeholder-muted/30 focus:outline-none focus:border-accent transition-all font-mono"
                  disabled={loading}
                />
                <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-[9px] text-muted">
                  <span>REQUIRED FOR SYNTHESIZING MINUTES VIA NEMOTRON.</span>
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    NVIDIA BUILD VAULT <ExternalLink size={8} strokeWidth={2} />
                  </a>
                </div>
              </div>

              <div>
                <label htmlFor="hfTokenInput" className="block text-[10px] font-bold uppercase tracking-widest text-white mb-1.5 select-none">
                  // HUGGINGFACE_ACCESS_TOKEN
                </label>
                <input
                  id="hfTokenInput"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..................................."
                  className="w-full px-3 py-2 bg-background border border-border rounded-none text-xs text-white placeholder-muted/30 focus:outline-none focus:border-accent transition-all font-mono"
                  disabled={loading}
                />
                <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-[9px] text-muted">
                  <span>REQUIRED TO FETCH PYANNOTE SPEAKER WEIGHTS.</span>
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    HF TOKEN MANAGER <ExternalLink size={8} strokeWidth={2} />
                  </a>
                </div>
              </div>

              {error && (
                <div className="p-3 border border-accent bg-[#2a0505] text-accent text-[10px] rounded-none font-bold uppercase select-none">
                  <span>ERROR // {error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 border border-green/30 bg-green/5 text-green text-[10px] rounded-none font-bold uppercase select-none">
                  <span>VAULT_UPDATED // {successMsg}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border select-none">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-border bg-card hover:bg-primary hover:text-background transition-colors text-xs font-bold rounded-none"
                >
                  [ CANCEL ]
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-accent text-white font-bold text-xs rounded-none active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {loading ? '[ SECURING_DATA... ]' : '[ SECURE_VAULT_KEYS ]'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: STT Resolution & Vocab */}
        {activeTab === 'stt' && (
          <form onSubmit={handleSaveSTT} className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-white flex items-center gap-2 select-none">
                <Cpu size={14} strokeWidth={2} />
                <span>// WHISPER_CORE_QUANTIZATION</span>
              </label>
              <p className="text-[10px] text-muted leading-relaxed select-none font-light">
                SELECT RESOLUTION TIER. HIGHER TIERS REQUIRE ELEVATED MEMORY HEADROOM ON THE HOST SYSTEM WORKER CORE.
              </p>
              
              <div className="grid grid-cols-1 gap-2.5 pt-2 select-none">
                {[
                  {
                    id: 'large-v3-turbo',
                    name: 'LARGE V3 TURBO (INT8)',
                    tag: 'HIGH ACCURACY',
                    desc: 'MAXIMUM BILINGUAL PRECISION. REQUIRES >=6GB FREE SYSTEM MEMORY.'
                  },
                  {
                    id: 'small',
                    name: 'SMALL TIER (INT8)',
                    tag: 'BALANCED',
                    desc: 'OPTIMAL COMPUTATION SPEED. MEDIUM PRECISION. REQUIRES ~2GB MEMORY.'
                  },
                  {
                    id: 'base',
                    name: 'BASE TIER (INT8)',
                    tag: 'MAX SPEED',
                    desc: 'LIGHTWEIGHT COMPILATION. IDEAL FOR QUICK REVIEWS. REQUIRES ~1GB MEMORY.'
                  }
                ].map((model) => (
                  <label
                    key={model.id}
                    onClick={() => setModelSize(model.id)}
                    className={`cursor-pointer p-4 border transition-colors flex flex-col gap-1 rounded-none ${
                      modelSize === model.id
                        ? 'border-accent bg-accent/5 text-accent'
                        : 'border-border bg-background text-muted hover:border-accent/40'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="sttModel"
                          checked={modelSize === model.id}
                          onChange={() => setModelSize(model.id)}
                          className="accent-accent"
                        />
                        <span className={modelSize === model.id ? 'text-accent' : 'text-white'}>{model.name}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold tracking-normal uppercase opacity-75">{model.tag}</span>
                    </div>
                    <div className="text-[9px] leading-relaxed mt-0.5 opacity-90">{model.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <label htmlFor="vocabInput" className="block text-[10px] font-bold uppercase tracking-widest text-white mb-1.5 flex items-center gap-2 select-none">
                <BookOpen size={14} strokeWidth={2} />
                <span>// VOCABULARY_BIASING_DICTIONARY</span>
              </label>
              <p className="text-[10px] text-muted mb-3 select-none font-light">
                LIST COMPLEX JARGON TERMS OR ACRONYMS SEPARATED BY COMMAS TO PREVENT TRANSCRIPTION PHONETIC FAULTS.
              </p>
              <textarea
                id="vocabInput"
                rows="3"
                value={customVocab}
                onChange={(e) => setCustomVocab(e.target.value)}
                placeholder="E.G. OJK, GOOGLE, FASTAPI, DOCKER, NIM, INT8, SQLITE"
                className="w-full p-3 bg-background border border-border text-white rounded-none placeholder:text-muted/30 focus:outline-none focus:border-accent transition-all disabled:opacity-50 font-mono text-xs"
                disabled={sttLoading}
              />
            </div>

            {sttError && (
              <div className="p-3 border border-accent bg-[#2a0505] text-accent text-[10px] rounded-none font-bold uppercase select-none">
                <span>ERROR // {sttError}</span>
              </div>
            )}

            {sttSuccess && (
              <div className="p-3 border border-green/30 bg-green/5 text-green text-[10px] rounded-none font-bold uppercase select-none">
                <span>STT_UPDATED // {sttSuccess}</span>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border select-none">
              <button
                type="button"
                onClick={onClose}
                disabled={sttLoading}
                className="px-4 py-2 border border-border bg-card hover:bg-background text-accent hover:text-primary transition-colors text-xs font-bold rounded-none"
              >
                [ CANCEL ]
              </button>
              <button
                type="submit"
                disabled={sttLoading}
                className="px-5 py-2 bg-accent text-white font-bold text-xs rounded-none active:translate-x-[1px] active:translate-y-[1px]"
              >
                {sttLoading ? '[ COMPILING... ]' : '[ SAVE_CONFIG ]'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BYOKSettingsModal;
