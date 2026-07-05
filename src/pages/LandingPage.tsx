import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BedDouble, Stethoscope, Video, FileText, TrendingUp,
  Bot, Receipt, CalendarRange, Sparkles, CheckCircle2, ShieldCheck,
  ClipboardList, LayoutDashboard, HeartPulse,
} from 'lucide-react';

const FEATURES = [
  {
    icon: CalendarRange,
    title: 'Smart Appointment Booking',
    description: 'Patients book by symptom or department, choose in-person or video, and doctors accept or reject from a live queue.',
  },
  {
    icon: BedDouble,
    title: 'Real-Time Bed & OT Management',
    description: 'Live occupancy across every department, with room and operation-theatre scheduling down to the doctor and time slot.',
  },
  {
    icon: Receipt,
    title: 'AI Medical Coding & Claims',
    description: 'A real LLM suggests ICD-10/CPT codes with a rationale, a doctor confirms them, and deterministic payer rules compute an explainable denial-risk score before submission.',
  },
  {
    icon: Video,
    title: 'Video Consultations',
    description: 'In-call chat, AI-generated visit summaries, and a full history of past consultations for both doctor and patient.',
  },
  {
    icon: FileText,
    title: 'AI Document Analysis',
    description: 'Upload a lab report or prescription and a vision model extracts the summary, flagged conditions, medicines, and test results — not a canned response.',
  },
  {
    icon: TrendingUp,
    title: 'Demand Forecasting',
    description: 'A real statistical trend fit over historical appointment volume projects the weeks ahead, narrated in plain English.',
  },
  {
    icon: Bot,
    title: 'Role-Based AI Copilots',
    description: 'Admin, Doctor, and Patient each get their own AI agent that calls real tools against live data — never a scripted keyword bot.',
  },
  {
    icon: ClipboardList,
    title: 'Staff Scheduling',
    description: 'Auto-generated weekly rosters per doctor, with each doctor able to see their own upcoming shifts.',
  },
];

const ROLES = [
  {
    icon: LayoutDashboard,
    role: 'Admin',
    color: 'from-primary-500 to-cyan-500',
    items: ['Hospital-wide dashboard & analytics', 'Bed, OT, and staff scheduling', 'Claims review & denial-risk triage', 'AI Copilot for live operations Q&A'],
  },
  {
    icon: Stethoscope,
    role: 'Doctor',
    color: 'from-emerald-500 to-teal-500',
    items: ['Daily patient queue & approvals', 'Video consultations with AI summaries', 'AI-assisted medical coding', 'AI Copilot for their own schedule & patients'],
  },
  {
    icon: HeartPulse,
    role: 'Patient',
    color: 'from-amber-500 to-orange-500',
    items: ['Symptom-based appointment booking', 'Video consultations & prescriptions', 'AI-analyzed medical reports', 'AI Copilot for their own records'],
  },
];

const DIFFERENTIATORS = [
  {
    title: 'Denial-risk scoring',
    detail: 'A deterministic rules engine checks payer requirements and computes the risk score. The AI only explains it in plain English.',
  },
  {
    title: 'Demand forecasting',
    detail: 'A linear-regression fit over real appointment history produces the trend. The AI only narrates the direction and magnitude.',
  },
  {
    title: 'Every AI Copilot',
    detail: 'Each copilot calls real, scoped database queries as tools. It can never state a number it didn\'t just look up.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl text-white">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">MedOps AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Features</a>
            <a href="#roles" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">For your role</a>
            <a href="#why" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Why MedOps AI</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">Login</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-cyan-800">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white/90 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Hospital Administration OS
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance max-w-4xl mx-auto">
            Run your hospital's back office, not the other way around.
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto text-balance">
            Appointments, beds, operation theatres, video consultations, medical coding, and claims — in one platform where every AI-generated number is backed by a real, auditable calculation.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn-primary px-6 py-3 text-base bg-white text-primary-700 hover:bg-white/90 shadow-xl shadow-black/10">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn px-6 py-3 text-base text-white bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-xl">
              Login
            </Link>
          </div>
        </div>

        {/* Product preview mockup */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
          <div className="glass-card p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: "Today's Appointments", value: '18', color: 'text-primary-600 dark:text-primary-400' },
                { label: 'Beds Available', value: '12 / 20', color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'OT Utilization', value: '20%', color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Video Calls', value: '11', color: 'text-cyan-600 dark:text-cyan-400' },
              ].map((s) => (
                <div key={s.label} className="card p-4 bg-white/90 dark:bg-slate-900/90">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="card p-4 bg-white/90 dark:bg-slate-900/90 flex items-end gap-2 h-28">
              {[40, 55, 48, 65, 72, 60, 80, 75, 90, 85, 95, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-primary-500 to-cyan-400 rounded-t-md" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-3">FEATURES</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-balance">Everything a modern hospital back office needs</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="bg-slate-50 dark:bg-slate-900/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-3">FOR YOUR ROLE</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-balance">One platform, three purpose-built portals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ROLES.map((r) => (
              <div key={r.role} className="card p-8">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} text-white flex items-center justify-center mb-5`}>
                  <r.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-4">{r.role}</h3>
                <ul className="space-y-3">
                  {r.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why MedOps AI */}
      <section id="why" className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-3">WHY MEDOPS AI</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">Rules decide. AI narrates.</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-6">
              Every number that matters — a denial-risk score, a demand forecast, a hospital statistic — is computed by deterministic logic first. AI is only ever used to phrase that already-computed result in plain English, never to invent it.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              Auditable by design, not a black box.
            </div>
          </div>
          <div className="space-y-4">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.title} className="card p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-500" />
                  <h3 className="font-semibold">{d.title}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{d.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-cyan-800 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-balance">Ready to see it in action?</h2>
          <p className="text-white/80 mb-8">Sign in with a demo account or create your own to explore the Admin, Doctor, and Patient portals.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn-primary bg-white text-primary-700 hover:bg-white/90" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn text-white bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-xl" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg text-white">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-semibold">MedOps AI</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Get Started</Link>
          </div>
          <p className="text-sm text-slate-400">© 2026 MedOps AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
