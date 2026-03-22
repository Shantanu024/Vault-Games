import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, ChevronDown } from 'lucide-react';
import api from '../../config/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hey! I'm VaultBot 🎮 Ask me anything about the games, your account, or how to play.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat/message', {
        messages: [...messages, userMsg]
          .filter((m) => m.role !== 'assistant' || m.id !== '0') // exclude greeting
          .map((m) => ({ role: m.role, content: m.content })),
      });

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.reply,
        timestamp: new Date(),
      };
      setMessages((m) => [...m, botMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    'How do I play Mines?',
    'Word Jumble rules?',
    'How to add friends?',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-80 bg-vault-bg-surface border border-vault-border rounded-2xl shadow-card overflow-hidden flex flex-col"
            style={{ height: 460 }}
          >
            {/* Header */}
            <div className="bg-vault-violet/10 border-b border-vault-border px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-vault-violet/30 border border-vault-violet/50 flex items-center justify-center">
                <Bot size={15} className="text-vault-glow" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-vault-text-primary">VaultBot</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-vault-success animate-pulse" />
                  <p className="text-xs text-vault-text-muted">AI Helpdesk · Online</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-vault-text-muted hover:text-vault-text-primary transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-vault-violet/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={11} className="text-vault-glow" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-vault-violet text-white rounded-tr-sm'
                        : 'bg-vault-bg-elevated text-vault-text-primary border border-vault-border rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-vault-violet/30 flex items-center justify-center flex-shrink-0">
                    <Bot size={11} className="text-vault-glow" />
                  </div>
                  <div className="bg-vault-bg-elevated border border-vault-border rounded-2xl rounded-tl-sm px-3 py-2">
                    <div className="flex gap-1 items-center h-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-vault-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-vault-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-vault-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick actions — shown when only greeting is visible */}
              {messages.length === 1 && (
                <div className="space-y-1.5 mt-2">
                  {quickActions.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="w-full text-left text-xs bg-vault-bg-elevated hover:bg-vault-border border border-vault-border rounded-xl px-3 py-2 text-vault-text-secondary hover:text-vault-text-primary transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={sendMessage}
              className="border-t border-vault-border p-3 flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask VaultBot…"
                disabled={loading}
                maxLength={500}
                className="flex-1 bg-vault-bg-elevated border border-vault-border rounded-xl px-3 py-2 text-sm text-vault-text-primary placeholder-vault-text-muted focus:outline-none focus:border-vault-violet transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl bg-vault-violet hover:bg-vault-violet-light disabled:opacity-40 flex items-center justify-center text-white transition-colors flex-shrink-0"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-vault-violet shadow-glow-md flex items-center justify-center text-white relative"
        aria-label="Open AI helpdesk"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90 }} animate={{ rotate: 0 }} exit={{ rotate: -90 }}>
              <MessageCircle size={22} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
