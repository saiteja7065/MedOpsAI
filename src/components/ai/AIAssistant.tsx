import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, AlertTriangle, Calendar, Sparkles } from 'lucide-react';
import { useUIStore } from '../../store/ui';
import { useAuthStore } from '../../store/auth';
import { getAIResponse } from '../../lib/ai';
import { cn, timeAgo } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emergency?: boolean;
  suggestAppointment?: boolean;
}

export function AIAssistant() {
  const { aiAssistantOpen, setAIAssistant } = useUIStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (aiAssistantOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your AI Health Assistant. I can help you with:\n\n• General health questions\n• Symptom assessment\n• Triage recommendations\n• Guidance on when to seek care\n\nWhat health concern can I help you with today?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [aiAssistantOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 600));

    const result = getAIResponse(input, messages);
    const assistantMsg: Message = {
      role: 'assistant',
      content: result.response,
      timestamp: new Date().toISOString(),
      emergency: result.emergency,
      suggestAppointment: result.suggestAppointment,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
  };

  if (!aiAssistantOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-primary-600 to-cyan-600 text-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              AI Health Assistant
              <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Online
              </span>
            </h3>
            <p className="text-xs text-white/70">24/7 Health Support</p>
          </div>
        </div>
        <button onClick={() => setAIAssistant(false)} className="p-1.5 rounded-lg hover:bg-white/20">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              msg.role === 'assistant' ? 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700'
            )}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <span className="text-xs font-semibold">{user?.full_name?.[0] || 'U'}</span>}
            </div>
            <div className={cn('max-w-[80%]', msg.role === 'user' && 'text-right')}>
              <div className={cn(
                'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : msg.emergency
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              )}>
                {msg.emergency && <AlertTriangle className="w-4 h-4 inline mr-1 mb-1" />}
                {msg.content}
              </div>
              {msg.suggestAppointment && user?.role === 'patient' && (
                <button
                  onClick={() => { setAIAssistant(false); navigate('/patient/book'); }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Book an appointment
                </button>
              )}
              <p className="text-xs text-slate-400 mt-1">{timeAgo(msg.timestamp)}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {['I have a fever', 'Headache', 'Chest pain', 'Stomach pain'].map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Describe your symptoms..."
            className="input flex-1"
            disabled={loading}
          />
          <Button onClick={sendMessage} loading={loading} icon={!loading ? <Send className="w-4 h-4" /> : undefined} className="px-3">
            <span className="sr-only">Send</span>
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI can provide general info but cannot prescribe medication. Always consult a doctor for diagnosis.
        </p>
      </div>
    </div>
  );
}

export function AIAssistantFAB() {
  const { aiAssistantOpen, setAIAssistant } = useUIStore();
  if (aiAssistantOpen) return null;
  return (
    <button
      onClick={() => setAIAssistant(true)}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-cyan-600 text-white shadow-2xl shadow-primary-600/30 flex items-center justify-center hover:scale-110 transition-transform group"
    >
      <Bot className="w-6 h-6" />
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
      <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Ask AI Assistant
      </span>
    </button>
  );
}
