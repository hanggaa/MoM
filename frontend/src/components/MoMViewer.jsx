import { useState, useRef } from 'react';
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
import { synthesizeMeetingMoM, getMeetingAudioUrl, getMeetingDetails } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MoMViewer({ meeting: initialMeeting, onReset }) {
  const [meeting, setMeeting] = useState(initialMeeting);
  
  let parsedMoMs = {};
  let defaultStyle = meeting?.meeting_style || 'General Executive MoM';
  try {
    const parsed = JSON.parse(meeting?.mom_data || '{}');
    if (parsed && typeof parsed === 'object') {
      parsedMoMs = parsed;
    } else {
      parsedMoMs[defaultStyle] = meeting?.mom_data;
    }
  } catch (e) {
    parsedMoMs[defaultStyle] = meeting?.mom_data;
  }
  
  const availableStyles = Object.keys(parsedMoMs).filter(k => parsedMoMs[k]);
  const defaultTab = availableStyles.length > 0 ? availableStyles[availableStyles.length - 1] : 'transcript';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [regenStyle, setRegenStyle] = useState(defaultStyle);
  const [copied, setCopied] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState(null);
  const audioRef = useRef(null);

  const handleSeekAudio = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
    }
  };

  const handleCopyMarkdown = async () => {
    const content = parsedMoMs[activeTab];
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    const content = parsedMoMs[activeTab];
    if (!content) return;
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const safeTitle = (meeting?.title || "Executive_MoM").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeStyle = activeTab.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    element.download = `${safeTitle}_${safeStyle}.md`;
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
      let updatedMeeting = await synthesizeMeetingMoM(meeting.id, regenStyle);
      
      while (updatedMeeting.status === "SYNTHESIZING") {
        await new Promise(resolve => setTimeout(resolve, 2500));
        updatedMeeting = await getMeetingDetails(meeting.id);
      }

      if (updatedMeeting.status === "ERROR") {
        setSynthError("Background synthesis failed. Check server logs.");
      }
      
      setMeeting(updatedMeeting);
      setActiveTab(regenStyle);
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 glass-panel p-6 rounded-3xl print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              onClick={onReset} 
              className="p-2 mr-2 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Upload
            </button>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1.5 rounded-xl border border-emerald-500/20 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Local CPU & Nemotron-3 Protected
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight pt-1">{meeting?.title || "Project Sync Meeting"}</h1>
          <p className="text-sm text-zinc-400 flex items-center gap-2 font-light">
            <span>Meeting ID: #{meeting?.id}</span> &bull; 
            <span>Recorded: {new Date(meeting?.created_at || Date.now()).toLocaleDateString('id-ID', { dateStyle: 'full' })}</span>
          </p>
        </div>

        {/* Action & Export Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 hover:border-white/20 text-sm font-semibold transition-all active:scale-95"
            title="Copy Markdown"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400 animate-bounce" /> : <Copy className="w-4 h-4 text-zinc-400" />}
            {copied ? 'Copied!' : 'Copy MD'}
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 hover:border-white/20 text-sm font-semibold transition-all active:scale-95"
            title="Download Markdown file"
          >
            <Download className="w-4 h-4 text-primary" />
            Download .md
          </button>

          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-glow active:scale-95"
            title="Print to PDF or paper"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>

          <div className="flex items-center gap-2 bg-background border border-white/10 rounded-xl p-1.5 ml-2">
            <select
              value={regenStyle}
              onChange={(e) => setRegenStyle(e.target.value)}
              className="bg-transparent text-zinc-300 text-sm py-1 pl-3 pr-6 focus:outline-none appearance-none cursor-pointer font-medium"
            >
              <option value="General Executive MoM">General Executive</option>
              <option value="Agile Sprint Retro">Agile Sprint Retro</option>
              <option value="Tech Architecture Spec">Tech Architecture Spec</option>
              <option value="Sales & Commercials">Sales & Commercials</option>
              <option value="Daily Standup">Daily Standup</option>
              <option value="Brainstorming & Ideation">Brainstorming & Ideation</option>
              <option value="User Discovery Interview">User Discovery Interview</option>
              <option value="Journalistic Narrative">Journalistic Narrative</option>
            </select>
            <button
              onClick={handleReSynthesize}
              disabled={isSynthesizing}
              className="inline-flex items-center justify-center p-2 rounded-lg bg-primary hover:bg-amber-400 text-zinc-950 transition-colors disabled:opacity-50"
              title="Generate new style via Nemotron-3"
            >
              <RefreshCw className={`w-4 h-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Local Audio Playback Review Bar - Hidden in print view */}
      {meeting?.id && (
        <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 print:hidden">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
              <Volume2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-base font-bold text-white tracking-tight">Local STT Audio Playback Review</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-accent/20 text-accent border border-accent/30">
                  Direct Disk Stream
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-light">Listen to your recorded audio while reviewing synthesized executive decision items.</p>
            </div>
          </div>
          <audio
            ref={audioRef}
            controls
            src={getMeetingAudioUrl(meeting.id)}
            className="w-full sm:w-72 md:w-96 h-12 rounded-xl bg-background accent-primary shadow-inner border border-white/5"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {synthError && (
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-center gap-3 text-sm print:hidden">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span><strong>Synthesis Notice:</strong> {synthError}</span>
        </div>
      )}

      {/* Tabs Bar - Hidden in print view */}
      <div className="flex border-b border-white/10 gap-8 px-6 print:hidden overflow-x-auto">
        {availableStyles.map(styleName => (
          <button
            key={styleName}
            onClick={() => setActiveTab(styleName)}
            className={`pb-4 whitespace-nowrap text-sm font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all duration-300 ${
              activeTab === styleName
                ? 'border-primary text-primary'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles className="w-4 h-4" /> {styleName}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-4 whitespace-nowrap text-sm font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all duration-300 ${
            activeTab === 'transcript'
              ? 'border-primary text-primary'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Terminal className="w-4 h-4" /> INT8 CPU Raw Transcript
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="glass-panel rounded-3xl p-8 sm:p-10 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Print Only Formal Executive Header */}
        <div className="hidden print:block mb-8 border-b-2 pb-6 border-zinc-200">
          <div className="flex justify-between items-baseline">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight font-display">{meeting?.title || "Executive Minutes of Meeting"}</h1>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-300">Confidential / Internal PM Record</span>
          </div>
          <p className="text-sm text-zinc-600 mt-3 flex gap-6">
            <span><strong>Date:</strong> {new Date(meeting?.created_at || Date.now()).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
            <span><strong>System:</strong> AIMeetingMoM Self-Hosted Engine</span>
            <span><strong>AI Synthesis:</strong> NVIDIA Nemotron-3</span>
          </p>
        </div>

        {activeTab !== 'transcript' ? (
          <div className="print:block">
            {isSynthesizing ? (
              <div className="py-20 text-center space-y-5">
                <div className="inline-flex p-5 rounded-3xl bg-primary/10 border border-primary/20 shadow-glow animate-pulse">
                  <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                </div>
                <h3 className="text-xl font-display font-semibold text-zinc-100">Synthesizing {regenStyle} with Nemotron-3...</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto font-light">
                  Extracting relevant insights from transcript based on the selected meeting style.
                </p>
              </div>
            ) : parsedMoMs[activeTab] ? (
              <div className="prose prose-invert prose-amber prose-sm sm:prose-base max-w-none print:prose-neutral print:prose-sm">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({node, ...props}) => {
                      if (props.href && props.href.startsWith('timestamp://')) {
                        const timeStr = props.href.replace('timestamp://', '');
                        const [mins, secs] = timeStr.split(':').map(Number);
                        const totalSeconds = (mins * 60) + (secs || 0);
                        return (
                          <button 
                            onClick={(e) => { e.preventDefault(); handleSeekAudio(totalSeconds); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 mx-1 rounded-lg bg-primary/20 text-primary hover:bg-primary/40 border border-primary/30 text-[11px] font-mono font-bold transition-all active:scale-95 cursor-pointer decoration-transparent print:hidden uppercase tracking-wider"
                            title={`Play audio from ${timeStr}`}
                          >
                            <Clock className="w-3.5 h-3.5" /> {timeStr}
                          </button>
                        );
                      }
                      return <a {...props} className="text-primary hover:text-amber-400 underline transition-colors" />;
                    }
                  }}
                >
                  {parsedMoMs[activeTab]}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="p-12 text-center bg-background rounded-2xl border border-white/5 text-zinc-500 print:text-black print:bg-white print:border-zinc-300 shadow-inner">
                <p className="text-lg mb-2">📭 No MoM synthesized yet.</p>
                <p className="text-sm">Select a style and click "Regenerate" to create notes via NVIDIA Nemotron-3.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5 print:hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                faster-whisper (INT8) Local CPU Transcription
              </h3>
              <span className="text-xs text-zinc-500 font-medium">Zero Cloud Audio Leakage</span>
            </div>
            <pre className="font-mono text-sm leading-relaxed bg-background p-8 rounded-2xl border border-white/5 text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[65vh] overflow-y-auto shadow-inner">
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
