import React, { useState, useRef } from 'react';
import { uploadAudioChunk } from '../services/api';
import { UploadCloud, Check, X, Sparkles, Languages, FileAudio, FileText, ArrowRight, ShieldAlert } from 'lucide-react';

const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB slices to bypass Cloudflare 100MB body limit

const AudioUploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [outputLanguage, setOutputLanguage] = useState('Bahasa Indonesia (Formal Corporate)');
  const [meetingStyle, setMeetingStyle] = useState('General Executive MoM');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [chunkStatus, setChunkStatus] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError('');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    setError('');
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const validTypes = ['.mp3', '.wav', '.m4a', '.aac', '.webm', '.ogg', '.flac'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validTypes.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError(`Unsupported file format. Please upload: ${validTypes.join(', ')}`);
      return;
    }
    setFile(selectedFile);
    if (!meetingTitle) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setMeetingTitle(baseName);
    }
  };

  const startUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError('');
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkSlice = file.slice(start, end);

        setChunkStatus(`Uploading chunk ${i + 1} of ${totalChunks} (${(end / (1024 * 1024)).toFixed(1)} MB / ${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

        const formData = new FormData();
        formData.append('upload_id', uploadId);
        formData.append('chunk_index', i.toString());
        formData.append('total_chunks', totalChunks.toString());
        formData.append('filename', file.name);
        formData.append('title', meetingTitle || 'Untitled Meeting');
        formData.append('output_language', outputLanguage);
        formData.append('meeting_style', meetingStyle);
        formData.append('file_chunk', chunkSlice);

        const response = await uploadAudioChunk(formData, (progressEvent) => {
          if (progressEvent.total) {
            const currentChunkProgress = (progressEvent.loaded / progressEvent.total) / totalChunks;
            const overallProgress = Math.round(((i / totalChunks) + currentChunkProgress) * 100);
            setProgress(Math.min(99, overallProgress));
          }
        });

        if (response.status === 'complete') {
          setProgress(100);
          setChunkStatus('Upload complete. Synthesizing audio data...');
          if (onUploadComplete) {
            onUploadComplete(response.meeting_id, response.task_id);
          }
          break;
        }
      }
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setMeetingTitle('');
    setProgress(0);
    setChunkStatus('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 border border-border bg-card rounded-xl shadow-card transition-all duration-300">
      <div className="flex flex-col select-none border-b border-border pb-4 mb-6">
        <h2 className="text-xl font-serif font-semibold text-primary tracking-tight">
          Capture Audio Meeting
        </h2>
        <p className="text-xs text-accent mt-1 leading-relaxed font-sans">
          Upload recorded discussions for local transcription. Audio files are automatically chunked into 25MB segments to bypass network bandwidth limits.
        </p>
      </div>

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-150 select-none flex flex-col items-center justify-center ${
            isDragging
              ? 'border-primary bg-background scale-[1.01]'
              : 'border-border hover:border-accent/40 bg-background/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.webm,.ogg,.flac"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 mb-4 rounded-full bg-pastel-blue-bg text-pastel-blue-text flex items-center justify-center">
            <UploadCloud size={20} strokeWidth={2.5} />
          </div>
          <p className="text-primary font-bold text-sm tracking-tight mb-1">
            Drag and drop meeting audio here
          </p>
          <p className="text-xs text-accent mb-4">
            or click to browse local files
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-mono tracking-wider">
            <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-2 py-0.5 rounded-full">MP3</span>
            <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-2 py-0.5 rounded-full">WAV</span>
            <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-2 py-0.5 rounded-full">M4A</span>
            <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-2 py-0.5 rounded-full">WEBM</span>
            <span className="bg-pastel-blue-bg text-pastel-blue-text border border-pastel-blue-text/10 px-2 py-0.5 rounded-full">FLAC</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between border border-border p-4 rounded-lg bg-background/50">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-pastel-green-bg text-pastel-green-text flex items-center justify-center shrink-0">
                <FileAudio size={16} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h4 className="text-primary font-sans text-sm font-semibold truncate max-w-[200px] sm:max-w-sm">{file.name}</h4>
                <p className="text-[10px] text-accent font-mono tracking-wide uppercase mt-0.5">
                  Size: {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; Packets: {Math.ceil(file.size / CHUNK_SIZE)}
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={resetForm}
                className="text-xs text-pastel-red-text bg-pastel-red-bg border border-pastel-red-text/10 px-2.5 py-1.5 rounded-md hover:bg-pastel-red-text hover:text-white transition-colors flex items-center gap-1 font-semibold"
              >
                <X size={12} strokeWidth={2.5} /> Remove
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-primary mb-1 select-none font-sans uppercase tracking-wider">
                Meeting Title
              </label>
              <input
                type="text"
                disabled={uploading}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Weekly Product Sync"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-primary placeholder-accent/40 focus:outline-none focus:border-primary transition-all text-xs disabled:opacity-50 font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-primary mb-1 select-none font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <Languages size={12} strokeWidth={2.5} className="text-accent" />
                  Output Language
                </label>
                <select
                  disabled={uploading}
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-primary focus:outline-none focus:border-primary transition-colors text-xs disabled:opacity-50 font-sans"
                >
                  <option value="Bahasa Indonesia (Formal Corporate)">Bahasa Indonesia (Formal)</option>
                  <option value="English (Executive Standard)">English (Executive)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1 select-none font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={12} strokeWidth={2.5} className="text-accent" />
                  Meeting Style Focus
                </label>
                <select
                  disabled={uploading}
                  value={meetingStyle}
                  onChange={(e) => setMeetingStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-primary focus:outline-none focus:border-primary transition-colors text-xs disabled:opacity-50 font-sans"
                >
                  <option value="General Executive MoM">General Executive MoM</option>
                  <option value="Agile Sprint Retrospective">Agile Sprint Retro</option>
                  <option value="Technical Architecture Spec">Technical Arch Spec</option>
                  <option value="Sales & Commercials">Sales & Commercials</option>
                  <option value="Daily Standup">Daily Standup</option>
                  <option value="Brainstorming & Ideation">Brainstorming & Ideation</option>
                  <option value="User Discovery Interview">User Discovery Interview</option>
                  <option value="Journalistic Narrative">Journalistic Narrative</option>
                </select>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="my-4 space-y-2 border-t border-border pt-4 select-none">
              <div className="flex justify-between text-xs">
                <span className="text-accent">{chunkStatus}</span>
                <span className="text-primary font-bold font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-background border border-border h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!uploading && (
            <button
              onClick={startUpload}
              className="w-full py-3 bg-primary hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 rounded-md select-none active:scale-98"
            >
              <span>Process Audio & Synthesize MoM</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 border border-pastel-red-text/20 bg-pastel-red-bg text-pastel-red-text text-xs rounded-md flex items-start gap-2 select-none">
          <ShieldAlert size={14} strokeWidth={2.5} className="shrink-0 text-pastel-red-text" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
