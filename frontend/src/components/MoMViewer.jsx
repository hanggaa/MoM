import { useState } from 'react';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Printer, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Sparkles, 
  Terminal,
  ArrowLeft,
  Volume2
} from 'lucide-react';
import { synthesizeMeetingMoM, getMeetingAudioUrl } from '../services/api';

export default function MoMViewer({ meeting: initialMeeting, onReset }) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [activeTab, setActiveTab] = useState('mom'); // 'mom' or 'transcript'
  const [copied, setCopied] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState(null);

  const handleCopyMarkdown = async () => {
    if (!meeting?.mom_data) return;
    try {
      await navigator.clipboard.writeText(meeting.mom_data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!meeting?.mom_data) return;
    const element = document.createElement('a');
    const file = new Blob([meeting.mom_data], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const safeTitle = (meeting?.title || "Executive_MoM").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    element.download = `${safeTitle}_MoM.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleReSynthesize = async () => {
    setIsSynthesizing(true);
    setSynthError(null);
    try {
      const updatedMeeting = await synthesizeMeetingMoM(meeting.id);
      setMeeting(updatedMeeting);
    } catch (err) {
      setSynthError(err.message || 'Failed to re-run AI synthesis.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Helper to parse sections and tables from raw Markdown strings cleanly for executive presentation
  const renderFormattedMoM = (rawMarkdown) => {
    if (!rawMarkdown) {
      return (
        <div className="p-8 text-center bg-gray-900/50 rounded-xl border border-gray-800 text-gray-400 print:text-black print:bg-white print:border-gray-300">
          No MoM synthesized yet. Click "Regenerate MoM" to create executive notes via NVIDIA Nemotron-3.
        </div>
      );
    }

    const lines = rawMarkdown.split('\n');
    const elements = [];
    let currentSection = 'General';
    let tableRows = [];
    let tableMode = false;
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-2 mb-6 text-gray-300 print:text-gray-800 print:text-sm print:mb-4">
            {listItems.map((item, idx) => (
              <li key={idx} className="leading-relaxed print:leading-normal">{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 1) {
        // First row is header, second is separator (|---|), rest are data rows
        const headers = tableRows[0].split('|').map(c => c.trim()).filter(Boolean);
        const dataRows = tableRows.slice(2).map(row => row.split('|').map(c => c.trim()).filter(Boolean));

        elements.push(
          <div key={`tbl-${elements.length}`} className="overflow-x-auto my-6 rounded-xl border border-gray-800 shadow-lg bg-gray-900/80 backdrop-blur print:overflow-visible print:shadow-none print:border-none print:bg-transparent print:my-4 break-inside-avoid">
            <table className="w-full text-left text-sm text-gray-300 print:text-black print:border-collapse print:w-full print:border print:border-gray-300">
              <thead className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 text-indigo-200 uppercase text-xs tracking-wider font-semibold border-b border-gray-700 print:bg-gray-100 print:text-gray-900 print:border-gray-400 print:text-[11px]">
                <tr>
                  <th className="px-4 py-3 w-12 text-center print:hidden">Status</th>
                  {headers.map((h, i) => (
                    <th key={i} className="px-4 py-3.5 print:border print:border-gray-300 print:py-2 print:px-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 print:divide-y print:divide-gray-300">
                {dataRows.map((row, idx) => {
                  const priority = row[3] || 'Med';
                  const priorityBg =
                    priority.toLowerCase().includes('high') ? 'bg-red-500/20 text-red-300 border-red-500/30 print:bg-red-50 print:text-red-900 print:border-red-300' :
                    priority.toLowerCase().includes('low') ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 print:bg-blue-50 print:text-blue-900 print:border-blue-300' :
                    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 print:bg-yellow-50 print:text-yellow-900 print:border-yellow-300';

                  return (
                    <tr key={idx} className="hover:bg-gray-800/40 transition-colors duration-150 print:hover:bg-transparent print:text-xs">
                      <td className="px-4 py-4 text-center print:hidden">
                        <input type="checkbox" className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer accent-indigo-500" />
                      </td>
                      <td className="px-4 py-4 font-medium text-white print:text-gray-900 print:border print:border-gray-300 print:py-2 print:px-2.5">{row[0] || '-'}</td>
                      <td className="px-4 py-4 text-indigo-400 font-medium print:text-gray-800 print:border print:border-gray-300 print:py-2 print:px-2.5">
                        <span className="inline-flex items-center gap-1 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800/40 print:bg-transparent print:border-none print:p-0">
                          <User className="w-3.5 h-3.5 text-indigo-300 print:hidden" />
                          {row[1] || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-400 print:text-gray-700 print:border print:border-gray-300 print:py-2 print:px-2.5">
                        <span className="inline-flex items-center gap-1 print:inline">
                          <Clock className="w-3.5 h-3.5 text-gray-500 print:hidden" />
                          {row[2] || 'TBD'}
                        </span>
                      </td>
                      <td className="px-4 py-4 print:border print:border-gray-300 print:py-2 print:px-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border print:rounded print:px-1.5 print:py-0.5 print:text-[10px] ${priorityBg}`}>
                          {row[3] || 'Normal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        tableMode = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Table line parsing
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        flushList();
        tableMode = true;
        tableRows.push(trimmed);
        return;
      } else if (tableMode) {
        flushTable();
      }

      // Heading parsing
      if (trimmed.startsWith('# ')) {
        flushList();
        currentSection = trimmed.replace('# ', '').trim();
        let icon = <FileText className="w-6 h-6 text-indigo-400" />;
        if (currentSection.includes('Executive Summary')) icon = <Sparkles className="w-6 h-6 text-amber-400" />;
        if (currentSection.includes('Action Items') || currentSection.includes('Ownership')) icon = <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
        if (currentSection.includes('Risks') || currentSection.includes('Constraints')) icon = <AlertTriangle className="w-6 h-6 text-red-400" />;

        elements.push(
          <div key={`hdr-${index}`} className="flex items-center gap-3 mt-8 mb-4 first:mt-0 border-b border-gray-800 pb-3 print:border-gray-300 print:mt-6 print:mb-2 print:pb-1 break-after-avoid">
            <div className="p-2 rounded-xl bg-gray-800/80 border border-gray-700/50 shadow-sm print:hidden">
              {icon}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight print:text-gray-900 print:text-lg">{currentSection}</h2>
          </div>
        );
      } else if (trimmed.startsWith('- ')) {
        listItems.push(trimmed.replace('- ', ''));
      } else if (trimmed.length > 0) {
        flushList();
        elements.push(
          <p key={`p-${index}`} className="text-gray-300 leading-relaxed mb-4 text-base print:text-gray-800 print:text-sm print:mb-3">
            {trimmed}
          </p>
        );
      }
    });

    flushList();
    if (tableMode) flushTable();

    return <div className="space-y-2 print:space-y-1">{elements}</div>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 print:max-w-none print:m-0 print:p-0">
      {/* Header Bar - Hidden in print view */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-900/90 border border-gray-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-xl print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={onReset} 
              className="p-2 mr-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium border border-transparent hover:border-gray-700"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Upload
            </button>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-500/30 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Local CPU & Nemotron-3 Protected
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight pt-1">{meeting?.title || "Project Sync Meeting"}</h1>
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <span>Meeting ID: #{meeting?.id}</span> • 
            <span>Recorded: {new Date(meeting?.created_at || Date.now()).toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
          </p>
        </div>

        {/* Action & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-800/90 hover:bg-gray-700/80 text-gray-200 border border-gray-700 hover:border-gray-600 text-sm font-medium transition-all shadow-sm active:scale-95"
            title="Copy Markdown"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400 animate-bounce" /> : <Copy className="w-4 h-4 text-gray-400" />}
            {copied ? 'Copied!' : 'Copy MD'}
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gray-800/90 hover:bg-gray-700/80 text-gray-200 border border-gray-700 hover:border-gray-600 text-sm font-medium transition-all shadow-sm active:scale-95"
            title="Download Markdown file"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            Download .md
          </button>

          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 active:scale-95 border border-indigo-400/30"
            title="Print to PDF or paper"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>

          <button
            onClick={handleReSynthesize}
            disabled={isSynthesizing}
            className="inline-flex items-center justify-center p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-colors disabled:opacity-50"
            title="Regenerate AI MoM via Nemotron-3"
          >
            <RefreshCw className={`w-4 h-4 ${isSynthesizing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Local Audio Playback Review Bar - Hidden in print view */}
      {meeting?.id && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950/60 border border-indigo-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-inner">
              <Volume2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-100 tracking-tight">Local STT Audio Playback Review</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-500/40">
                  Direct Disk Stream
                </span>
              </div>
              <p className="text-xs text-slate-400">Listen to your recorded audio while reviewing synthesized executive decision items.</p>
            </div>
          </div>
          <audio
            controls
            src={getMeetingAudioUrl(meeting.id)}
            className="w-full sm:w-72 md:w-80 h-10 rounded-xl bg-slate-950/90 accent-indigo-500 shadow-inner border border-slate-800/80"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {synthError && (
        <div className="p-4 bg-red-950/80 border border-red-500/40 rounded-xl text-red-300 flex items-center gap-3 text-sm print:hidden">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span><strong>Synthesis Notice:</strong> {synthError}</span>
        </div>
      )}

      {/* Tabs Bar - Hidden in print view */}
      <div className="flex border-b border-gray-800 gap-6 px-4 print:hidden">
        <button
          onClick={() => setActiveTab('mom')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors duration-150 ${
            activeTab === 'mom'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Executive AI MoM
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors duration-150 ${
            activeTab === 'transcript'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Terminal className="w-4 h-4" /> INT8 CPU Raw Transcript
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="bg-gray-950/90 border border-gray-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Print Only Formal Executive Header */}
        <div className="hidden print:block mb-6 border-b-2 pb-4 border-gray-800">
          <div className="flex justify-between items-baseline">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{meeting?.title || "Executive Minutes of Meeting"}</h1>
            <span className="text-xs font-semibold uppercase text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-300">Confidential / Internal PM Record</span>
          </div>
          <p className="text-xs text-gray-600 mt-1.5 flex gap-4">
            <span><strong>Date:</strong> {new Date(meeting?.created_at || Date.now()).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
            <span><strong>System:</strong> AIMeetingMoM Self-Hosted Engine</span>
            <span><strong>AI Synthesis:</strong> NVIDIA Nemotron-3</span>
          </p>
        </div>

        {activeTab === 'mom' ? (
          <div className="print:block">
            {isSynthesizing ? (
              <div className="py-16 text-center space-y-4">
                <div className="inline-block p-4 rounded-full bg-indigo-500/10 border border-indigo-500/30 animate-pulse">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-gray-200">Synthesizing Executive MoM with Nemotron-3...</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Extracting architectural decisions, Action Items, and PM ownership from transcript.
                </p>
              </div>
            ) : (
              renderFormattedMoM(meeting?.mom_data)
            )}
          </div>
        ) : (
          <div className="space-y-4 print:hidden">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                faster-whisper (INT8) Local CPU Transcription
              </h3>
              <span className="text-xs text-gray-500">Zero Cloud Audio Leakage</span>
            </div>
            <pre className="font-mono text-sm leading-relaxed bg-gray-900/80 p-6 rounded-xl border border-gray-800/80 text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-[65vh] overflow-y-auto shadow-inner">
              {meeting?.transcript_text || '[No transcript file available for this meeting recording yet.]'}
            </pre>
          </div>
        )}

        {/* Print Only Footer */}
        <div className="hidden print:block mt-12 pt-4 border-t border-gray-300 text-[10px] text-gray-500 text-center">
          Generated automatically by AIMeetingMoM — Private Local Audio Processing & BYOK Executive Reasoning
        </div>
      </div>
    </div>
  );
}
