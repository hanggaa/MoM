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
    <div className="max-w-3xl mx-auto my-6 p-6 border border-border bg-card transition-all duration-300">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4 select-none">
        <h2 className="text-lg font-display font-bold text-phosphor uppercase tracking-wider">
          [02] AUDIO_CAPTURE_STAGE
        </h2>
        <span className="text-[9px] font-mono text-primary">// RESILIENT PACKET TRANSMITTER</span>
      </div>
      <p className="text-xs text-muted mb-6 font-mono leading-relaxed">
        Supports long executive meeting audio. Files are sliced into 25MB packets to ensure guaranteed local transmission bypassing network constraints.
      </p>

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed p-10 text-center cursor-pointer transition-all duration-150 select-none ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 bg-black/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.m4a,.aac,.webm,.ogg,.flac"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 mx-auto mb-4 border border-border flex items-center justify-center bg-black text-primary font-mono text-xs font-bold">
            [REC]
          </div>
          <p className="text-phosphor font-bold text-xs uppercase tracking-widest mb-1.5">
            DRAG & DROP RECORDING HERE
          </p>
          <p className="text-[10px] text-muted mb-4 font-mono">
            OR CLICK TO QUERY LOCAL DIRECTORY
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 text-[9px] text-muted uppercase tracking-widest font-mono">
            <span>[MP3]</span>
            <span>[WAV]</span>
            <span>[M4A]</span>
            <span>[WEBM]</span>
            <span>[FLAC]</span>
          </div>
        </div>
      ) : (
        <div className="border border-border bg-black/40 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border border-green text-green flex items-center justify-center font-mono font-bold text-xs bg-black select-none">
                OK
              </div>
              <div className="min-w-0">
                <h4 className="text-phosphor font-mono text-xs font-bold truncate max-w-[200px] sm:max-w-sm">{file.name}</h4>
                <p className="text-[10px] text-muted font-mono tracking-wider uppercase mt-0.5">
                  SIZE: {(file.size / (1024 * 1024)).toFixed(2)} MB // PACKETS: {Math.ceil(file.size / CHUNK_SIZE)}
                </p>
              </div>
            </div>
            {!uploading && (
              <button
                onClick={resetForm}
                className="text-[10px] text-primary hover:text-white py-1 px-3 border border-primary/40 hover:border-primary bg-black font-mono font-bold uppercase transition-colors"
              >
                [REMOVE]
              </button>
            )}
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 select-none">
                // MEETING_TITLE_DESCRIPTOR
              </label>
              <input
                type="text"
                disabled={uploading}
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Q3 Sprint Planning"
                className="w-full px-3 py-2 bg-black border border-border text-phosphor placeholder-zinc-700 focus:outline-none focus:border-primary transition-all text-xs disabled:opacity-50 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 select-none">
                  // OUTPUT_TRANSLATION
                </label>
                <select
                  disabled={uploading}
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-border text-phosphor focus:outline-none focus:border-primary transition-colors text-xs disabled:opacity-50 font-mono appearance-none"
                >
                  <option value="Bahasa Indonesia (Formal Corporate)">INDONESIAN (FORMAL)</option>
                  <option value="English (Executive Standard)">ENGLISH (EXECUTIVE)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-1.5 select-none">
                  // SYNTHESIS_TEMPLATE
                </label>
                <select
                  disabled={uploading}
                  value={meetingStyle}
                  onChange={(e) => setMeetingStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-border text-phosphor focus:outline-none focus:border-primary transition-colors text-xs disabled:opacity-50 font-mono appearance-none"
                >
                  <option value="General Executive MoM">GENERAL EXECUTIVE MOM</option>
                  <option value="Agile Sprint Retrospective">AGILE SPRINT RETROSPECTIVE</option>
                  <option value="Technical Architecture Spec">TECHNICAL ARCHITECTURE SPEC</option>
                  <option value="Sales & Commercials">SALES & COMMERCIALS</option>
                  <option value="Daily Standup">DAILY STANDUP</option>
                  <option value="Brainstorming & Ideation">BRAINSTORMING & IDEATION</option>
                  <option value="User Discovery Interview">USER DISCOVERY INTERVIEW</option>
                  <option value="Journalistic Narrative">JOURNALISTIC NARRATIVE</option>
                </select>
              </div>
            </div>
          </div>

          {uploading && (
            <div className="my-4 space-y-2 border-t border-border pt-4 select-none">
              <div className="flex justify-between text-[10px] font-mono font-bold">
                <span className="text-primary animate-pulse">{chunkStatus.toUpperCase()}</span>
                <span className="text-phosphor">{progress}%</span>
              </div>
              {/* Telemetry style progress bar */}
              <div className="w-full bg-black h-4 border border-border flex items-center px-1 font-mono text-[10px]">
                <div 
                  className="bg-primary h-2 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
                <span className="ml-2 text-primary font-bold">
                  {Math.round(progress / 5) > 0 ? '█'.repeat(Math.round(progress / 5)) : ''}
                  {'.'.repeat(20 - Math.round(progress / 5))}
                </span>
              </div>
            </div>
          )}

          {!uploading && (
            <button
              onClick={startUpload}
              className="w-full py-3 bg-primary hover:bg-red-500 text-black font-bold text-xs uppercase tracking-widest transition-all duration-150 flex items-center justify-center gap-2 select-none"
            >
              <span>[ COMMENCE TRANSMISSION & EXTRACTION ]</span>
              <span>➔</span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 border border-primary bg-primary/5 text-primary text-xs font-mono flex items-start gap-2 select-none">
          <span className="font-bold">[ ERROR ]</span>
          <span>{error.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
