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
    <div className="max-w-2xl mx-auto p-2 bg-white/5 border border-white/10 rounded-[2rem] shadow-card">
      <div className="bg-card p-6 sm:p-8 rounded-[calc(2rem-0.5rem)] shadow-inner transition-all duration-300">
        <div className="flex flex-col gap-6">
          {/* Header section with Privacy Assurance Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4 select-none">
            <div>
              <h3 className="text-lg font-serif font-semibold text-white tracking-tight">
                Transcription & MoM Monitor
              </h3>
              <p className="text-xs text-muted mt-1 font-sans font-light">
                Meeting: <span className="font-mono text-white font-bold">#{meetingId || 'Pending'}</span> &bull; Task: <span className="font-mono text-white/70">{taskId.slice(0, 8)}</span>
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full">
              <span>Local Engine Active</span>
            </div>
          </div>

          {/* Dynamic Status Badge & Elapsed Timer */}
          <div className="flex flex-col md:flex-row items-center justify-between bg-white/5 p-4 border border-border rounded-lg gap-4">
            <div className="flex items-center gap-3">
              {status === 'QUEUED' && (
                <span className="bg-pastel-yellow-bg text-pastel-yellow-text border border-pastel-yellow-text/10 text-xs px-2.5 py-1 rounded-full font-bold uppercase select-none">
                  Queued
                </span>
              )}
              {status === 'PROCESSING' && (
                <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 text-xs px-2.5 py-1 rounded-full font-bold uppercase animate-pulse select-none">
                  Running
                </span>
              )}
              {status === 'SYNTHESIZING' && (
                <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 text-xs px-2.5 py-1 rounded-full font-bold uppercase animate-pulse select-none">
                  AI Synthesis
                </span>
              )}
              {status === 'DONE' && (
                <span className="bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/10 text-xs px-2.5 py-1 rounded-full font-bold uppercase select-none">
                  Done
                </span>
              )}
              {status === 'ERROR' && (
                <span className="bg-pastel-red-bg text-pastel-red-text border border-pastel-red-text/10 text-xs px-2.5 py-1 rounded-full font-bold uppercase select-none">
                  Failed
                </span>
              )}

              <div className="min-w-0">
                <p className="text-[10px] text-muted uppercase font-bold select-none tracking-wider mb-0.5">Execution State</p>
                <p className="text-xs text-white font-sans font-light">
                  {status === 'QUEUED' && 'In queue — preparing model...'}
                  {status === 'PROCESSING' && 'Transcribing audio segments (CPU INT8)...'}
                  {status === 'SYNTHESIZING' && 'Synthesizing meeting notes (Nemotron-3)...'}
                  {status === 'DONE' && 'STT and synthesis successfully complete.'}
                  {status === 'ERROR' && 'STT worker encountered an error.'}
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 bg-card border border-border rounded-md text-xs font-mono select-none shrink-0">
              <span className="text-muted mr-1.5 uppercase text-[9px] font-bold">Elapsed:</span>
              <span className="text-white font-bold">{formatTime(elapsed)}</span>
            </div>
          </div>

          {/* Progress Bar Section */}
          <div className="space-y-2 select-none">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted font-semibold">STT Progress</span>
              <span className="text-white font-bold font-mono">{progress}%</span>
            </div>
            <div className="w-full bg-white/5 border border-border h-2 rounded-full overflow-hidden">
              <div 
                className="bg-white h-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Error Details if any */}
          {status === 'ERROR' && (
            <div className="border border-pastel-red-text/20 bg-pastel-red-bg p-5 text-pastel-red-text text-xs rounded-md space-y-3">
              <div>
                <p className="font-bold uppercase tracking-wide">Extraction Failure details</p>
                <p className="text-[10px] text-pastel-red-text/80 mt-0.5">The backend job scheduler reported the following trace:</p>
              </div>
              <pre className="font-mono bg-card p-3 border border-border text-pastel-red-text rounded-md whitespace-pre-wrap text-[11px] leading-relaxed">
                {errorMessage || 'Unknown STT processing error occurred.'}
              </pre>
              <button
                onClick={onReset}
                className="px-4 py-2 text-xs font-bold border border-border bg-card hover:bg-background text-white transition-colors rounded-md active:scale-98"
              >
                Reset and Upload New Audio
              </button>
            </div>
          )}

          {/* Action button upon complete STT */}
          {status === 'DONE' && (
            <div className="flex flex-col sm:flex-row items-center justify-between border border-pastel-green-text/20 bg-pastel-green-bg text-pastel-green-text p-6 rounded-lg gap-4">
              <div>
                <p className="font-bold text-sm">Meeting Analysis Successful</p>
                <p className="text-[10px] text-pastel-green-text/80 mt-0.5 font-light">
                  NVIDIA Nemotron-3 synthesis finished and stored in local database.
                </p>
              </div>
              <button
                onClick={() => onComplete && onComplete(meetingId)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider transition-all duration-150 rounded-md active:scale-98"
              >
                View Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
