import { useState, useEffect } from 'react';
import { getTaskStatus } from '../services/api';

export default function TaskMonitor({ taskId, meetingId, onComplete, onReset }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('QUEUED');
  const [errorMessage, setErrorMessage] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Elapsed second tick timer
    if (status === 'DONE' || status === 'ERROR') return;
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (!taskId) return;
    
    let isMounted = true;
    let pollInterval;

    const fetchStatus = async () => {
      try {
        const data = await getTaskStatus(taskId);
        if (!isMounted) return;

        setProgress(data.progress_percent || 0);
        setStatus(data.status);
        
        if (data.error_message) {
          setErrorMessage(data.error_message);
        }

        if (data.status === 'DONE') {
          clearInterval(pollInterval);
          if (onComplete) onComplete(data.meeting_id || meetingId);
        } else if (data.status === 'ERROR') {
          clearInterval(pollInterval);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error polling task status:', err);
        }
      }
    };

    // Immediate check right on mount
    fetchStatus();
    // Poll every 2 seconds to avoid gateway timeouts while tracking STT progress
    pollInterval = setInterval(fetchStatus, 2000);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [taskId, meetingId, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative overflow-hidden rounded-3xl glass-panel p-8 transition-all duration-500">
      {/* Background ambient lighting */}
      <div className="absolute top-0 -left-10 w-48 h-48 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-8">
        {/* Header section with Privacy Assurance Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-white/10 pb-6">
          <div>
            <h3 className="text-xl font-display font-semibold text-white flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
              Local Asynchronous STT Processing
            </h3>
            <p className="text-sm text-zinc-400 mt-2 font-light">
              Meeting ID: <span className="text-zinc-200 font-mono">#{meetingId || 'Pending'}</span> &bull; Task ID: <span className="text-zinc-200 font-mono text-xs">{taskId.slice(0, 12)}...</span>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm">
            <span>🔒 CPU Local INT8 Engine</span>
          </div>
        </div>

        {/* Dynamic Status Badge & Elapsed Timer */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-background rounded-2xl p-6 border border-white/5">
          <div className="flex items-center gap-5">
            {status === 'QUEUED' && (
              <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 font-bold animate-pulse text-2xl">
                ⏳
              </div>
            )}
            {status === 'PROCESSING' && (
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                <span className="animate-spin text-2xl">⚙️</span>
              </div>
            )}
            {status === 'SYNTHESIZING' && (
              <div className="h-14 w-14 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-2xl font-bold animate-pulse shadow-glow">
                ✨
              </div>
            )}
            {status === 'DONE' && (
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl">
                ✓
              </div>
            )}
            {status === 'ERROR' && (
              <div className="h-14 w-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-3xl">
                ✕
              </div>
            )}

            <div>
              <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Current Execution State</p>
              <p className="text-lg font-semibold text-white font-display">
                {status === 'QUEUED' && 'In Queue — Preparing Faster-Whisper Model...'}
                {status === 'PROCESSING' && 'Transcribing Audio Segments (CPU INT8 Mode)...'}
                {status === 'SYNTHESIZING' && 'Synthesizing Executive MoM (NVIDIA Nemotron-3)...'}
                {status === 'DONE' && 'STT Audio & AI MoM Synthesis Complete!'}
                {status === 'ERROR' && 'STT Worker Encountered an Error'}
              </p>
            </div>
          </div>

          <div className="mt-5 md:mt-0 px-5 py-3 bg-white/5 rounded-xl border border-white/10 text-right font-mono text-sm">
            <span className="text-zinc-500 mr-2 uppercase text-[10px] tracking-widest">Elapsed:</span>
            <span className="text-primary font-bold">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm font-semibold uppercase tracking-widest">
            <span className="text-zinc-400">STT Progress & Assembly</span>
            <span className="text-primary font-bold font-mono text-base">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out shadow-glow ${
                status === 'ERROR'
                  ? 'bg-rose-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Details if any */}
        {status === 'ERROR' && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 text-rose-200 text-sm flex flex-col gap-2">
            <p className="font-semibold flex items-center gap-2">
              <span>⚠️</span> Transcription Pipeline Error:
            </p>
            <p className="font-mono bg-rose-950/80 p-2 rounded border border-rose-700/50">
              {errorMessage || 'Unknown STT processing error occurred.'}
            </p>
            <button
              onClick={onReset}
              className="mt-2 self-start px-4 py-2 text-xs font-semibold bg-rose-700 hover:bg-rose-600 text-white rounded-lg transition-colors shadow"
            >
              Upload New Audio
            </button>
          </div>
        )}

        {/* Action button upon complete STT */}
        {status === 'DONE' && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 mt-4 transition-all gap-5">
            <div>
              <p className="font-display font-semibold text-emerald-400 text-lg">Executive MoM & Transcript Saved to SQLite Vault</p>
              <p className="text-sm text-emerald-500/70 mt-1 font-light">
                NVIDIA Nemotron-3 synthesis finished successfully.
              </p>
            </div>
            <button
              onClick={() => onComplete && onComplete(meetingId)}
              className="w-full sm:w-auto px-8 py-3.5 font-bold rounded-xl bg-primary hover:bg-amber-400 text-zinc-950 transition-all shadow-glow hover:-translate-y-0.5 active:scale-95 uppercase tracking-wider text-sm whitespace-nowrap"
            >
              View Executive MoM Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
