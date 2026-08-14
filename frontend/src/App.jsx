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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Hero Welcome Banner */}
        {!viewingMeeting && (
          <div className="relative border-2 border-border bg-card p-6 sm:p-10 select-none">
            {/* Structural top-border warning lines */}
            <div className="absolute top-0 left-0 right-0 h-1.5 warning-stripes" />

            <div className="space-y-6 pt-4">
              <div className="inline-flex items-center gap-2 border border-accent/30 bg-[#1a0505] text-accent px-3.5 py-1 text-[9px] font-bold uppercase tracking-wider font-mono">
                // SYSTEM STATE: SECURE_LOCAL_CPU_VAULT
              </div>

              <h1 className="text-3xl sm:text-5xl font-mono font-black text-white tracking-tighter leading-none uppercase">
                // STT_TRANSCRIPTION &<br />
                <span className="text-accent">AI_MOM_SYNTHESIS_ENGINE</span>
              </h1>

              <p className="text-xs text-primary leading-relaxed max-w-2xl font-mono">
                PRIVACY COMPLIANT LOCAL COMPILATION. AUDIO CHUNKING SCHEDULER SEGMENTS BINARY STREAM TO BYPASS NETWORK LIMITS. LOCAL FASTER-WHISPER INT8 CORE WIRE-TAP TO SERVER-VAULT BYOK NVIDIA NEMOTRON-3 EXECUTIVE GENERATOR.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 select-none font-mono">
                {!byokStatus.is_set && (
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="group glass-button inline-flex items-center gap-2 px-5 py-3 border border-accent bg-[#2a0505] text-accent font-bold text-xs tracking-wider"
                  >
                    <span>[ RUN_ENGINE_INITIALIZATION ]</span>
                    <span className="text-accent group-hover:translate-x-1 transition-transform">&gt;&gt;&gt;</span>
                  </button>
                )}
                {byokStatus.is_set && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-green/30 bg-green/5 text-green text-[10px] font-bold tracking-wider">
                    <span>VAULT_STATUS: SECURE_AND_ACTIVE</span>
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
          <div className="space-y-8 pt-10 border-t-2 border-border">
            <div className="flex items-center justify-between font-mono">
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                // SYSTEM_MODULE_MAP
              </h2>
              <span className="text-[9px] text-muted tracking-widest uppercase font-bold select-none">[ ROADMAP_DENSITY: HIGH ]</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1 bg-border select-none border border-border">
              {/* Feature Card 1 */}
              <div className="p-6 bg-card space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3 font-mono">
                  <div className="text-[9px] text-muted font-bold">MODULE_ID // 01</div>
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase">SQLite & Core Tables</h3>
                  <p className="text-[10px] text-muted leading-relaxed font-light">
                    FastAPI middleware maps data to local SQLite schema. Handles persistent tokens, meeting profiles, and settings schemas.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider border-t border-border/40 mt-auto">
                  <span className="text-green font-bold">[ COMPILING ]</span>
                  <span className="text-muted">VAULT</span>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="p-6 bg-card space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3 font-mono">
                  <div className="text-[9px] text-muted font-bold">MODULE_ID // 02</div>
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase">Quantized STT Pipeline</h3>
                  <p className="text-[10px] text-muted leading-relaxed font-light">
                    Asynchronous local worker streams binary files chunk-by-chunk to run Whisper INT8 transcription with bias dictionary support.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider border-t border-border/40 mt-auto">
                  <span className="text-green font-bold">[ COMPILING ]</span>
                  <span className="text-muted">WORKER</span>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="p-6 bg-card space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-3 font-mono">
                  <div className="text-[9px] text-muted font-bold">MODULE_ID // 03</div>
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase">Nemotron MoM Synthesis</h3>
                  <p className="text-[10px] text-muted leading-relaxed font-light">
                    Extracts structured summaries, owners, dates, and sentiment analytics via isolated server-side NVIDIA NIM API client.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider border-t border-border/40 mt-auto">
                  <span className="text-green font-bold">[ COMPILING ]</span>
                  <span className="text-muted">SYNTH</span>
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
