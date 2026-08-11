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
          className="fixed bottom-6 right-6 p-4 border border-primary bg-card hover:bg-primary text-primary hover:text-black transition-all z-50 group flex items-center justify-center font-mono font-bold text-xs"
        >
          [ CHAT_ASSISTANT ]
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[550px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] border-2 border-border bg-card flex flex-col overflow-hidden z-50 font-mono text-xs">
          {/* Header */}
          <div className="p-4 bg-black border-b border-border flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-xs font-display font-bold text-phosphor uppercase tracking-wider glow-text">
                  [06] MEETING_CHAT_INTELLIGENCE
                </h3>
                <p className="text-[9px] text-primary uppercase mt-0.5 tracking-wider">
                  {activeMeetingId ? `TARGET_CONTEXT: MEETING_#${activeMeetingId}` : '// LOCAL_RAG_VECTOR_DB_ACTIVE'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-muted hover:text-primary border border-transparent hover:border-border bg-black transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 border flex items-center justify-center shrink-0 text-[10px] font-bold select-none ${msg.role === 'user' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted bg-card'}`}>
                  {msg.role === 'user' ? 'USR' : 'SYS'}
                </div>
                <div className={`max-w-[75%] p-3 border text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-phosphor prose prose-invert prose-sm prose-p:leading-relaxed prose-a:text-primary font-light'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content.toUpperCase()
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-8 h-8 border border-border text-muted bg-card flex items-center justify-center shrink-0">
                  <Loader2 size={12} className="animate-spin" />
                </div>
                <div className="p-3 border border-border bg-card text-primary rounded-none text-xs flex items-center gap-1 select-none animate-pulse">
                  <span>QUERYING VECTOR DATASTORE...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-black border-t border-border">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="INPUT QUERY PARAMETERS..."
                className="w-full bg-black border border-border text-phosphor text-xs pl-3 pr-16 py-2.5 focus:outline-none focus:border-primary transition-all placeholder:text-zinc-800 font-mono"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-1 px-3 py-1 border border-primary/40 hover:border-primary bg-card text-primary font-bold text-[10px] hover:bg-primary hover:text-black transition-colors"
              >
                [SEND]
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
