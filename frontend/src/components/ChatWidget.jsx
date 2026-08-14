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
          className="fixed bottom-6 right-6 p-4 border border-white/10 bg-card hover:bg-white/10 text-white shadow-card rounded-full z-50 group flex items-center justify-center gap-1.5 font-sans font-bold text-xs active:scale-95 transition-all duration-500 ease-spring"
        >
          <MessageSquare size={14} strokeWidth={2} className="text-muted group-hover:text-white transition-colors" />
          <span>Chat Assistant</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border border-white/10 bg-card shadow-card flex flex-col overflow-hidden z-50 font-sans text-xs rounded-2xl backdrop-blur-2xl">
          {/* Header */}
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Meeting Chat Assistant
                </h3>
                <p className="text-[9px] text-muted font-mono mt-0.5">
                  {activeMeetingId ? `Context: Meeting #${activeMeetingId}` : 'Context: Global Vector DB'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-md transition-colors"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold select-none ${
                  msg.role === 'user' 
                    ? 'border-pastel-blue-text/20 text-pastel-blue-text bg-pastel-blue-bg' 
                    : 'border-white/10 text-muted bg-white/5'
                }`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={`max-w-[75%] p-3 border text-xs leading-relaxed rounded-xl ${
                  msg.role === 'user'
                    ? 'border-pastel-blue-text/20 bg-pastel-blue-bg/10 text-white font-normal'
                    : 'border-white/5 bg-white/2 text-white/90 prose prose-sm prose-p:leading-relaxed prose-invert font-light'
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
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full border border-white/10 text-muted bg-white/5 flex items-center justify-center shrink-0">
                  <Loader2 size={12} className="animate-spin" />
                </div>
                <div className="p-3 border border-white/10 bg-white/2 text-muted rounded-xl text-xs flex items-center gap-1.5 select-none animate-pulse">
                  <span>Searching vector database...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white/5 border-t border-white/10">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about this meeting..."
                className="w-full bg-card border border-white/10 text-white text-xs pl-3.5 pr-16 py-2.5 focus:outline-none focus:border-white/20 rounded-lg placeholder:text-muted/30 font-sans"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-1 px-3 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold text-[10px] rounded-md transition-colors active:scale-95 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
