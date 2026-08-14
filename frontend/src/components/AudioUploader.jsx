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
    <div className="max-w-2xl mx-auto my-8 border-2 border-border bg-card p-6 sm:p-10 select-none">
      <div className="flex flex-col select-none border-b-2 border-border pb-4 mb-6">
        <h2 className="text-lg font-mono font-black text-white tracking-widest uppercase">
          // CAPTURE_AUDIO_DISCUSSIONS
        </h2>
        <p className="text-[10px] text-muted mt-1 leading-relaxed font-mono">
          UPLOAD RAW DATA STREAMS. BACKGROUND BINARY SLICING (25MB QUANTUM SIZE) PREVENTS GATEWAY TIMEOUT DURING CONVERSION.
        </p>
      </div>

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed p-10 text-center cursor-pointer transition-colors select-none flex flex-col items-center justify-center rounded-none ${
            isDragging
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-accent/40 bg-background'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.webm,.ogg,.flac"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 mb-4 bg-white/5 border border-border text-white flex items-center justify-center rounded-none">
            <UploadCloud size={20} strokeWidth={2} />
          </div>
          <p className="text-white font-bold text-xs tracking-widest mb-1 font-mono uppercase">
            [ SELECT MEETING AUDIO FILE ]
          </p>
          <p className="text-[10px] text-muted mb-4 font-mono font-light">
            DRAG AND DROP OR BROWSE LOCAL DIRECTORIES
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 text-[9px] font-mono tracking-wider text-muted">
            <span>MP3 // WAV // M4A // WEBM // FLAC</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6 font-mono">
          <div className="flex items-center justify-between border border-border p-4 bg-background">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 bg-white/5 border border-border text-white flex items-center justify-center shrink-0">
                <FileAudio size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h4 className="text-white text-xs font-bold truncate max-w-[200px] sm:max-w-sm uppercase">{file.name}</h4>
                <p className="text-[9px] text-muted tracking-widest uppercase mt-0.5">
                  SIZE: {(file.size / (1024 * 1024)).toFixed(2)} MB &bull; SECTORS: {Math.ceil(file.size / CHUNK_SIZE)}
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={resetForm}
                className="text-[10px] text-accent border border-accent bg-[#2a0505] px-3 py-1.5 hover:bg-accent hover:text-white transition-colors font-bold uppercase"
              >
                [ PURGE ]
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-white mb-1.5 select-none uppercase tracking-widest">
                // META_TITLE
              </label>
              <input
                type="text"
                disabled={uploading}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="E.G. WEEKLY PRODUCT ARCHITECTURE SYNC"
                className="w-full px-3 py-2 bg-background border border-border text-white placeholder-muted/30 focus:outline-none focus:border-accent transition-all text-xs disabled:opacity-50 font-mono rounded-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-white mb-1.5 select-none uppercase tracking-widest">
                  // OUTPUT_LANG
                </label>
                <select
                  disabled={uploading}
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border text-white focus:outline-none focus:border-accent text-xs disabled:opacity-50 font-mono cursor-pointer rounded-none"
                >
                  <option value="Bahasa Indonesia (Formal Corporate)">BAHASA INDONESIA (FORMAL)</option>
                  <option value="English (Executive Standard)">ENGLISH (EXECUTIVE)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white mb-1.5 select-none uppercase tracking-widest">
                  // MO_TEMPLATE
                </label>
                <select
                  disabled={uploading}
                  value={meetingStyle}
                  onChange={(e) => setMeetingStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border text-white focus:outline-none focus:border-accent text-xs disabled:opacity-50 font-mono cursor-pointer rounded-none"
                >
                  <option value="General Executive MoM">GENERAL EXECUTIVE</option>
                  <option value="Agile Sprint Retrospective">AGILE RETRO</option>
                  <option value="Technical Architecture Spec">TECH ARCH SPEC</option>
                  <option value="Sales & Commercials">SALES & COMMERCIALS</option>
                  <option value="Daily Standup">DAILY STANDUP</option>
                  <option value="Brainstorming & Ideation">BRAINSTORM</option>
                  <option value="User Discovery Interview">USER DISCOVERY</option>
                  <option value="Journalistic Narrative">JOURNALISTIC NARRATIVE</option>
                </select>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="my-4 space-y-2 border-t border-border pt-4 select-none">
              <div className="flex justify-between text-[10px]">
                <span className="text-muted uppercase font-bold">{chunkStatus}</span>
                <span className="text-white font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-[#0A0A0A] border border-border h-3 overflow-hidden rounded-none">
                <div 
                  className="bg-accent h-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!uploading && (
            <button
              onClick={startUpload}
              className="group w-full py-3 bg-accent text-white font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 rounded-none active:translate-x-[1px] active:translate-y-[1px]"
            >
              <span>[ RUN_COMPILATION_AND_SYNTHESIS ]</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 border border-accent bg-[#2a0505] text-accent text-xs rounded-none flex items-start gap-2 select-none font-mono">
          <ShieldAlert size={14} strokeWidth={2} className="shrink-0 text-accent" />
          <span>ERROR // {error.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
