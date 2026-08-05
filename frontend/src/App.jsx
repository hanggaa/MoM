import React, { useState, useEffect, useCallback } from 'react';
import { Mic, FileText, Cpu, Lock, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import Navbar from './components/Navbar';
import BYOKSettingsModal from './components/BYOKSettingsModal';
import AudioUploader from './components/AudioUploader';
import TaskMonitor from './components/TaskMonitor';
import MoMViewer from './components/MoMViewer';
import MeetingsArchive from './components/MeetingsArchive';
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
    <div className="min-h-screen flex flex-col selection:bg-cyan-500/30">
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        isByokSet={byokStatus.is_set}
        isServerOnline={isServerOnline}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Hero Welcome Banner - Hide when viewing MoM in print/detail mode */}
        {!viewingMeeting && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
            {/* Subtle Accent Gradients */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-950/80 text-cyan-400 border border-cyan-500/30 shadow-inner">
                <Lock size={12} />
                <span>100% Self-Hosted & Local Audio Privacy</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 leading-tight">
                Executive STT & <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">AI MoM Synthesis</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                Automate multi-hour meeting documentation without sacrificing confidential company secrets. Local <code className="text-cyan-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">faster-whisper INT8</code> transcription combined with your own NVIDIA Nemotron-3 executive reasoning.
              </p>

              <div className="pt-2 flex flex-wrap gap-4">
                {!byokStatus.is_set && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all animate-pulse"
                  >
                    <AlertTriangle size={16} />
                    <span>Configure NVIDIA BYOK Token to Unlock Phase 2</span>
                    <ArrowRight size={16} />
                  </button>
                )}
                {byokStatus.is_set && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 size={16} />
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

        {/* Phase Roadmap Status Grid - Hide when reading active MoM */}
        {!viewingMeeting && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 inline-flex items-center gap-2">
                <Layers size={20} className="text-cyan-400" />
                <span>System Architecture Readiness</span>
              </h2>
              <span className="text-xs font-medium text-slate-400">AGENTS.md Roadmap Status</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature Card 1 */}
              <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 transition-all space-y-4">
                <div className="p-3 w-fit rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Cpu size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-100">1. Monorepo Foundation & SQLite ORM</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Layered backend engine initialized with FastAPI, SQLModel tables (<code className="text-slate-300">AppSettings</code>, <code className="text-slate-300">Meeting</code>, <code className="text-slate-300">Task</code>), and secure server-side BYOK vault.
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} /> Active & Verified</span>
                  <span className="text-slate-500">Phase 1</span>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 transition-all space-y-4">
                <div className="p-3 w-fit rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Mic size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-100">2. 25MB Chunked Audio & STT Pipeline</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Resilient slice upload bypassing Cloudflare 100MB body limits, wired to asynchronous <code className="text-slate-300">faster-whisper INT8</code> worker in FastAPI BackgroundTasks.
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} /> Active & Verified</span>
                  <span className="text-slate-500">Phase 2A & 2B</span>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-slate-700 transition-all space-y-4">
                <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <FileText size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-200">3. Nemotron-3 Executive MoM Engine</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI synthesis extracting structured Action Items, PICs, and deadlines with one-click Markdown copy and PDF print stylesheet.
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 size={13} /> Active & Verified</span>
                  <span className="text-slate-500">Phase 2C & 3</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md py-6 text-center text-xs font-medium text-slate-500 print:hidden">
        AIMeetingMoM MVP &bull; Running locally on GCP e2-standard-4 architecture &bull; Zero External Audio Leakage Guaranteed
      </footer>

      <BYOKSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        byokStatus={byokStatus}
        onSuccess={handleByokUpdated}
      />
    </div>
  );
}
