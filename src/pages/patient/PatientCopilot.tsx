import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, BarChart3, AlertTriangle } from 'lucide-react';
import { patientCopilotApi } from '../../lib/api';
import { EMERGENCY_SYMPTOMS } from '../../lib/ai';
import { Card, CardHeader } from '../../components/ui';
import { cn } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emergency?: boolean;
}

const EMERGENCY_RESPONSE = '🚨 EMERGENCY ALERT 🚨\n\nYour symptoms may indicate a medical emergency. Please:\n\n1. Call emergency services immediately (911 or your local emergency number)\n2. Do not attempt to drive yourself\n3. If with someone, have them stay with you\n4. Keep any relevant medications nearby\n\nThis is not a substitute for emergency medical care. Please seek immediate help.';

export function PatientCopilot() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `Hello! I'm your AI Copilot. I can look up your own appointments, prescriptions, and medical reports, tell you which doctors you've seen, and give general (non-diagnostic) guidance on everyday symptoms.\n\nTry asking:\n• "When's my next appointment?"\n• "What medicines was I prescribed?"\n• "I have a headache, what should I do?"\n• "Which doctors have I seen?"\n\nFor a medical emergency, call emergency services immediately.`,
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toISOString() };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(p => [...p, userMsg]);
    setInput('');

    // Deterministic emergency check, handled client-side before the model
    // ever sees the message — a safety-critical detection like this must
    // never depend on an LLM's judgment call.
    const lower = userMsg.content.toLowerCase();
    if (EMERGENCY_SYMPTOMS.some(s => lower.includes(s))) {
      setMessages(p => [...p, { role: 'assistant', content: EMERGENCY_RESPONSE, timestamp: new Date().toISOString(), emergency: true }]);
      return;
    }

    setLoading(true);
    try {
      const response = await patientCopilotApi.chat(userMsg.content, history);
      setMessages(p => [...p, { role: 'assistant', content: response, timestamp: new Date().toISOString() }]);
    } catch (err: any) {
      setMessages(p => [...p, {
        role: 'assistant',
        content: `Sorry, I couldn't complete that: ${err?.message || 'something went wrong. Please try again.'}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "When's my next appointment?",
    'What medicines was I prescribed?',
    "What's in my latest medical report?",
    'Which doctors have I seen?',
    'I have a fever, what should I do?',
    'I have a headache, what should I do?',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          AI Copilot
          <Sparkles className="w-5 h-5 text-primary-500" />
        </h1>
        <p className="text-slate-500">Ask about your own appointments, prescriptions, and reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader title="Quick Questions" icon={<BarChart3 className="w-5 h-5" />} />
          <div className="space-y-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700')}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <span className="text-xs font-semibold">P</span>}
                </div>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : msg.emergency
                      ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-slate-100 dark:bg-slate-800')}>
                  {msg.emergency && <AlertTriangle className="w-4 h-4 inline mr-1 mb-1" />}
                  {msg.content}
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
            <div ref={endRef} />
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about your appointments, prescriptions, or reports..."
                className="input flex-1"
                disabled={loading}
              />
              <button onClick={send} disabled={loading} className="btn-primary px-4">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
