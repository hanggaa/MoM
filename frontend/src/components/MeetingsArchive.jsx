import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, HardDrive, Calendar, Loader2, CheckCircle2, Archive, AlertCircle } from 'lucide-react';
import { listMeetings, purgeMeetingAudio, deleteMeeting, getMeetingDetails } from '../services/api';

const getMoMPreview = (m) => {
  if (!m.mom_data) return 'No MoM summary generated yet...';
  try {
    const parsed = typeof m.mom_data === 'string' ? JSON.parse(m.mom_data) : m.mom_data;
    if (parsed && typeof parsed === 'object') {
      const style = m.meeting_style || 'Executive Summary';
      const content = parsed[style] || Object.values(parsed)[0] || '';
      return String(content).replace(/#/g, '').replace(/\|/g, '').replace(/\*/g, '').substring(0, 150) + '...';
    }
  } catch (e) {
    // Legacy markdown
  }
  return String(m.mom_data).replace(/#/g, '').replace(/\|/g, '').replace(/\*/g, '').substring(0, 150) + '...';
};

const MeetingsArchive = ({ onSelectMeeting }) => {
  const [meetings, setMeetings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  const fetchMeetings = useCallback(async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await listMeetings(query);
      setMeetings(data || []);
    } catch (err) {
      console.error('Failed to load meetings archive:', err);
      setError(err.message || 'Could not load meetings archive.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMeetings(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchMeetings]);

  const handlePurgeAudio = async (e, meetingId, title) => {
    e.stopPropagation();
    if (!window.confirm(`Smart Archive: Are you sure you want to delete the raw audio file for "${title}" from the disk? The generated Executive MoM notes and action items will remain safely stored.`)) {
      return;
    }

    setActionLoading(`purge_${meetingId}`);
    try {
      const res = await purgeMeetingAudio(meetingId);
      setNotification(res.message || 'Audio file purged from server storage successfully.');
      setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, is_audio_archived: true, audio_file_path: null } : m));
      setTimeout(() => setNotification(''), 3500);
    } catch (err) {
      alert('Failed to purge audio file: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteEntirely = async (e, meetingId, title) => {
    e.stopPropagation();
    if (!window.confirm(`Permanently delete the entire record and all associated files for "${title}"?`)) {
      return;
    }

    setActionLoading(`del_${meetingId}`);
    try {
      const res = await deleteMeeting(meetingId);
      setNotification(res.message || 'Meeting record deleted completely.');
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      setTimeout(() => setNotification(''), 3500);
    } catch (err) {
      alert('Failed to delete meeting: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenMeeting = async (meetingId) => {
    try {
      setActionLoading(`view_${meetingId}`);
      const details = await getMeetingDetails(meetingId);
      onSelectMeeting(details);
    } catch (err) {
      alert('Could not load meeting details: ' + (err.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-mono text-xs">
      <div className="p-6 border border-border bg-card">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="select-none">
            <h2 className="text-md font-display font-bold text-phosphor flex items-center gap-2 uppercase">
              <span>[04] ARCHIVED_RECORDS_REGISTRY</span>
            </h2>
            <p className="text-[10px] text-muted mt-1 uppercase leading-relaxed">
              Global query across meeting indices. Use Smart Archive to purge raw binary audio files while preserving synthesized telemetry.
            </p>
          </div>

          {/* Live Search Box */}
          <div className="relative min-w-[280px]">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="SEARCH INDEX..."
              className="w-full pl-9 pr-4 py-2 bg-black border border-border text-xs text-phosphor placeholder-zinc-700 focus:outline-none focus:border-primary transition-all font-mono"
            />
            {loading && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" />}
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="mt-4 p-4 border border-green bg-green/5 text-green text-[10px] font-bold flex items-center gap-2 select-none uppercase tracking-widest">
            <span>[ SYSTEM: {notification.toUpperCase()} ]</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 border border-primary bg-primary/5 text-primary text-[10px] font-bold flex items-center gap-2 select-none uppercase tracking-widest">
            <span>[ ERROR: {error.toUpperCase()} ]</span>
          </div>
        )}

        {/* Meetings Grid / Table */}
        {!loading && meetings.length === 0 ? (
          <div className="py-12 text-center text-muted space-y-2 select-none">
            <p className="text-sm font-bold">[ NO_RECORDS_DETECTED ]</p>
            {searchTerm && <p className="text-[10px]">Try redefining your query keyword parameters.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px border border-border bg-border mt-4">
            {meetings.map((m) => {
              const isArchived = m.is_audio_archived;
              const dateStr = m.created_at ? new Date(m.created_at).toISOString().replace('T', ' ').substring(0, 16) : 'PENDING';
              
              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenMeeting(m.id)}
                  className="group relative p-5 bg-card hover:bg-black/30 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Status Pills */}
                    <div className="flex items-center justify-between gap-2 mb-4 select-none">
                      <span className={`px-2 py-0.5 border text-[9px] font-bold tracking-widest uppercase ${
                        m.status === 'DONE'
                          ? 'bg-black text-green border-green'
                          : m.status === 'ERROR'
                          ? 'bg-black text-primary border-primary'
                          : 'bg-black text-primary border-primary animate-pulse'
                      }`}>
                        {m.status === 'DONE' ? 'SYNTHESIZED' : m.status}
                      </span>

                      <div className="flex items-center gap-1 text-[10px] text-muted font-mono">
                        <span>TIMESTAMP: {dateStr}</span>
                      </div>
                    </div>

                    {/* Title & Style */}
                    <h3 className="text-sm font-bold text-phosphor group-hover:text-primary transition-colors line-clamp-1 uppercase tracking-wider font-display">
                      {m.title || `MEETING_${m.id}`}
                    </h3>

                    <div className="flex flex-wrap gap-2 my-3 select-none">
                      <span className="px-2 py-0.5 border border-border bg-black text-[9px] font-bold text-muted">
                        LANG: {m.output_language ? m.output_language.split(' ')[0].toUpperCase() : 'UNKNOWN'}
                      </span>
                      <span className="px-2 py-0.5 border border-border bg-black text-[9px] font-bold text-green">
                        FOCUS: {m.meeting_style ? m.meeting_style.toUpperCase() : 'EXECUTIVE'}
                      </span>
                    </div>

                    {/* Snippet Preview */}
                    <p className="text-xs text-muted line-clamp-2 leading-relaxed mt-3">
                      {getMoMPreview(m).toUpperCase()}
                    </p>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-4 mt-5 border-t border-border flex items-center justify-between text-[10px]">
                    {/* Audio Status / Smart Archive Button */}
                    <div>
                      {!isArchived && m.audio_file_path ? (
                        <button
                          type="button"
                          onClick={(e) => handlePurgeAudio(e, m.id, m.title)}
                          disabled={actionLoading === `purge_${m.id}`}
                          title="Purge raw audio file to save disk space"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-primary/40 hover:border-primary bg-black text-primary font-bold uppercase transition-colors"
                        >
                          {actionLoading === `purge_${m.id}` ? <Loader2 size={10} className="animate-spin" /> : <HardDrive size={10} />}
                          <span>[PURGE_AUDIO]</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-muted border border-border bg-black px-2.5 py-1 select-none">
                          <CheckCircle2 size={10} className="text-green" />
                          <span>[AUDIO_PURGED]</span>
                        </span>
                      )}
                    </div>

                    {/* View & Delete Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEntirely(e, m.id, m.title)}
                        disabled={actionLoading === `del_${m.id}`}
                        className="p-1 border border-border hover:border-primary/60 bg-black text-muted hover:text-primary transition-all"
                        title="Delete record entirely"
                      >
                        {actionLoading === `del_${m.id}` ? <Loader2 size={12} className="animate-spin text-primary" /> : <Trash2 size={12} />}
                      </button>

                      <span className="inline-flex items-center gap-1 font-bold text-primary group-hover:text-red-500 transition-colors pl-1">
                        <span>[READ_REPORT]</span>
                        <span>➔</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingsArchive;
