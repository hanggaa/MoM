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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Hero Welcome Banner */}
        {!viewingMeeting && (
          <div className="relative overflow-hidden border border-border bg-card p-8 sm:p-12 rounded-xl shadow-card">
            {/* Minimal ambient light spot */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-radial-gradient from-pastel-blue-bg/20 to-transparent pointer-events-none opacity-40" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-1.5 bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full select-none">
                <Lock size={10} strokeWidth={2.5} />
                <span>100% Self-Hosted & Local Audio Privacy</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-serif text-primary tracking-tight leading-[1.15]">
                Executive STT & <span className="italic font-normal">AI MoM Synthesis</span>
              </h1>

              <p className="text-sm text-accent leading-relaxed max-w-2xl font-sans">
                Automate multi-hour meeting documentation without sacrificing confidential company secrets. Local <code className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-1.5 py-0.5 rounded font-mono text-xs">faster-whisper INT8</code> transcription combined with server-side <code className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-1.5 py-0.5 rounded font-mono text-xs">NVIDIA Nemotron-3</code> executive reasoning.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 select-none">
                {!byokStatus.is_set && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-all duration-150 rounded-md active:scale-98"
                  >
                    <AlertTriangle size={14} className="text-pastel-yellow-text" />
                    <span>Configure AI Engine Settings</span>
                    <ArrowRight size={14} />
                  </button>
                )}
                {byokStatus.is_set && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/10 text-xs font-mono tracking-wide rounded-full">
                    <CheckCircle2 size={12} strokeWidth={2.5} />
                    <span>AI Engine Active & Secure</span>
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
            <div className="flex items-center justify-between font-sans">
              <h2 className="text-xl font-serif text-primary font-semibold tracking-tight">
                System Architecture Readiness
              </h2>
              <span className="text-[10px] text-accent tracking-widest uppercase font-mono font-bold select-none">Roadmap Status</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
              {/* Feature Card 1 */}
              <div className="p-6 bg-card border border-border rounded-xl shadow-card space-y-4 flex flex-col justify-between hover:border-accent/30 transition-all duration-200">
                <div className="space-y-3">
                  <div className="text-[10px] font-mono text-accent font-bold">PHASE 01</div>
                  <h3 className="text-md font-bold text-primary font-sans tracking-tight">Monorepo Foundation & SQLite</h3>
                  <p className="text-xs text-accent leading-relaxed font-sans">
                    Layered backend engine initialized with FastAPI, SQLModel tables (<code className="text-accent font-mono bg-background px-1 py-0.5 rounded border border-border">AppSettings</code>, <code className="text-accent font-mono bg-background px-1 py-0.5 rounded border border-border">Meeting</code>), and secure server-side BYOK vault.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider border-t border-border mt-auto">
                  <span className="bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/10 px-2 py-0.5 rounded-full font-bold font-mono">Active</span>
                  <span className="text-accent">Foundation</span>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="p-6 bg-card border border-border rounded-xl shadow-card space-y-4 flex flex-col justify-between hover:border-accent/30 transition-all duration-200">
                <div className="space-y-3">
                  <div className="text-[10px] font-mono text-accent font-bold">PHASE 02</div>
                  <h3 className="text-md font-bold text-primary font-sans tracking-tight">Chunked Audio & STT Pipeline</h3>
                  <p className="text-xs text-accent leading-relaxed font-sans">
                    Resilient slice upload bypassing Cloudflare 100MB body limits, wired to asynchronous <code className="text-accent font-mono bg-background px-1 py-0.5 rounded border border-border">faster-whisper INT8</code> worker in FastAPI.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider border-t border-border mt-auto">
                  <span className="bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/10 px-2 py-0.5 rounded-full font-bold font-mono">Active</span>
                  <span className="text-accent">Transcriber</span>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="p-6 bg-card border border-border rounded-xl shadow-card space-y-4 flex flex-col justify-between hover:border-accent/30 transition-all duration-200">
                <div className="space-y-3">
                  <div className="text-[10px] font-mono text-accent font-bold">PHASE 03</div>
                  <h3 className="text-md font-bold text-primary font-sans tracking-tight">Nemotron-3 Executive MoM</h3>
                  <p className="text-xs text-accent leading-relaxed font-sans">
                    AI synthesis extracting structured Action Items, PICs, and deadlines with one-click Markdown copy and PDF print stylesheet.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider border-t border-border mt-auto">
                  <span className="bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/10 px-2 py-0.5 rounded-full font-bold font-mono">Active</span>
                  <span className="text-accent">Synthesis</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-border py-8 text-center text-[10px] font-mono text-accent tracking-wider uppercase select-none print:hidden bg-background">
        AIMeetingMoM — Private Meeting Analytics • GCP local instance • Zero External Audio Exposure
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
