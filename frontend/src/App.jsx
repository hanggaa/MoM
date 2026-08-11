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
          <div className="relative overflow-hidden border-2 border-border bg-card p-6 sm:p-10">
            {/* Technical visual decoration - warning stripes */}
            <div className="absolute top-0 right-0 w-24 h-1 warning-stripes opacity-60" />
            <div className="absolute bottom-0 left-0 w-24 h-1 warning-stripes opacity-60" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 border border-primary bg-black/80 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-widest text-primary glow-text-primary">
                [ STATUS: SECURE LOCAL ENVIRONMENT ]
              </div>

              <h1 className="text-3xl sm:text-5xl font-display font-bold tracking-wider text-phosphor leading-[1.1] uppercase glow-text">
                EXECUTIVE STT & <span className="text-primary glow-text-primary">AI MoM SYNTHESIS</span>
              </h1>

              <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-3xl font-mono">
                Automate multi-hour meeting documentation without sacrificing confidential company secrets. Local <code className="text-primary font-mono bg-black/80 px-1.5 py-0.5 border border-border text-xs">faster-whisper INT8</code> transcription combined with server-side <code className="text-primary font-mono bg-black/80 px-1.5 py-0.5 border border-border text-xs">NVIDIA Nemotron-3</code> executive reasoning.
              </p>

              <div className="pt-2 flex flex-wrap gap-4">
                {!byokStatus.is_set && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-primary text-black font-bold text-xs uppercase tracking-widest hover:bg-red-500 active:translate-y-0.5 transition-all animate-pulse"
                  >
                    <AlertTriangle size={14} />
                    <span>[ CONFIGURE NVIDIA TOKEN TO UNLOCK AI MODULE ]</span>
                    <ArrowRight size={14} />
                  </button>
                )}
                {byokStatus.is_set && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 border border-green/30 bg-green/5 text-green text-xs font-mono tracking-wider uppercase select-none">
                    <span>/// MAINBOARD INTEGRITY CHECK PASSED // READY FOR CAPTURE</span>
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
          <div className="space-y-6 pt-8 border-t border-border">
            <div className="flex items-center justify-between font-mono">
              <h2 className="text-sm font-display font-bold text-phosphor inline-flex items-center gap-2 uppercase">
                <span>[01] SYSTEM_READINESS_METRICS</span>
              </h2>
              <span className="text-[10px] text-muted tracking-wider uppercase select-none">// OPERATION REPORT</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-px border border-border bg-border select-none">
              {/* Feature Card 1 */}
              <div className="p-6 bg-card space-y-4 flex flex-col justify-between group hover:bg-black/30 transition-colors">
                <div className="space-y-3">
                  <div className="text-[9px] font-mono text-primary font-bold">DEV_ID // SYS-01</div>
                  <h3 className="text-sm font-bold text-phosphor font-display uppercase tracking-wider">Monorepo Foundation & SQLite ORM</h3>
                  <p className="text-xs text-muted leading-relaxed font-mono">
                    Layered backend engine initialized with FastAPI, SQLModel tables (<code className="text-zinc-500">AppSettings</code>, <code className="text-zinc-500">Meeting</code>), and secure server-side BYOK vault.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider border-t border-border mt-auto">
                  <span className="text-green glow-text-green font-bold">[OPERATIONAL]</span>
                  <span className="text-muted">PHASE_01</span>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="p-6 bg-card space-y-4 flex flex-col justify-between group hover:bg-black/30 transition-colors">
                <div className="space-y-3">
                  <div className="text-[9px] font-mono text-primary font-bold">DEV_ID // SYS-02</div>
                  <h3 className="text-sm font-bold text-phosphor font-display uppercase tracking-wider">Chunked Audio & STT Pipeline</h3>
                  <p className="text-xs text-muted leading-relaxed font-mono">
                    Resilient slice upload bypassing Cloudflare 100MB body limits, wired to asynchronous <code className="text-zinc-500">faster-whisper INT8</code> worker in FastAPI.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider border-t border-border mt-auto">
                  <span className="text-green glow-text-green font-bold">[OPERATIONAL]</span>
                  <span className="text-muted">PHASE_02</span>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="p-6 bg-card space-y-4 flex flex-col justify-between group hover:bg-black/30 transition-colors">
                <div className="space-y-3">
                  <div className="text-[9px] font-mono text-primary font-bold">DEV_ID // SYS-03</div>
                  <h3 className="text-sm font-bold text-phosphor font-display uppercase tracking-wider">Nemotron-3 Executive MoM Engine</h3>
                  <p className="text-xs text-muted leading-relaxed font-mono">
                    AI synthesis extracting structured Action Items, PICs, and deadlines with one-click Markdown copy and PDF print stylesheet.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider border-t border-border mt-auto">
                  <span className="text-green glow-text-green font-bold">[OPERATIONAL]</span>
                  <span className="text-muted">PHASE_03</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-border py-6 text-center text-[10px] font-mono text-muted tracking-widest uppercase select-none print:hidden bg-card">
        AIMeetingMoM MAINBOARD &bull; HOSTED ON GCP E2-STANDARD-4 ARCHITECTURE &bull; [SECURITY STAGE: ZERO AUDIO LEAKAGE]
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
