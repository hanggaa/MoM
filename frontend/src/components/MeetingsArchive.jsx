import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, HardDrive, Calendar, Loader2, CheckCircle2, Archive, AlertCircle, ArrowRight } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto p-2 bg-white/5 border border-white/10 rounded-[2.5rem] shadow-card">
      <div className="bg-card p-6 sm:p-8 rounded-[calc(2.5rem-0.5rem)] shadow-inner">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="select-none">
            <h2 className="text-xl font-serif font-semibold text-white tracking-tight">
              Archived Meetings Registry
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed max-w-2xl font-light">
              Query past discussion documents. Purge raw binary audio to reclaim server storage while keeping synthesized meeting minutes.
            </p>
          </div>

          {/* Live Search Box */}
          <div className="relative min-w-[280px]">
            <Search size={12} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search meetings..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-border rounded-lg text-xs text-white placeholder-muted/30 focus:outline-none focus:border-white/20 transition-all font-sans"
            />
            {loading && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white animate-spin" />}
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className="mt-4 p-4 border border-pastel-green-text/20 bg-pastel-green-bg text-pastel-green-text text-xs rounded-md flex items-center gap-2 select-none font-sans font-semibold">
            <span>{notification}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 border border-pastel-red-text/20 bg-pastel-red-bg text-pastel-red-text text-xs rounded-md flex items-center gap-2 select-none font-sans font-semibold">
            <span>{error}</span>
          </div>
        )}

        {/* Meetings Grid */}
        {!loading && meetings.length === 0 ? (
          <div className="py-12 text-center text-muted space-y-2 select-none font-sans font-light">
            <p className="text-sm font-bold">No Records Detected</p>
            {searchTerm && <p className="text-xs">Try redefining your search keywords.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {meetings.map((m) => {
              const isArchived = m.is_audio_archived;
              const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Pending';
              
              return (
                <div
                  key={m.id}
                  onClick={() => handleOpenMeeting(m.id)}
                  className="group p-1.5 bg-white/2 border border-white/5 hover:border-white/15 rounded-2xl shadow-card transition-all duration-500 ease-spring cursor-pointer flex flex-col justify-between"
                >
                  <div className="p-6 bg-card rounded-[calc(1rem-0.375rem)] h-full flex flex-col justify-between">
                    <div>
                      {/* Top Row: Status Pills */}
                      <div className="flex items-center justify-between gap-2 mb-4 select-none">
                        <span className={`px-2.5 py-0.5 border text-[9px] font-bold font-mono tracking-wider rounded-full uppercase ${
                          m.status === 'DONE'
                            ? 'bg-pastel-green-bg text-pastel-green-text border-pastel-green-text/20'
                            : m.status === 'ERROR'
                            ? 'bg-pastel-red-bg text-pastel-red-text border-pastel-red-text/20'
                            : 'bg-pastel-yellow-bg text-pastel-yellow-text border-pastel-yellow-text/20 animate-pulse'
                        }`}>
                          {m.status === 'DONE' ? 'Synthesized' : m.status}
                        </span>

                        <div className="flex items-center gap-1 text-[10px] text-muted font-sans font-light">
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      {/* Title & Style */}
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1 font-sans">
                        {m.title || `Meeting #${m.id}`}
                      </h3>

                      <div className="flex flex-wrap gap-1.5 my-3 select-none">
                        <span className="px-2 py-0.5 border border-pastel-blue-text/10 bg-pastel-blue-bg text-[9px] font-bold font-mono text-pastel-blue-text rounded-full uppercase">
                          {m.output_language ? m.output_language.split(' ')[0] : 'Language'}
                        </span>
                        <span className="px-2 py-0.5 border border-pastel-green-text/10 bg-pastel-green-bg text-[9px] font-bold font-mono text-pastel-green-text rounded-full uppercase">
                          {m.meeting_style ? m.meeting_style.replace(' MoM', '') : 'Executive'}
                        </span>
                      </div>

                      {/* Snippet Preview */}
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed mt-2 font-sans font-light">
                        {getMoMPreview(m)}
                      </p>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-4 mt-5 border-t border-white/5 flex items-center justify-between text-xs font-sans">
                      {/* Audio Status / Smart Archive Button */}
                      <div>
                        {!isArchived && m.audio_file_path ? (
                          <button
                            type="button"
                            onClick={(e) => handlePurgeAudio(e, m.id, m.title)}
                            disabled={actionLoading === `purge_${m.id}`}
                            title="Purge raw audio file to save disk space"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-pastel-red-text/20 bg-pastel-red-bg text-pastel-red-text text-[10px] font-bold rounded-md hover:bg-pastel-red-text hover:text-white transition-colors"
                          >
                            {actionLoading === `purge_${m.id}` ? <Loader2 size={10} className="animate-spin" /> : <HardDrive size={10} />}
                            <span>Purge Audio</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-muted bg-white/5 border border-border px-3 py-1 rounded-full select-none font-mono">
                            <CheckCircle2 size={10} strokeWidth={2.5} className="text-pastel-green-text" />
                            <span>Audio Purged</span>
                          </span>
                        )}
                      </div>

                      {/* View & Delete Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteEntirely(e, m.id, m.title)}
                          disabled={actionLoading === `del_${m.id}`}
                          className="p-2 border border-border rounded-lg hover:bg-pastel-red-bg hover:text-pastel-red-text text-muted hover:border-pastel-red-text/20 transition-all bg-white/5"
                          title="Delete record entirely"
                        >
                          {actionLoading === `del_${m.id}` ? <Loader2 size={12} className="animate-spin text-pastel-red-text" /> : <Trash2 size={12} />}
                        </button>

                        <span className="inline-flex items-center gap-1.5 font-bold text-white group-hover:text-blue-400 transition-colors pl-1">
                          <span>Read Report</span>
                          <ArrowRight size={12} strokeWidth={2.5} />
                        </span>
                      </div>
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
