import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../lib/api';
import { getAdminCopilotResponse } from '../../lib/ai';
import { Card, CardHeader } from '../../components/ui';
import { cn, timeAgo } from '../../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function AdminCopilot() {
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: analyticsApi.getDashboardStats });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0 && stats) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your AI Admin Copilot. I can help you analyze hospital operations.\n\nTry asking:\n• "How many appointments today?"\n• "How many beds available?"\n• "Show hospital occupancy"\n• "Generate weekly report"\n• "Which doctor has highest workload?"\n• "Generate revenue report"`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [stats]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const response = getAdminCopilotResponse(input, stats || {});
    setMessages(p => [...p, { role: 'assistant', content: response, timestamp: new Date().toISOString() }]);
    setLoading(false);
  };

  const suggestions = [
    'How many appointments today?',
    'How many beds available?',
    'Show hospital occupancy',
    'Generate weekly report',
    'Which doctor has highest workload?',
    'Generate revenue report',
    'How many emergency patients today?',
    'OT status',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          AI Admin Copilot
          <Sparkles className="w-5 h-5 text-primary-500" />
        </h1>
        <p className="text-slate-500">Ask questions about hospital operations and get instant insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Suggestions */}
        <Card className="lg:col-span-1">
          <CardHeader title="Quick Questions" icon={<BarChart3 className="w-5 h-5" />} />
          <div className="space-y-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-3 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.role === 'assistant' ? 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-700')}>
                  {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <span className="text-xs font-semibold">A</span>}
                </div>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap',
                  msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800')}>
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
                placeholder="Ask about hospital operations..."
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
