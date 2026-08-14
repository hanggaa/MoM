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
    <div className="max-w-2xl mx-auto border-2 border-border bg-card p-6 sm:p-10 select-none">
      <div className="flex flex-col gap-6">
        {/* Header section with Privacy Assurance Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-border pb-4 select-none font-mono">
          <div>
            <h3 className="text-sm font-bold text-white tracking-widest uppercase">
              // TELEMETRY_STT_MONITOR
            </h3>
            <p className="text-[10px] text-muted mt-1 leading-none">
              JOB: #{meetingId || 'PENDING'} &bull; PROCESS: {taskId.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 border border-green/30 bg-green/5 text-green text-[9px] px-3 py-1 font-bold uppercase tracking-wider">
            <span>LOCAL ENGINE ONLINE</span>
          </div>
        </div>

        {/* Dynamic Status Badge & Elapsed Timer */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-background p-4 border border-border gap-4 font-mono">
          <div className="flex items-center gap-3">
            {status === 'QUEUED' && (
              <span className="bg-pastel-yellow-bg text-pastel-yellow-text border border-pastel-yellow-text/20 text-[10px] px-3 py-1 font-bold uppercase select-none">
                [QUEUED]
              </span>
            )}
            {status === 'PROCESSING' && (
              <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/20 text-[10px] px-3 py-1 font-bold uppercase animate-pulse select-none">
                [STT_RUNNING]
              </span>
            )}
            {status === 'SYNTHESIZING' && (
              <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/20 text-[10px] px-3 py-1 font-bold uppercase animate-pulse select-none">
                [SYNTH_RUNNING]
              </span>
            )}
            {status === 'DONE' && (
              <span className="bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/20 text-[10px] px-3 py-1 font-bold uppercase select-none">
                [DONE]
              </span>
            )}
            {status === 'ERROR' && (
              <span className="bg-pastel-red-bg text-pastel-red-text border border-pastel-red-text/20 text-[10px] px-3 py-1 font-bold uppercase select-none">
                [FAILED]
              </span>
            )}

            <div className="min-w-0">
              <p className="text-[9px] text-muted uppercase font-bold select-none tracking-widest mb-0.5">MATRIX STATUS</p>
              <p className="text-[10px] text-white uppercase">
                {status === 'QUEUED' && 'VAULT PREPARATION...'}
                {status === 'PROCESSING' && 'TRANSCRIBING AUDIO SECTORS (CPU INT8)...'}
                {status === 'SYNTHESIZING' && 'COMPILING EXECUTIVE MINUTES (NEMOTRON-3)...'}
                {status === 'DONE' && 'JOB SUCCESSFULLY COMPLETED.'}
                {status === 'ERROR' && 'STT WORKER CORE FAULT.'}
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-card border border-border text-[10px] font-mono select-none shrink-0">
            <span className="text-muted mr-1.5 uppercase font-bold">ELAPSED:</span>
            <span className="text-white font-bold">{formatTime(elapsed)}</span>
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="space-y-2 select-none font-mono">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-muted font-bold">// STT_SECTOR_PROGRESS</span>
            <span className="text-white font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-background border border-border h-3 overflow-hidden rounded-none">
            <div 
              className="bg-accent h-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Details if any */}
        {status === 'ERROR' && (
          <div className="border border-accent bg-[#2a0505] p-5 text-accent text-xs space-y-3 font-mono">
            <div>
              <p className="font-bold uppercase tracking-widest">FATAL CORE FAULT REPORT</p>
              <p className="text-[9px] text-accent/80 mt-0.5">THE LOCAL TASK SCHEDULER DUMPED THE FOLLOWING STACK:</p>
            </div>
            <pre className="font-mono bg-card p-3 border border-border text-accent whitespace-pre-wrap text-[10px] leading-relaxed rounded-none">
              {errorMessage || 'UNKNOWN STT PROCESSING ERROR OCCURRED.'}
            </pre>
            <button
              onClick={onReset}
              className="px-4 py-2 text-[10px] font-bold border border-border bg-card hover:bg-primary hover:text-background transition-colors rounded-none active:translate-x-[1px] active:translate-y-[1px]"
            >
              [ RE-INITIALIZE UPLOAD ]
            </button>
          </div>
        )}

        {/* Action button upon complete STT */}
        {status === 'DONE' && (
          <div className="flex flex-col sm:flex-row items-center justify-between border border-green/30 bg-green/5 text-green p-6 gap-4 font-mono">
            <div>
              <p className="font-bold text-xs uppercase tracking-wider">// SYNTHESIS_SUCCESSFUL</p>
              <p className="text-[9px] text-green/80 mt-0.5">
                NVIDIA NEMOTRON-3 EXECUTIVE RECORD COMMITTED TO LOCAL SQL VAULT.
              </p>
            </div>
            <button
              onClick={() => onComplete && onComplete(meetingId)}
              className="w-full sm:w-auto px-5 py-2.5 bg-green text-black font-black text-xs uppercase tracking-widest rounded-none active:translate-x-[1px] active:translate-y-[1px]"
            >
              [ ACCESS REPORT ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
