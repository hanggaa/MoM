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
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 border border-cyan-500/30 shadow-2xl shadow-cyan-950/20 text-slate-100 transition-all duration-500">
      {/* Background ambient lighting */}
      <div className="absolute top-0 -left-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">
        {/* Header section with Privacy Assurance Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
          <div>
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-white flex items-center gap-2">
              <span className="inline-flex h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
              Local Asynchronous STT Processing
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Meeting ID: <span className="text-slate-200 font-mono">#{meetingId || 'Pending'}</span> &bull; Task ID: <span className="text-slate-200 font-mono text-xs">{taskId.slice(0, 12)}...</span>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shadow-sm">
            <span>🔒 CPU Local INT8 Engine (Zero Privacy Leak)</span>
          </div>
        </div>

        {/* Dynamic Status Badge & Elapsed Timer */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-slate-950/50 rounded-xl p-5 border border-slate-800/80">
          <div className="flex items-center gap-4">
            {status === 'QUEUED' && (
              <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold animate-pulse text-xl">
                ⏳
              </div>
            )}
            {status === 'PROCESSING' && (
              <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xl font-bold">
                <span className="animate-spin text-2xl">⚙️</span>
              </div>
            )}
            {status === 'SYNTHESIZING' && (
              <div className="h-12 w-12 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-300 text-xl font-bold animate-pulse shadow-lg shadow-purple-500/30">
                ✨
              </div>
            )}
            {status === 'DONE' && (
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-2xl">
                ✓
              </div>
            )}
            {status === 'ERROR' && (
              <div className="h-12 w-12 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 text-2xl">
                ✕
              </div>
            )}

            <div>
              <p className="text-sm uppercase tracking-widest text-slate-400 font-semibold">Current Execution State</p>
              <p className="text-lg font-bold text-white">
                {status === 'QUEUED' && 'In Queue — Preparing Faster-Whisper Model...'}
                {status === 'PROCESSING' && 'Transcribing Audio Segments (CPU INT8 Mode)...'}
                {status === 'SYNTHESIZING' && 'Synthesizing Executive MoM (NVIDIA Nemotron-3)...'}
                {status === 'DONE' && 'STT Audio & AI MoM Synthesis Complete!'}
                {status === 'ERROR' && 'STT Worker Encountered an Error'}
              </p>
            </div>
          </div>

          <div className="mt-4 md:mt-0 px-4 py-2 bg-slate-900 rounded-lg border border-slate-700/50 text-right font-mono text-sm">
            <span className="text-slate-400 mr-2">Elapsed:</span>
            <span className="text-cyan-300 font-bold">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="text-slate-300">STT Progress & Assembly</span>
            <span className="text-cyan-400 font-bold font-mono">{progress}%</span>
          </div>
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                status === 'ERROR'
                  ? 'bg-gradient-to-r from-rose-600 to-red-500'
                  : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
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
          <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-5 mt-2 transition-all">
            <div>
              <p className="font-bold text-emerald-300 text-base">Executive MoM & Transcript Saved to SQLite Vault</p>
              <p className="text-xs text-slate-300 mt-0.5">
                NVIDIA Nemotron-3 synthesis finished successfully.
              </p>
            </div>
            <button
              onClick={() => onComplete && onComplete(meetingId)}
              className="px-6 py-3 font-semibold rounded-xl bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 hover:from-purple-400 hover:to-cyan-400 text-white transition-all shadow-lg shadow-indigo-900/30 font-medium"
            >
              View Executive MoM Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
