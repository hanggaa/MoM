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
          className="fixed bottom-6 right-6 p-4 rounded-full bg-primary hover:bg-amber-400 text-zinc-950 shadow-glow hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:-translate-y-1 transition-all duration-300 z-50 group flex items-center justify-center"
        >
          <MessageSquare size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] glass-panel rounded-3xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white font-display">MoM Chat Assistant</h3>
                <p className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                  {activeMeetingId ? `Context: Meeting #${activeMeetingId}` : 'Local RAG Vector DB Active'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-zinc-300'}`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-zinc-950 rounded-tr-none font-medium'
                    : 'bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none prose prose-invert prose-sm prose-p:leading-relaxed prose-a:text-primary font-light'
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
                <div className="w-8 h-8 rounded-full bg-white/10 text-zinc-300 flex items-center justify-center shrink-0">
                  <Loader2 size={14} className="animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-400 rounded-tl-none text-sm flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-.3s]" />
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-.5s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white/5 border-t border-white/10">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your meetings..."
                className="w-full bg-background border border-white/10 text-zinc-100 text-sm rounded-2xl pl-4 pr-12 py-3.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600 font-light"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 p-2 text-primary hover:text-amber-400 disabled:opacity-50 disabled:hover:text-primary transition-colors bg-white/5 hover:bg-white/10 rounded-xl"
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
