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
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 print:max-w-none print:m-0 print:p-0 font-mono text-xs">
      {/* Header Bar - Hidden in print view */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 border border-border bg-card p-5 print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap select-none">
            <button 
              onClick={onReset} 
              className="p-1 border border-border hover:border-primary bg-black text-muted hover:text-phosphor transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> [ BACK_TO_DASHBOARD ]
            </button>
            <span className="inline-flex items-center gap-1.5 border border-green/30 bg-green/5 text-green text-[9px] px-2.5 py-1 font-bold uppercase tracking-wider">
              [ SECURE LOCAL CPU ENGINE ACTIVE ]
            </span>
          </div>
          <h1 className="text-lg font-display font-bold text-phosphor tracking-wider pt-1 uppercase glow-text">{meeting?.title || "UNRESOLVED_MEETING_RECORD"}</h1>
          <p className="text-[10px] text-muted flex items-center gap-2 select-none uppercase">
            <span>INDEX_REF: #{meeting?.id}</span> &bull; 
            <span>TIMESTAMP: {meeting?.created_at ? new Date(meeting.created_at).toISOString().replace('T', ' ').substring(0, 16) : 'PENDING'}</span>
          </p>
        </div>

        {/* Action & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5 select-none">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-border hover:border-primary bg-black text-phosphor text-[10px] font-bold uppercase transition-colors"
            title="Copy Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
            <span>{copied ? 'COPIED' : '[COPY_MD]'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-border hover:border-primary bg-black text-phosphor text-[10px] font-bold uppercase transition-colors"
            title="Download Markdown file"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>[DOWNLOAD_MD]</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-primary bg-black text-primary font-bold text-[10px] hover:bg-primary hover:text-black transition-colors"
            title="Print to PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>[EXPORT_PDF]</span>
          </button>

          <div className="flex items-center gap-2 bg-black border border-border p-1">
            <select
              value={regenStyle}
              onChange={(e) => setRegenStyle(e.target.value)}
              className="bg-transparent text-phosphor text-[10px] font-bold py-1 pl-2 pr-6 focus:outline-none appearance-none cursor-pointer font-mono"
            >
              <option value="General Executive MoM">GENERAL EXECUTIVE</option>
              <option value="Agile Sprint Retro">AGILE RETRO</option>
              <option value="Tech Architecture Spec">TECH ARCH SPEC</option>
              <option value="Sales & Commercials">SALES / COMM</option>
              <option value="Daily Standup">DAILY STANDUP</option>
              <option value="Brainstorming & Ideation">BRAINSTORM</option>
              <option value="User Discovery Interview">USER DISCOVERY</option>
              <option value="Journalistic Narrative">NARRATIVE</option>
            </select>
            <button
              onClick={handleReSynthesize}
              disabled={isSynthesizing}
              className="inline-flex items-center justify-center p-1.5 border border-primary hover:bg-primary text-primary hover:text-black transition-colors disabled:opacity-50 bg-black"
              title="Generate new style via Nemotron-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Local Audio Playback Review Bar - Hidden in print view */}
      {meeting?.id && (
        <div className="border border-border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-primary text-primary bg-black select-none">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-phosphor uppercase">// TELEMETRY_AUDIO_MONITOR</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-primary text-primary bg-primary/5 select-none">
                  DISK_STREAM
                </span>
              </div>
              <p className="text-[10px] text-muted font-light select-none">Direct file streaming synchronized with clickable segment timestamps.</p>
            </div>
          </div>
          <audio
            ref={audioRef}
            controls
            src={getMeetingAudioUrl(meeting.id)}
            className="w-full sm:w-72 md:w-96 h-9 bg-black border border-border text-primary"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {synthError && (
        <div className="p-4 border border-primary bg-primary/5 text-primary flex items-center gap-2 select-none uppercase tracking-wider print:hidden">
          <AlertTriangle className="w-4 h-4 text-primary shrink-0" />
          <span><strong>[SYNTHESIS NOTICE]</strong> {synthError.toUpperCase()}</span>
        </div>
      )}

      {/* Tabs Bar - Hidden in print view */}
      <div className="flex border-b border-border gap-6 px-4 print:hidden overflow-x-auto select-none">
        {availableStyles.map(styleName => (
          <button
            key={styleName}
            onClick={() => setActiveTab(styleName)}
            className={`pb-3 whitespace-nowrap text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 border-b-2 transition-all ${
              activeTab === styleName
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-phosphor'
            }`}
          >
            <span>[ {styleName.replace(' MoM', '')} ]</span>
          </button>
        ))}
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-3 whitespace-nowrap text-[10px] font-bold tracking-widest uppercase flex items-center gap-1 border-b-2 transition-all ${
            activeTab === 'transcript'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-phosphor'
          }`}
        >
          <span>[ RAW_TRANSCRIPT ]</span>
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="border border-border bg-card p-6 sm:p-8 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Print Only Formal Executive Header */}
        <div className="hidden print:block mb-8 border-b-2 pb-6 border-zinc-200">
          <div className="flex justify-between items-baseline">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight font-display">{meeting?.title || "Executive Minutes of Meeting"}</h1>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-300">Confidential / Internal PM Record</span>
          </div>
          <p className="text-sm text-zinc-600 mt-3 flex gap-6 font-mono">
            <span><strong>Date:</strong> {new Date(meeting?.created_at || Date.now()).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
            <span><strong>System:</strong> AIMeetingMoM Self-Hosted Engine</span>
            <span><strong>AI Synthesis:</strong> NVIDIA Nemotron-3</span>
          </p>
        </div>

        {activeTab !== 'transcript' ? (
          <div className="print:block">
            {isSynthesizing ? (
              <div className="py-16 text-center space-y-4 select-none">
                <div className="inline-flex p-4 border border-primary bg-primary/5 animate-pulse">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h3 className="text-xs font-bold text-phosphor uppercase">Synthesizing {regenStyle} via Nemotron-3...</h3>
                <p className="text-[10px] text-muted max-w-md mx-auto leading-relaxed">
                  QUERYING TELEMETRY TRANSCRIPT AND EXTRACTING STRATEGIC PM READOUTS.
                </p>
              </div>
            ) : parsedMoMs[activeTab] ? (
              <div className="prose prose-invert prose-sm max-w-none print:prose-neutral print:prose-sm">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <h1 {...props} className="text-xs font-bold text-primary uppercase tracking-widest border-b border-border pb-1 mt-6 mb-3 font-display" />,
                    h2: ({node, ...props}) => <h2 {...props} className="text-[11px] font-bold text-primary uppercase tracking-widest mt-5 mb-2 font-display" />,
                    h3: ({node, ...props}) => <h3 {...props} className="text-[10px] font-bold text-phosphor uppercase mt-4 mb-2" />,
                    p: ({node, ...props}) => <p {...props} className="text-xs text-phosphor leading-relaxed mb-3 font-mono" />,
                    ul: ({node, ...props}) => <ul {...props} className="list-square pl-5 space-y-1 mb-4 text-xs font-mono text-phosphor" />,
                    ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-5 space-y-1 mb-4 text-xs font-mono text-phosphor" />,
                    li: ({node, ...props}) => <li {...props} className="text-phosphor leading-relaxed" />,
                    table: ({node, ...props}) => <table {...props} className="w-full text-left text-[11px] border border-border bg-black border-collapse my-4 font-mono" />,
                    thead: ({node, ...props}) => <thead {...props} className="bg-card border-b border-border text-primary uppercase text-[9px]" />,
                    th: ({node, ...props}) => <th {...props} className="px-3 py-2 border border-border font-bold" />,
                    tr: ({node, ...props}) => <tr {...props} className="hover:bg-black/20 border-b border-border" />,
                    td: ({node, ...props}) => <td {...props} className="px-3 py-2 border border-border text-phosphor" />,
                    code: ({node, ...props}) => <code {...props} className="text-primary bg-black border border-border px-1 py-0.5 text-[10px]" />,
                    a: ({node, ...props}) => {
                      if (props.href && props.href.startsWith('timestamp://')) {
                        const timeStr = props.href.replace('timestamp://', '');
                        const [mins, secs] = timeStr.split(':').map(Number);
                        const totalSeconds = (mins * 60) + (secs || 0);
                        return (
                          <button 
                            onClick={(e) => { e.preventDefault(); handleSeekAudio(totalSeconds); }}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 border border-primary text-primary hover:bg-primary hover:text-black font-mono font-bold text-[9px] transition-colors cursor-pointer select-none uppercase tracking-wider print:hidden"
                            title={`Play audio from ${timeStr}`}
                          >
                            <span>[PLAY: {timeStr}]</span>
                          </button>
                        );
                      }
                      return <a {...props} className="text-primary hover:underline transition-colors font-bold" />;
                    }
                  }}
                >
                  {parsedMoMs[activeTab]}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="p-12 text-center border border-border bg-black/60 text-muted select-none">
                <p className="text-sm font-bold uppercase mb-1">[ NO_MOM_REPORT_GENERATED ]</p>
                <p className="text-[10px]">SELECT STYLE PROFILE AND TRIGGER GENERATOR MODULE.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 print:hidden">
            <div className="flex items-center justify-between border-b border-border pb-3 select-none">
              <h3 className="text-xs font-bold text-phosphor uppercase tracking-wider">
                // RAW_INT8_STT_TELEMETRY
              </h3>
              <span className="text-[9px] text-muted">ZERO_CLOUD_EXPOSURE_CONFIRMED</span>
            </div>
            <pre className="font-mono text-xs leading-relaxed bg-black p-5 border border-border text-phosphor overflow-x-auto whitespace-pre-wrap max-h-[65vh] overflow-y-auto">
              {meeting?.transcript_text || '[No transcript file available for this meeting recording yet.]'}
            </pre>
          </div>
        )}

        {/* Print Only Footer */}
        <div className="hidden print:block mt-12 pt-4 border-t border-gray-300 text-[10px] text-gray-500 text-center font-mono uppercase">
          Generated automatically by AIMeetingMoM — Private Local Audio Processing & BYOK Executive Reasoning
        </div>
      </div>
    </div>
  );
}
