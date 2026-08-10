import React, { useState, useRef } from 'react';
import { uploadAudioChunk } from '../services/api';

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
      // Default meeting title without extension
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

        setChunkStatus(`Transferred chunk ${i + 1} of ${totalChunks} (${(end / (1024 * 1024)).toFixed(1)} MB / ${(file.size / (1024 * 1024)).toFixed(1)} MB)...`);

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
          setChunkStatus('Audio reassembled successfully! STT worker started.');
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
    <div className="max-w-3xl mx-auto my-6 p-8 glass-panel rounded-3xl transition-all duration-300">
      <h2 className="text-3xl font-display font-semibold text-white mb-2">
        Upload Meeting Audio
      </h2>
      <p className="text-sm text-zinc-400 mb-8 font-light">
        Supports long executive meetings (up to multi-hour audio). Automatically sliced into 25MB resilient packets to ensure guaranteed transfer without network timeout.
      </p>

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-glow'
              : 'border-white/10 hover:border-white/20 bg-white/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.webm,.ogg,.flac"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-16 h-16 mx-auto mb-6 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
            <span className="text-3xl">🎙️</span>
          </div>
          <p className="text-zinc-200 font-medium text-lg mb-2">
            Drag & Drop your meeting recording here
          </p>
          <p className="text-sm text-zinc-400 mb-6">
            or <span className="text-primary hover:text-amber-400 transition-colors font-medium cursor-pointer">browse files</span> from your computer
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
            <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5">MP3</span>
            <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5">WAV</span>
            <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5">M4A</span>
            <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5">WEBM</span>
            <span className="px-2 py-1 bg-white/5 rounded-md border border-white/5">FLAC</span>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                ✓
              </div>
              <div>
                <h4 className="text-zinc-200 font-medium truncate max-w-sm">{file.name}</h4>
                <p className="text-xs text-zinc-500 font-medium tracking-wide">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {Math.ceil(file.size / CHUNK_SIZE)} Chunk(s)
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={resetForm}
                className="text-xs text-zinc-400 hover:text-white py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          <div className="mb-8 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">
                Meeting Title / Reference
              </label>
              <input
                type="text"
                disabled={uploading}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Q3 Sprint Planning & Architecture Review"
                className="w-full px-4 py-3 bg-background border border-white/10 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-sm disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-white/5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span>Output MoM Language</span>
                </label>
                <select
                  disabled={uploading}
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-primary transition-colors text-sm disabled:opacity-50 appearance-none"
                >
                  <option value="Bahasa Indonesia (Formal Corporate)">🇮🇩 Bahasa Indonesia (Formal Corporate)</option>
                  <option value="English (Executive Standard)">🇬🇧 English (Executive Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span>Synthesis Style Focus</span>
                </label>
                <select
                  disabled={uploading}
                  value={meetingStyle}
                  onChange={(e) => setMeetingStyle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:border-primary transition-colors text-sm disabled:opacity-50 appearance-none"
                >
                  <option value="General Executive MoM">👔 General Executive (Strategic Insights)</option>
                  <option value="Agile Sprint Retrospective">🚀 Agile Sprint Retro (Velocity & Blockers)</option>
                  <option value="Technical Architecture Spec">🏗️ Tech Architecture Spec (API & Trade-offs)</option>
                  <option value="Sales & Commercials">💼 Sales & Commercials (Pricing & SLAs)</option>
                  <option value="Daily Standup">⏱️ Daily Standup (Yesterday, Today, Blockers)</option>
                  <option value="Brainstorming & Ideation">💡 Brainstorming & Ideation (Raw Ideas & Votes)</option>
                  <option value="User Discovery Interview">🗣️ User Discovery Interview (Pain Points & Quotes)</option>
                  <option value="Journalistic Narrative">📰 Journalistic Narrative (Smooth 5W1H Summary)</option>
                </select>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="my-6 space-y-3">
              <div className="flex justify-between text-xs font-mono font-medium">
                <span className="text-primary animate-pulse">{chunkStatus}</span>
                <span className="text-white">{progress}%</span>
              </div>
              <div className="w-full bg-background h-2 rounded-full overflow-hidden border border-white/5">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300 shadow-glow"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {!uploading && (
            <button
              onClick={startUpload}
              className="w-full py-3.5 bg-primary hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 shadow-glow flex items-center justify-center space-x-2 text-sm uppercase tracking-wider"
            >
              <span>Upload & Process Recording</span>
              <span>➔</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-center space-x-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
