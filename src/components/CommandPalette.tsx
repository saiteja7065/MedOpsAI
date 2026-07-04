import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Calendar, BedDouble, Users, FileText, Video, Bot, BarChart3, Building2, Receipt, ClipboardList } from 'lucide-react';
import { useUIStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import { cn } from '../lib/utils';

interface Command {
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  category: string;
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPalette } = useUIStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen || !user) return null;

  const base = `/${user.role}`;
  const commands: Command[] = [
    { label: 'Go to Dashboard', icon: BarChart3, action: () => navigate(base), category: 'Navigation' },
    { label: 'View Appointments', icon: Calendar, action: () => navigate(`${base}/appointments`), category: 'Navigation' },
    { label: 'Book Appointment', icon: Calendar, action: () => navigate('/patient/book'), category: 'Patient' },
    { label: 'Bed Management', icon: BedDouble, action: () => navigate('/admin/beds'), category: 'Admin' },
    { label: 'Operation Theatres', icon: Building2, action: () => navigate('/admin/operation-theatres'), category: 'Admin' },
    { label: 'Manage Doctors', icon: Users, action: () => navigate('/admin/doctors'), category: 'Admin' },
    { label: 'Manage Patients', icon: Users, action: () => navigate('/admin/patients'), category: 'Admin' },
    { label: 'Medical Reports', icon: FileText, action: () => navigate(`${base}/reports`), category: 'Records' },
    { label: 'Video Consultation', icon: Video, action: () => navigate(`${base}/video-sessions`), category: 'Communication' },
    { label: 'AI Health Assistant', icon: Bot, action: () => { setCommandPalette(false); window.dispatchEvent(new CustomEvent('open-ai-assistant')); }, category: 'AI' },
    { label: 'Analytics', icon: BarChart3, action: () => navigate('/admin/analytics'), category: 'Admin' },
    { label: 'Departments', icon: Building2, action: () => navigate('/admin/departments'), category: 'Admin' },
    { label: 'Claims', icon: Receipt, action: () => navigate('/admin/claims'), category: 'Admin' },
    { label: 'Medical Coding', icon: ClipboardList, action: () => navigate('/doctor/coding'), category: 'Doctor' },
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      if (cmd) {
        cmd.action();
        setCommandPalette(false);
      }
    } else if (e.key === 'Escape') {
      setCommandPalette(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCommandPalette(false)} />
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search or type a command..."
            className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
          <kbd className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found</p>
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.label}
                onClick={() => { cmd.action(); setCommandPalette(false); }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                  i === selectedIndex ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <cmd.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-sm font-medium">{cmd.label}</span>
                <span className="text-xs text-slate-400">{cmd.category}</span>
                {i === selectedIndex && <ArrowRight className="w-4 h-4" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
