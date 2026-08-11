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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg overflow-hidden border border-border bg-card shadow-card rounded-xl transition-all font-sans text-sm text-primary">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between select-none">
          <div>
            <h3 className="text-sm font-bold text-primary tracking-tight">
              Settings & Configuration
            </h3>
            <p className="text-[10px] text-accent mt-0.5 font-mono">Customize system models & credentials</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-accent hover:text-primary hover:bg-background rounded-md transition-colors"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-background px-6 pt-3 gap-2 select-none">
          <button
            onClick={() => setActiveTab('byok')}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold transition-all border-b-2 tracking-wide ${
              activeTab === 'byok'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-accent hover:text-primary'
            }`}
          >
            <Key size={12} strokeWidth={2.5} />
            <span>Vault Credentials</span>
          </button>
          <button
            onClick={() => setActiveTab('stt')}
            className={`flex items-center gap-1.5 pb-3 px-3 text-xs font-bold transition-all border-b-2 tracking-wide ${
              activeTab === 'stt'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-accent hover:text-primary'
            }`}
          >
            <Cpu size={12} strokeWidth={2.5} />
            <span>STT Quantization</span>
          </button>
        </div>

        {/* Tab 1: BYOK */}
        {activeTab === 'byok' && (
          <div className="p-6 space-y-6">
            {/* Current Status Info Box */}
            <div className="p-4 border border-pastel-green-text/10 bg-pastel-green-bg text-pastel-green-text rounded-lg flex items-start gap-3 select-none text-xs">
              <Shield size={16} strokeWidth={2.5} className="text-pastel-green-text shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold">Zero-Exposure Encryption Active</p>
                <p className="text-pastel-green-text/80 leading-relaxed font-light">
                  Tokens are stored encrypted inside the local database. They are never exposed to client-side bundles.
                </p>
                <div className="pt-2 flex flex-col gap-1.5 font-mono text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="text-pastel-green-text/75 uppercase tracking-wider w-20">Nvidia NIM:</span>
                    <span className={`px-2 py-0.5 border font-bold text-[9px] rounded ${byokStatus?.is_set ? 'text-pastel-green-text border-pastel-green-text/20 bg-card' : 'text-pastel-red-text border-pastel-red-text/20 bg-card'}`}>
                      {byokStatus?.is_set ? 'Connected' : 'Required'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-pastel-green-text/75 uppercase tracking-wider w-20">HuggingFace:</span>
                    <span className={`px-2 py-0.5 border font-bold text-[9px] rounded ${byokStatus?.hf_is_set ? 'text-pastel-green-text border-pastel-green-text/20 bg-card' : 'text-pastel-red-text border-pastel-red-text/20 bg-card'}`}>
                      {byokStatus?.hf_is_set ? 'Connected' : 'Required'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBYOK} className="space-y-4">
              <div>
                <label htmlFor="apiKeyInput" className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 select-none">
                  NVIDIA NIM API Key
                </label>
                <input
                  id="apiKeyInput"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="nvapi-................................................"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs text-primary placeholder-accent/40 focus:outline-none focus:border-primary transition-all font-sans"
                  disabled={loading}
                />
                <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-[10px] text-accent">
                  <span>Required for Nemotron-3 executive synthesis.</span>
                  <a
                    href="https://build.nvidia.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-pastel-blue-text hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    Get Token from Nvidia <ExternalLink size={10} strokeWidth={2.5} />
                  </a>
                </div>
              </div>

              <div>
                <label htmlFor="hfTokenInput" className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 select-none">
                  HuggingFace Access Token
                </label>
                <input
                  id="hfTokenInput"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_..................................."
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-xs text-primary placeholder-accent/40 focus:outline-none focus:border-primary transition-all font-sans"
                  disabled={loading}
                />
                <div className="mt-2 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-[10px] text-accent">
                  <span>Required for Pyannote speaker diarization.</span>
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-pastel-blue-text hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    Get Token from HuggingFace <ExternalLink size={10} strokeWidth={2.5} />
                  </a>
                </div>
              </div>

              {error && (
                <div className="p-3 border border-pastel-red-text/20 bg-pastel-red-bg text-pastel-red-text text-xs rounded-md font-semibold">
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 border border-pastel-green-text/20 bg-pastel-green-bg text-pastel-green-text text-xs rounded-md font-semibold">
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border select-none">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-border bg-card hover:bg-background text-accent hover:text-primary transition-colors text-xs font-bold rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-primary hover:bg-zinc-800 text-white font-bold text-xs rounded-md transition-colors active:scale-98"
                >
                  {loading ? 'Saving Token...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: STT Resolution & Vocab */}
        {activeTab === 'stt' && (
          <form onSubmit={handleSaveSTT} className="p-6 space-y-6">
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 select-none">
                <Cpu size={14} strokeWidth={2.5} />
                <span>STT Quantization Preset</span>
              </label>
              <p className="text-xs text-accent leading-relaxed select-none">
                Select the resolution tier for local Faster-Whisper. Higher tiers maximize vocabulary accuracy but consume more VM memory during operation.
              </p>
              
              <div className="grid grid-cols-1 gap-2.5 pt-2 select-none">
                {[
                  {
                    id: 'large-v3-turbo',
                    name: 'Large V3 Turbo',
                    tag: 'Recommended Accuracy',
                    desc: 'Maximum bilingual precision. Requires at least 6GB VM memory headroom.'
                  },
                  {
                    id: 'small',
                    name: 'Small Quantization',
                    tag: 'Balanced Speed',
                    desc: 'Fast computation. Balanced draft precision. Consumes ~2GB VM headroom.'
                  },
                  {
                    id: 'base',
                    name: 'Base Quantization',
                    tag: 'Maximum Speed',
                    desc: 'Lightweight draft speed. Highly responsive. Consumes ~1GB VM headroom.'
                  }
                ].map((model) => (
                  <label
                    key={model.id}
                    onClick={() => setModelSize(model.id)}
                    className={`cursor-pointer p-4 border rounded-lg transition-all flex flex-col gap-1 ${
                      modelSize === model.id
                        ? 'border-primary bg-pastel-blue-bg/20 text-primary'
                        : 'border-border bg-background/35 text-accent hover:border-accent/40'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="sttModel"
                          checked={modelSize === model.id}
                          onChange={() => setModelSize(model.id)}
                          className="accent-primary"
                        />
                        <span>{model.name}</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold tracking-normal lowercase opacity-75">{model.tag}</span>
                    </div>
                    <div className="text-[10px] text-accent leading-relaxed mt-0.5">{model.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <label htmlFor="vocabInput" className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-2 select-none">
                <BookOpen size={14} strokeWidth={2.5} />
                <span>Custom Vocabulary Biasing</span>
              </label>
              <p className="text-xs text-accent mb-3 select-none">
                List complex jargon terms or acronyms separated by commas to force the transcription engine to recognize them.
              </p>
              <textarea
                id="vocabInput"
                rows="3"
                value={customVocab}
                onChange={(e) => setCustomVocab(e.target.value)}
                placeholder="e.g. OJK, GOOGLE, FASTAPI, DOCKER, NIM, INT8, SQLITE"
                className="w-full p-3 bg-background border border-border text-primary rounded-md placeholder:text-accent/40 focus:outline-none focus:border-primary transition-all disabled:opacity-50 font-sans text-xs"
                disabled={sttLoading}
              />
            </div>

            {sttError && (
              <div className="p-3 border border-pastel-red-text/20 bg-pastel-red-bg text-pastel-red-text text-xs rounded-md font-semibold">
                <span>{sttError}</span>
              </div>
            )}

            {sttSuccess && (
              <div className="p-3 border border-pastel-green-text/20 bg-pastel-green-bg text-pastel-green-text text-xs rounded-md font-semibold">
                <span>{sttSuccess}</span>
              </div>
            )}

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border select-none">
              <button
                type="button"
                onClick={onClose}
                disabled={sttLoading}
                className="px-4 py-2 border border-border bg-card hover:bg-background text-accent hover:text-primary transition-colors text-xs font-bold rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sttLoading}
                className="px-5 py-2 bg-primary hover:bg-zinc-800 text-white font-bold text-xs rounded-md transition-colors active:scale-98"
              >
                {sttLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BYOKSettingsModal;
