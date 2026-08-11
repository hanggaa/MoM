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
    <div className="relative border border-border bg-card p-6 transition-all duration-500 font-mono text-xs">
      <div className="relative z-10 flex flex-col gap-6">
        {/* Header section with Privacy Assurance Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 border-b border-border pb-5 select-none">
          <div>
            <h3 className="text-md font-display font-bold text-phosphor flex items-center gap-2 uppercase">
              <span className="inline-flex h-1.5 w-1.5 bg-primary animate-pulse" />
              [03] PIPELINE_EXTRACTION_MONITOR
            </h3>
            <p className="text-[10px] text-muted mt-2 uppercase tracking-wider">
              MEETING_ID: <span className="text-primary font-bold">#{meetingId || 'PENDING'}</span> &bull; TASK_ID: <span className="text-primary font-bold">{taskId.slice(0, 12)}...</span>
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 border border-border text-[9px] font-bold uppercase tracking-wider bg-black text-muted">
            <span>🔒 LOCAL INT8 ENGINE ACTIVE</span>
          </div>
        </div>

        {/* Dynamic Status Badge & Elapsed Timer */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-black p-5 border border-border">
          <div className="flex items-center gap-4">
            {status === 'QUEUED' && (
              <div className="h-10 w-16 border border-border flex items-center justify-center text-primary font-bold animate-pulse text-xs bg-card select-none">
                [WAIT]
              </div>
            )}
            {status === 'PROCESSING' && (
              <div className="h-10 w-16 border border-primary flex items-center justify-center text-primary text-xs font-bold bg-card select-none animate-pulse">
                [PROC]
              </div>
            )}
            {status === 'SYNTHESIZING' && (
              <div className="h-10 w-16 border border-primary flex items-center justify-center text-primary text-xs font-bold bg-card select-none animate-pulse glow-text-primary">
                [AI_MOM]
              </div>
            )}
            {status === 'DONE' && (
              <div className="h-10 w-16 border border-green text-green flex items-center justify-center text-xs font-bold bg-card select-none">
                [DONE]
              </div>
            )}
            {status === 'ERROR' && (
              <div className="h-10 w-16 border border-primary text-primary flex items-center justify-center text-xs font-bold bg-card select-none">
                [FAIL]
              </div>
            )}

            <div>
              <p className="text-[9px] uppercase tracking-widest text-muted font-bold mb-1 select-none">// PIPELINE_EXECUTION_STATE</p>
              <p className="text-xs font-bold text-phosphor uppercase tracking-wider">
                {status === 'QUEUED' && 'In Queue — Preparing Faster-Whisper Model...'}
                {status === 'PROCESSING' && 'Transcribing Audio Segments (CPU INT8 Mode)...'}
                {status === 'SYNTHESIZING' && 'Synthesizing Executive MoM (NVIDIA Nemotron-3)...'}
                {status === 'DONE' && 'STT Audio & AI MoM Synthesis Complete!'}
                {status === 'ERROR' && 'STT Worker Encountered an Error'}
              </p>
            </div>
          </div>

          <div className="mt-4 md:mt-0 px-4 py-2 border border-border text-right font-mono text-xs bg-card select-none">
            <span className="text-muted mr-2 uppercase text-[9px] tracking-widest">ELAPSED:</span>
            <span className="text-primary font-bold">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="space-y-2 select-none">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
            <span className="text-muted">STT Progress & Assembly</span>
            <span className="text-primary font-bold font-mono text-xs">{progress}%</span>
          </div>
          {/* Segmented brutalist progress bar */}
          <div className="w-full bg-black h-4 border border-border flex items-center px-1 font-mono text-[10px]">
            <div 
              className={`h-2 transition-all duration-150 ${status === 'ERROR' ? 'bg-primary' : 'bg-primary'}`}
              style={{ width: `${progress}%` }}
            />
            <span className="ml-2 text-primary font-bold">
              {Math.round(progress / 5) > 0 ? '█'.repeat(Math.round(progress / 5)) : ''}
              {'.'.repeat(20 - Math.round(progress / 5))}
            </span>
          </div>
        </div>

        {/* Error Details if any */}
        {status === 'ERROR' && (
          <div className="border border-primary bg-primary/5 p-4 text-primary text-xs flex flex-col gap-2">
            <p className="font-bold uppercase">
              [⚠️ PIPELINE EXTRACTION ERROR ]
            </p>
            <p className="font-mono bg-black p-3 border border-border text-primary font-bold whitespace-pre-wrap">
              {errorMessage || 'Unknown STT processing error occurred.'}
            </p>
            <button
              onClick={onReset}
              className="mt-2 self-start px-4 py-2 text-xs font-bold border border-primary hover:bg-primary hover:text-black text-primary transition-colors bg-black"
            >
              [ RESET TRANSMITTER & UPLOAD NEW AUDIO ]
            </button>
          </div>
        )}

        {/* Action button upon complete STT */}
        {status === 'DONE' && (
          <div className="flex flex-col sm:flex-row items-center justify-between border border-green bg-green/5 p-5 mt-2 gap-5">
            <div>
              <p className="font-bold text-green text-sm uppercase">// MO_M EXTRACTION SUCCESSFUL</p>
              <p className="text-[10px] text-green/70 mt-1 uppercase tracking-wider font-light">
                NVIDIA Nemotron-3 synthesis finished and saved to local SQLite vault.
              </p>
            </div>
            <button
              onClick={() => onComplete && onComplete(meetingId)}
              className="w-full sm:w-auto px-6 py-2.5 font-bold bg-green hover:bg-green/80 text-black transition-colors uppercase tracking-widest text-xs whitespace-nowrap"
            >
              [ VIEW MOM DASHBOARD ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
