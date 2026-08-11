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
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 print:max-w-none print:m-0 print:p-0 font-sans text-sm text-primary">
      {/* Header Bar - Hidden in print view */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 border border-border bg-card p-6 rounded-xl shadow-card print:hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap select-none">
            <button 
              onClick={onReset} 
              className="px-3 py-1.5 border border-border hover:border-accent bg-card hover:bg-background text-accent hover:text-primary transition-all rounded-md flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
            <span className="inline-flex items-center gap-1.5 bg-pastel-green-bg text-pastel-green-text border border-pastel-green-text/10 text-[9px] px-2.5 py-1 rounded-full font-bold font-mono tracking-wider uppercase">
              <ShieldCheck className="w-3 h-3 text-pastel-green-text shrink-0" strokeWidth={2.5} /> Local & Secure CPU Engine
            </span>
          </div>
          <h1 className="text-2xl font-serif text-primary tracking-tight pt-1 leading-tight">{meeting?.title || "Project Discussion Record"}</h1>
          <p className="text-xs text-accent flex items-center gap-2 select-none">
            <span>Index: #{meeting?.id}</span> &bull; 
            <span>Recorded: {meeting?.created_at ? new Date(meeting.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'Pending'}</span>
          </p>
        </div>

        {/* Action & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5 select-none">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border hover:bg-background text-primary text-xs font-semibold rounded-md transition-colors"
            title="Copy Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-pastel-green-text" strokeWidth={2.5} /> : <Copy className="w-3.5 h-3.5 text-accent" strokeWidth={2.5} />}
            <span>{copied ? 'Copied' : 'Copy MD'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border hover:bg-background text-primary text-xs font-semibold rounded-md transition-colors"
            title="Download Markdown file"
          >
            <Download className="w-3.5 h-3.5 text-pastel-blue-text" strokeWidth={2.5} />
            <span>Download .md</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-zinc-800 text-white font-semibold text-xs rounded-md transition-colors active:scale-98"
            title="Print to PDF"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span>Export PDF</span>
          </button>

          <div className="flex items-center gap-2 bg-background border border-border rounded-md p-1 pl-2">
            <select
              value={regenStyle}
              onChange={(e) => setRegenStyle(e.target.value)}
              className="bg-transparent text-primary text-xs font-semibold py-1 focus:outline-none appearance-none cursor-pointer font-sans"
            >
              <option value="General Executive MoM">General Executive</option>
              <option value="Agile Sprint Retro">Agile Sprint Retro</option>
              <option value="Tech Architecture Spec">Technical Arch Spec</option>
              <option value="Sales & Commercials">Sales & Commercials</option>
              <option value="Daily Standup">Daily Standup</option>
              <option value="Brainstorming & Ideation">Brainstorming</option>
              <option value="User Discovery Interview">User Discovery</option>
              <option value="Journalistic Narrative">Narrative</option>
            </select>
            <button
              onClick={handleReSynthesize}
              disabled={isSynthesizing}
              className="inline-flex items-center justify-center p-1.5 border border-border bg-card hover:bg-background text-accent hover:text-primary transition-colors disabled:opacity-50 rounded-md"
              title="Generate new style"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Local Audio Playback Review Bar - Hidden in print view */}
      {meeting?.id && (
        <div className="border border-border bg-card p-5 rounded-xl shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-pastel-blue-bg text-pastel-blue-text shrink-0 select-none">
              <Volume2 className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-primary">STT Audio Monitor</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-pastel-blue-bg text-pastel-blue-text rounded-full select-none">
                  Disk Stream
                </span>
              </div>
              <p className="text-xs text-accent font-light select-none">Direct file streaming synchronized with clickable segment timestamps.</p>
            </div>
          </div>
          <audio
            ref={audioRef}
            controls
            src={getMeetingAudioUrl(meeting.id)}
            className="w-full sm:w-72 md:w-96 h-10 bg-background rounded-md text-primary"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {synthError && (
        <div className="p-4 border border-pastel-red-text/20 bg-pastel-red-bg text-pastel-red-text text-xs rounded-md flex items-center gap-2 select-none print:hidden">
          <AlertTriangle className="w-4 h-4 text-pastel-red-text shrink-0" strokeWidth={2.5} />
          <span><strong>Synthesis Notice:</strong> {synthError}</span>
        </div>
      )}

      {/* Tabs Bar - Hidden in print view */}
      <div className="flex border-b border-border gap-6 px-4 print:hidden overflow-x-auto select-none">
        {availableStyles.map(styleName => (
          <button
            key={styleName}
            onClick={() => setActiveTab(styleName)}
            className={`pb-3 whitespace-nowrap text-xs font-bold tracking-wide border-b-2 transition-all ${
              activeTab === styleName
                ? 'border-primary text-primary'
                : 'border-transparent text-accent hover:text-primary'
            }`}
          >
            <span>{styleName.replace(' MoM', '')}</span>
          </button>
        ))}
        <button
          onClick={() => setActiveTab('transcript')}
          className={`pb-3 whitespace-nowrap text-xs font-bold tracking-wide border-b-2 transition-all ${
            activeTab === 'transcript'
              ? 'border-primary text-primary'
              : 'border-transparent text-accent hover:text-primary'
          }`}
        >
          <span>Raw Transcript</span>
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="border border-border bg-card p-8 sm:p-12 rounded-xl shadow-card print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
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
                <div className="inline-flex p-4 rounded-full bg-pastel-blue-bg text-pastel-blue-text animate-pulse">
                  <RefreshCw className="w-8 h-8 text-pastel-blue-text animate-spin" strokeWidth={2.5} />
                </div>
                <h3 className="text-sm font-semibold text-primary">Synthesizing {regenStyle} via Nemotron-3...</h3>
                <p className="text-xs text-accent max-w-sm mx-auto leading-relaxed">
                  Extracting relevant insights from transcript based on the selected style template.
                </p>
              </div>
            ) : parsedMoMs[activeTab] ? (
              <div className="prose prose-sm max-w-none print:prose-neutral">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <h1 {...props} className="text-xl font-serif text-primary font-normal tracking-tight border-b border-border pb-2 mt-8 mb-4" />,
                    h2: ({node, ...props}) => <h2 {...props} className="text-lg font-serif text-primary font-semibold tracking-tight mt-6 mb-3" />,
                    h3: ({node, ...props}) => <h3 {...props} className="text-sm font-bold text-primary mt-5 mb-2" />,
                    p: ({node, ...props}) => <p {...props} className="text-sm text-primary leading-relaxed mb-4 font-sans" />,
                    ul: ({node, ...props}) => <ul {...props} className="list-disc pl-5 space-y-1.5 mb-4 text-sm font-sans text-primary" />,
                    ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-5 space-y-1.5 mb-4 text-sm font-sans text-primary" />,
                    li: ({node, ...props}) => <li {...props} className="text-primary leading-relaxed" />,
                    table: ({node, ...props}) => <table {...props} className="w-full text-left text-xs border border-border bg-card border-collapse my-6 font-sans" />,
                    thead: ({node, ...props}) => <thead {...props} className="bg-background border-b border-border text-primary uppercase text-[10px] tracking-wider font-bold" />,
                    th: ({node, ...props}) => <th {...props} className="px-4 py-3 border border-border font-bold text-primary" />,
                    tr: ({node, ...props}) => <tr {...props} className="hover:bg-background border-b border-border transition-colors" />,
                    td: ({node, ...props}) => <td {...props} className="px-4 py-3 border border-border text-primary" />,
                    code: ({node, ...props}) => <code {...props} className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-1.5 py-0.5 rounded font-mono text-[11px]" />,
                    a: ({node, ...props}) => {
                      if (props.href && props.href.startsWith('timestamp://')) {
                        const timeStr = props.href.replace('timestamp://', '');
                        const [mins, secs] = timeStr.split(':').map(Number);
                        const totalSeconds = (mins * 60) + (secs || 0);
                        return (
                          <button 
                            onClick={(e) => { e.preventDefault(); handleSeekAudio(totalSeconds); }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 mx-1 bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 rounded-full font-mono text-[10px] font-bold hover:bg-pastel-blue-text hover:text-white transition-colors cursor-pointer select-none"
                            title={`Play audio from ${timeStr}`}
                          >
                            <Clock size={10} strokeWidth={2.5} className="shrink-0" />
                            <span>{timeStr}</span>
                          </button>
                        );
                      }
                      return <a {...props} className="text-pastel-blue-text hover:underline transition-colors font-bold" />;
                    }
                  }}
                >
                  {parsedMoMs[activeTab]}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="p-12 text-center border border-border bg-background text-accent rounded-lg select-none">
                <p className="text-sm font-bold mb-1">No Minutes Generated</p>
                <p className="text-xs text-accent">Select a style template and trigger generation module.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 print:hidden">
            <div className="flex items-center justify-between border-b border-border pb-3 select-none">
              <h3 className="text-sm font-semibold text-primary">
                Raw STT Transcription
              </h3>
              <span className="text-[10px] text-accent">Local processing &bull; Zero external API leakage</span>
            </div>
            <pre className="font-mono text-xs leading-relaxed bg-background p-6 border border-border text-primary rounded-lg overflow-x-auto whitespace-pre-wrap max-h-[65vh] overflow-y-auto">
              {meeting?.transcript_text || 'No transcript file available for this meeting recording yet.'}
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
