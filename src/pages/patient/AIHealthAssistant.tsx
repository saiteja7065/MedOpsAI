import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, AlertTriangle, Calendar, Sparkles, Activity, Shield, Clock } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { getAIResponse } from '../../lib/ai';
import { Card, CardHeader, Button } from '../../components/ui';
import { cn, timeAgo } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  emergency?: boolean;
  suggestAppointment?: boolean;
}

export function AIHealthAssistant() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: `Hello ${user?.full_name?.split(' ')[0] || 'there'}! I'm your AI Health Assistant, available 24/7.\n\nI can help you with:\n• General health questions\n• Symptom assessment\n• Triage recommendations\n• Guidance on when to seek care\n\nWhat health concern can I help you with today?`,
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = getAIResponse(input, messages);
    setMessages(p => [...p, { role: 'assistant', content: result.response, timestamp: new Date().toISOString(), emergency: result.emergency, suggestAppointment: result.suggestAppointment }]);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          AI Health Assistant
          <span className="flex items-center gap-1 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            24/7 Online
          </span>
        </h1>
        <p className="text-slate-500">Get instant health guidance and symptom assessment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Info Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader title="Capabilities" icon={<Sparkles className="w-5 h-5" />} />
            <div className="space-y-3 text-sm">
              {[
                { icon: Activity, label: 'Symptom Analysis', desc: 'Describe symptoms for guidance' },
                { icon: Shield, label: 'Triage Recommendations', desc: 'Home care vs. doctor visit' },
                { icon: AlertTriangle, label: 'Emergency Detection', desc: 'Immediate alerts for serious symptoms' },
                { icon: Clock, label: '24/7 Availability', desc: 'Always here to help' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex-shrink-0">
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-amber-700 dark:text-amber-300">Important Notice</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  This AI assistant provides general health information only. It cannot prescribe medication or replace professional medical advice. Always consult a doctor for diagnosis and treatment.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Chat */}
        <Card className="lg:col-span-3 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700')}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <span className="text-xs font-semibold">{user?.full_name?.[0] || 'U'}</span>}
                </div>
                <div className={cn('max-w-[80%]', msg.role === 'user' && 'text-right')}>
                  <div className={cn('rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                    msg.role === 'user' ? 'bg-primary-600 text-white' :
                    msg.emergency ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                    'bg-slate-100 dark:bg-slate-800')}>
                    {msg.emergency && <AlertTriangle className="w-4 h-4 inline mr-1 mb-1" />}
                    {msg.content}
                  </div>
                  {msg.suggestAppointment && (
                    <button onClick={() => navigate('/patient/book')} className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium">
                      <Calendar className="w-3.5 h-3.5" /> Book an appointment
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
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {['I have a fever and headache', 'Chest pain', 'Stomach pain', 'Skin rash', 'Feeling dizzy', 'Back pain'].map(s => (
                <button key={s} onClick={() => setInput(s)} className="text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Describe your symptoms..."
                className="input flex-1"
                disabled={loading}
              />
              <Button onClick={send} loading={loading} icon={!loading ? <Send className="w-4 h-4" /> : undefined} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
