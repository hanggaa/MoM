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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 shadow-2xl space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 flex items-center gap-2.5">
              <Archive size={24} className="text-cyan-400 shrink-0" />
              <span>Executive MoM Archive & Smart Disk Cleanup</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Search across meeting titles, action items, and executive summaries. Use Smart Archive to delete large raw audio files while keeping text reports intact.
            </p>
          </div>

          {/* Live Search Box */}
          <div className="relative min-w-[280px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, PIC, keyword, topic..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
            />
            {loading && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" />}
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 animate-fade-in shadow-lg">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Meetings Grid / Table */}
        {!loading && meetings.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <p className="text-lg">📭 No matching executive meetings found in server archive.</p>
            {searchTerm && <p className="text-xs text-slate-600">Try refining your keyword search filter.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {meetings.map((m) => {
              const isArchived = m.is_audio_archived;
              const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently Processed';
              
              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenMeeting(m.id)}
                  className="group relative p-6 rounded-2xl bg-slate-950/50 hover:bg-slate-950 border border-slate-800/80 hover:border-cyan-500/50 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/5 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Status Pills */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                        m.status === 'DONE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : m.status === 'ERROR'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                      }`}>
                        {m.status === 'DONE' ? '✓ Synthesized' : m.status}
                      </span>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Calendar size={12} />
                        <span>{dateStr}</span>
                      </div>
                    </div>

                    {/* Title & Style */}
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {m.title || `Meeting #${m.id}`}
                    </h3>

                    <div className="flex flex-wrap gap-2 my-2.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-medium text-cyan-400">
                        🌐 {m.output_language || 'English'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-medium text-emerald-400">
                        🎯 {m.meeting_style || 'Executive MoM'}
                      </span>
                    </div>

                    {/* Snippet Preview */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal mt-2">
                      {getMoMPreview(m)}
                    </p>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="pt-4 mt-4 border-t border-slate-900 flex items-center justify-between text-xs">
                    {/* Audio Status / Smart Archive Button */}
                    <div>
                      {!isArchived && m.audio_file_path ? (
                        <button
                          type="button"
                          onClick={(e) => handlePurgeAudio(e, m.id, m.title)}
                          disabled={actionLoading === `purge_${m.id}`}
                          title="Purge raw audio file to free up server disk space while retaining MoM text"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/30 transition-all text-[11px] font-semibold"
                        >
                          {actionLoading === `purge_${m.id}` ? <Loader2 size={13} className="animate-spin" /> : <HardDrive size={13} className="text-amber-400" />}
                          <span>Smart Archive (Purge Audio)</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-xl border border-slate-900">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span>Audio Purged &bull; Disk Saved</span>
                        </span>
                      )}
                    </div>

                    {/* View & Delete Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEntirely(e, m.id, m.title)}
                        disabled={actionLoading === `del_${m.id}`}
                        className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all"
                        title="Delete meeting entirely"
                      >
                        {actionLoading === `del_${m.id}` ? <Loader2 size={14} className="animate-spin text-rose-400" /> : <Trash2 size={14} />}
                      </button>

                      <span className="inline-flex items-center gap-1 font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors text-xs pl-1">
                        <span>Read MoM</span>
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
