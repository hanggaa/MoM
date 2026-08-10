import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { chatWithMeetings } from '../services/api';
import ReactMarkdown from 'react-markdown';

export const ChatWidget = ({ activeMeetingId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya asisten AI Rapat Anda. Tanyakan apa saja tentang riwayat rapat Anda (mis. "Apa action item untuk saya?", "Kapan tenggat waktu proyek X?").' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await chatWithMeetings(userMessage, activeMeetingId);
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      const errorDetail = error.response?.data?.detail || error.message || 'Gagal menyambung ke server.';
      setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${errorDetail}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-900 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-1 transition-all z-50 group flex items-center justify-center"
        >
          <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-cyan-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">MoM Chat Assistant</h3>
                <p className="text-[10px] text-emerald-400 font-mono">
                  {activeMeetingId ? `Context: Meeting #${activeMeetingId}` : 'Local RAG Vector DB Active'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 rounded-tr-none'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none prose prose-invert prose-sm prose-p:leading-relaxed prose-a:text-cyan-400'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 rounded-tl-none text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce [animation-delay:-.3s]" />
                  <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce [animation-delay:-.5s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <form onSubmit={handleSend} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your meetings..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-400 hover:text-cyan-300 disabled:opacity-50 disabled:hover:text-cyan-400 transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
