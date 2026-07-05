import { useNavigate, useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useAuthStore } from '../../store/auth';

// Each role has its own dedicated copilot page (rule-based symptom triage for
// patients, Groq tool-calling agents for admin/doctor). This floating button
// is just a shortcut to the current user's own copilot — it used to open a
// single hardcoded patient-symptom-checker panel regardless of role, which is
// why an admin clicking it got a patient health response.
export const COPILOT_ROUTES: Record<string, string> = {
  admin: '/admin/copilot',
  doctor: '/doctor/copilot',
  patient: '/patient/copilot',
};

export function AIAssistantFAB() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;
  const target = COPILOT_ROUTES[user.role];
  if (!target || location.pathname === target) return null;

  return (
    <button
      onClick={() => navigate(target)}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary-600 to-cyan-600 text-white shadow-2xl shadow-primary-600/30 flex items-center justify-center hover:scale-110 transition-transform group"
    >
      <Bot className="w-6 h-6" />
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
      <span className="absolute right-full mr-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Ask AI Copilot
      </span>
    </button>
  );
}
