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
    <div className="max-w-3xl mx-auto my-6 p-8 bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-xl transition-all duration-300">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300 mb-2">
        Upload Meeting Audio
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        Supports long executive meetings (up to multi-hour audio). Automatically sliced into 25MB resilient packets to ensure guaranteed transfer without network timeout.
      </p>

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/20 scale-102 shadow-[0_0_25px_rgba(34,211,238,0.2)]'
              : 'border-slate-600 hover:border-slate-500 bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.webm,.ogg,.flac"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 rounded-full flex items-center justify-center border border-cyan-500/30">
            <span className="text-2xl">🎙️</span>
          </div>
          <p className="text-slate-200 font-medium text-lg mb-1">
            Drag & Drop your meeting recording here
          </p>
          <p className="text-xs text-slate-400 mb-4">
            or <span className="text-cyan-400 underline decoration-cyan-400/40 font-semibold">browse files</span> from your computer
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-[11px] text-slate-500 uppercase font-mono">
            <span>• MP3</span>
            <span>• WAV</span>
            <span>• M4A</span>
            <span>• WEBM</span>
            <span>• FLAC</span>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                ✓
              </div>
              <div>
                <h4 className="text-slate-200 font-medium truncate max-w-sm">{file.name}</h4>
                <p className="text-xs text-slate-400 font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • {Math.ceil(file.size / CHUNK_SIZE)} Chunk(s)
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={resetForm}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline py-1 px-3 bg-rose-500/10 border border-rose-500/20 rounded-md transition"
              >
                Remove
              </button>
            )}
          </div>

          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Meeting Title / Reference
              </label>
              <input
                type="text"
                disabled={uploading}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Q3 Sprint Planning & Architecture Review"
                className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition text-sm disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>🌐 Output MoM Language</span>
                </label>
                <select
                  disabled={uploading}
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-cyan-400 transition text-xs disabled:opacity-50"
                >
                  <option value="Bahasa Indonesia (Formal Corporate)">🇮🇩 Bahasa Indonesia (Formal Corporate)</option>
                  <option value="English (Executive Standard)">🇬🇧 English (Executive Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>🎯 Synthesis Style Focus</span>
                </label>
                <select
                  disabled={uploading}
                  value={meetingStyle}
                  onChange={(e) => setMeetingStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-400 transition text-xs disabled:opacity-50"
                >
                  <option value="General Executive MoM">👔 General Executive (Strategic Insights)</option>
                  <option value="Agile Sprint Retrospective">🚀 Agile Sprint Retro (Velocity & Blockers)</option>
                  <option value="Technical Architecture Spec">🏗️ Tech Architecture Spec (API & Trade-offs)</option>
                  <option value="Sales & Commercials">💼 Sales & Commercials (Pricing & SLAs)</option>
                </select>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="my-4 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-cyan-400 animate-pulse">{chunkStatus}</span>
                <span className="text-slate-200 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {!uploading && (
            <button
              onClick={startUpload}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl transition duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 text-sm uppercase tracking-wide"
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
