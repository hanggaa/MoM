import React, { useState, useEffect, useCallback } from 'react';
import { Mic, FileText, Cpu, Lock, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import Navbar from './components/Navbar';
import BYOKSettingsModal from './components/BYOKSettingsModal';
import AudioUploader from './components/AudioUploader';
import TaskMonitor from './components/TaskMonitor';
import MoMViewer from './components/MoMViewer';
import MeetingsArchive from './components/MeetingsArchive';
import { ChatWidget } from './components/ChatWidget';
import { checkHealth, getBYOKStatus, getMeetingDetails } from './services/api';

export default function App() {
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [byokStatus, setByokStatus] = useState({ is_set: false, preview: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [viewingMeeting, setViewingMeeting] = useState(null);
  const [_loadingInitial, setLoadingInitial] = useState(true);

  const fetchServerState = useCallback(async () => {
    try {
      await checkHealth();
      setIsServerOnline(true);
      const byokRes = await getBYOKStatus();
      setByokStatus(byokRes);
    } catch (error) {
      console.warn('Backend connection unavailable or offline:', error.message);
      setIsServerOnline(false);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    fetchServerState();
    // Poll health check every 10 seconds to maintain lively connection status
    const interval = setInterval(fetchServerState, 10000);
    return () => clearInterval(interval);
  }, [fetchServerState]);

  const handleByokUpdated = (newStatus) => {
    setByokStatus(newStatus);
  };

  const handleTaskComplete = async (meetingId) => {
    try {
      const details = await getMeetingDetails(meetingId);
      setViewingMeeting(details);
    } catch (error) {
      console.error('Failed to load meeting details:', error);
      alert('Unable to load synthesized MoM notes: ' + (error.message || 'Unknown error'));
    }
  };

  const handleReset = () => {
    setViewingMeeting(null);
    setActiveTaskId(null);
    setActiveMeetingId(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        isByokSet={byokStatus.is_set}
        isServerOnline={isServerOnline}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Hero Welcome Banner */}
        {!viewingMeeting && (
          <div className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-12">
            <div className="absolute -top-[300px] -right-[300px] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-[300px] -left-[300px] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-3xl space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-white/5 text-primary border border-primary/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <Lock size={12} />
                <span>100% Self-Hosted & Local Audio Privacy</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight text-white leading-[1.1]">
                Executive STT & <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary to-accent">AI MoM Synthesis</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-400 leading-relaxed font-light max-w-2xl">
                Automate multi-hour meeting documentation without sacrificing confidential company secrets. Local <code className="text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 text-sm">faster-whisper INT8</code> transcription combined with your own NVIDIA Nemotron-3 executive reasoning.
              </p>

              <div className="pt-4 flex flex-wrap gap-4">
                {!byokStatus.is_set && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider bg-primary text-zinc-950 shadow-glow hover:bg-amber-400 active:scale-95 transition-all animate-pulse"
                  >
                    <AlertTriangle size={18} />
                    <span>Configure NVIDIA BYOK Token to Unlock Phase 2</span>
                    <ArrowRight size={18} />
                  </button>
                )}
                {byokStatus.is_set && (
                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium tracking-wide">
                    <CheckCircle2 size={18} className="text-primary" />
                    <span>Phase 2 Engine Operational — Ready for Audio Upload & MoM Synthesis</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Audio Upload Engine, Async STT Task Monitor, or Executive MoM Viewer */}
        <section aria-label="Audio STT and MoM Engine" className="space-y-6">
          {viewingMeeting ? (
            <MoMViewer meeting={viewingMeeting} onReset={handleReset} />
          ) : !activeTaskId ? (
            <AudioUploader
              onUploadComplete={(meetingId, taskId) => {
                setActiveMeetingId(meetingId);
                setActiveTaskId(taskId);
              }}
            />
          ) : (
            <TaskMonitor
              taskId={activeTaskId}
              meetingId={activeMeetingId}
              onComplete={handleTaskComplete}
              onReset={handleReset}
            />
          )}
        </section>

        {/* Executive MoM Archive & Smart Disk Cleanup Dashboard */}
        {!viewingMeeting && !activeTaskId && (
          <section aria-label="Meetings Archive and Disk Cleanup">
            <MeetingsArchive onSelectMeeting={(meeting) => setViewingMeeting(meeting)} />
          </section>
        )}

        {/* Phase Roadmap Status Grid */}
        {!viewingMeeting && (
          <div className="space-y-6 pt-8 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold text-white inline-flex items-center gap-3">
                <Layers size={24} className="text-primary" />
                <span>System Architecture Readiness</span>
              </h2>
              <span className="text-sm font-medium text-muted tracking-wide uppercase">Roadmap Status</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature Card 1 */}
              <div className="p-6 rounded-2xl glass-panel hover:-translate-y-1 transition-transform duration-300 space-y-5">
                <div className="p-3.5 w-fit rounded-xl bg-white/5 text-primary border border-white/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <Cpu size={24} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 font-display">1. Monorepo Foundation & SQLite ORM</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Layered backend engine initialized with FastAPI, SQLModel tables (<code className="text-zinc-300">AppSettings</code>, <code className="text-zinc-300">Meeting</code>), and secure server-side BYOK vault.
                </p>
                <div className="pt-4 mt-auto flex items-center justify-between text-xs font-semibold text-primary uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Active & Verified</span>
                  <span className="text-zinc-500">Phase 1</span>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="p-6 rounded-2xl glass-panel hover:-translate-y-1 transition-transform duration-300 space-y-5">
                <div className="p-3.5 w-fit rounded-xl bg-white/5 text-primary border border-white/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <Mic size={24} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 font-display">2. 25MB Chunked Audio & STT Pipeline</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Resilient slice upload bypassing Cloudflare 100MB body limits, wired to asynchronous <code className="text-zinc-300">faster-whisper INT8</code> worker in FastAPI.
                </p>
                <div className="pt-4 mt-auto flex items-center justify-between text-xs font-semibold text-primary uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Active & Verified</span>
                  <span className="text-zinc-500">Phase 2</span>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="p-6 rounded-2xl glass-panel hover:-translate-y-1 transition-transform duration-300 space-y-5">
                <div className="p-3.5 w-fit rounded-xl bg-white/5 text-primary border border-white/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <FileText size={24} />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100 font-display">3. Nemotron-3 Executive MoM Engine</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  AI synthesis extracting structured Action Items, PICs, and deadlines with one-click Markdown copy and PDF print stylesheet.
                </p>
                <div className="pt-4 mt-auto flex items-center justify-between text-xs font-semibold text-primary uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Active & Verified</span>
                  <span className="text-zinc-500">Phase 3</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-white/5 py-8 text-center text-sm font-medium text-muted print:hidden">
        AIMeetingMoM MVP &bull; Running locally on GCP e2-standard-4 architecture &bull; Zero External Audio Leakage Guaranteed
      </footer>

      <BYOKSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        byokStatus={byokStatus}
        onSuccess={handleByokUpdated}
      />
      
      <ChatWidget activeMeetingId={activeMeetingId || viewingMeeting?.id} />
    </div>
  );
}
