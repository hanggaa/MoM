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
          className="fixed bottom-6 right-6 p-3.5 border border-border bg-card hover:bg-background text-primary shadow-card rounded-xl z-50 group flex items-center justify-center gap-1.5 font-sans font-bold text-xs active:scale-98 transition-all"
        >
          <MessageSquare size={14} strokeWidth={2.5} className="text-accent" />
          <span>Chat</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border border-border bg-card shadow-card flex flex-col overflow-hidden z-50 font-sans text-xs rounded-xl">
          {/* Header */}
          <div className="p-4 bg-background border-b border-border flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-primary tracking-tight">
                  Meeting Chat Assistant
                </h3>
                <p className="text-[9px] text-accent font-mono mt-0.5">
                  {activeMeetingId ? `Context: Meeting #${activeMeetingId}` : 'Context: Global Vector DB'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-accent hover:text-primary hover:bg-background rounded-md transition-colors"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold select-none ${
                  msg.role === 'user' 
                    ? 'border-pastel-blue-text/20 text-pastel-blue-text bg-pastel-blue-bg' 
                    : 'border-border text-accent bg-background'
                }`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className={`max-w-[75%] p-3 border text-xs leading-relaxed rounded-lg ${
                  msg.role === 'user'
                    ? 'border-pastel-blue-text/10 bg-pastel-blue-bg text-pastel-blue-text font-medium'
                    : 'border-border bg-background text-primary prose prose-sm prose-p:leading-relaxed prose-a:text-primary font-light'
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
                <div className="w-7 h-7 rounded-full border border-border text-accent bg-background flex items-center justify-center shrink-0">
                  <Loader2 size={12} className="animate-spin" />
                </div>
                <div className="p-3 border border-border bg-background text-accent rounded-lg text-xs flex items-center gap-1.5 select-none animate-pulse">
                  <span>Searching vector database...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-background border-t border-border">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question about this meeting..."
                className="w-full bg-card border border-border text-primary text-xs pl-3 pr-16 py-2 focus:outline-none focus:border-primary rounded-md placeholder:text-accent/50 font-sans"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-1 px-3 py-1 bg-primary hover:bg-zinc-800 text-white font-bold text-[10px] rounded-md transition-colors active:scale-98"
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
