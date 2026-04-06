import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Mic, Users, Building2, CheckCircle, ArrowRight, Star, BrainCircuit, Wrench, LayoutDashboard } from 'lucide-react';

const features = [
  {
    icon: <Mic size={24} />,
    title: 'Voice-First Reporting',
    desc: 'Speak your issue naturally — our AI transcribes and categorizes it instantly. No forms, no friction.',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
  {
    icon: <BrainCircuit size={24} />,
    title: 'AI-Powered Analysis',
    desc: 'Groq LLaMA AI categorizes every issue by type, priority, and urgency — including emergency detection.',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    icon: <Zap size={24} />,
    title: 'Emergency Alerts',
    desc: 'Critical issues like electrical sparks or gas leaks instantly notify your PG owner before you can blink.',
    color: 'bg-red-50 text-red-600 border-red-200',
  },
  {
    icon: <Wrench size={24} />,
    title: 'Technician Assignment',
    desc: 'Owners assign the right specialist to every issue. Residents get real contact info — call or email directly.',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    icon: <Users size={24} />,
    title: 'Community Management',
    desc: 'Owners see all members, manage join codes, and track every issue across their entire PG.',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    icon: <Shield size={24} />,
    title: 'Role-Based Access',
    desc: 'Residents, Owners, and Technicians — each with their own secure dashboard and permissions.',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
  },
];

const stats = [
  { value: '< 2s', label: 'AI Analysis Time' },
  { value: '3 Roles', label: 'Resident · Owner · Worker' },
  { value: '100%', label: 'Voice Compatible' },
  { value: 'Real-time', label: 'Live Issue Updates' },
];

const steps = [
  { step: '01', role: 'Resident', action: 'Speaks or types their issue' },
  { step: '02', role: 'AI', action: 'Categorizes, prioritizes & flags emergencies' },
  { step: '03', role: 'Owner', action: 'Reviews and assigns a technician' },
  { step: '04', role: 'Worker', action: 'Gets notified and resolves the issue' },
];

export default function LandingPage({ session }) {
  const navigate = useNavigate();
  const isLoggedIn = !!session;

  return (
    <div className="min-h-screen bg-white selection:bg-violet-100">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-lg tracking-tight">EaseStay</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm font-bold bg-primary text-white px-5 py-2.5 rounded-xl transition-all shadow-sm hover:bg-primary/90">
              <LayoutDashboard size={16} /> Go to Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/auth')}
                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2 rounded-xl hover:bg-slate-50">
                Sign In
              </button>
              <button onClick={() => navigate('/auth')}
                className="text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition-all shadow-sm">
                Get Started →
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pt-24 pb-32 text-center">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-violet-50 via-purple-50/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="inline-flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-full text-xs font-bold text-slate-600 mb-8">
          <BrainCircuit size={13} className="text-violet-500" />
          Powered by Groq LLaMA 3 AI
        </div>

        <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tight leading-[1.05] max-w-4xl mx-auto mb-6">
          PG Management,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-500">
            Voice-First
          </span>
        </h1>

        <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
          Residents report issues by voice or text. AI categorizes them instantly.
          Owners assign technicians. Everything resolved — faster than ever.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button onClick={() => navigate('/auth')}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] text-base">
            Start for Free <ArrowRight size={18} />
          </button>
          <button onClick={() => navigate('/auth')}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-8 py-4 rounded-2xl transition-all shadow-sm text-base hover:shadow-md">
            <Mic size={18} className="text-violet-500" /> Try Voice Demo
          </button>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center hover:border-slate-200 transition-all">
              <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo voice flow ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">Example in action</p>
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-1">
              <Mic size={18} className="text-red-400" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-tl-none p-4 text-sm font-medium text-slate-200 leading-relaxed">
              "There are sparks and smoke coming from the main electrical board in the hallway!"
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-1">
              <BrainCircuit size={18} className="text-violet-400" />
            </div>
            <div className="bg-white/10 rounded-2xl rounded-tl-none p-4 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400 mb-2">AI Analysis — 0.8s</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Category', 'Electrical'],
                  ['Priority', 'CRITICAL 🚨'],
                  ['Emergency', 'Yes — Owner notified'],
                  ['Status', 'Logged & assigned'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span className="text-slate-400 text-xs">{k}: </span>
                    <span className="font-bold text-white">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Everything you need, nothing you don't</h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">Built for modern PG operations — from single-room concerns to community-wide emergencies.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon, title, desc, color }) => (
              <div key={title} className="p-6 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${color}`}>
                  {icon}
                </div>
                <h3 className="font-extrabold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 pb-24 bg-slate-50">
        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">How EaseStay works</h2>
            <p className="text-slate-500 font-medium">From voice to resolution in four automated steps.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map(({ step, role, action }, i) => (
              <div key={step} className="relative">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full hover:shadow-md transition-all">
                  <div className="text-4xl font-black text-slate-100 mb-3">{step}</div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-primary mb-1">{role}</div>
                  <p className="text-sm font-semibold text-slate-700">{action}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2 -translate-y-1/2 z-10 w-4 h-4 items-center justify-center text-slate-300">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles section ── */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Built for every role</h2>
          <p className="text-slate-500 font-medium mb-12">One platform, three tailored experiences.</p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { role: 'Resident', emoji: '🏠', perks: ['Voice issue reporting', 'Real-time status tracking', 'Technician contact info', 'Community join via code'] },
              { role: 'PG Owner', emoji: '🏢', perks: ['Community dashboard', 'Issue prioritization', 'Technician management', 'Member directory'] },
              { role: 'Technician', emoji: '🔧', perks: ['View assigned tasks', 'Update work status', 'In Progress / Resolved', 'Role-based login'] },
            ].map(({ role, emoji, perks }) => (
              <div key={role} className="bg-white border border-slate-200 rounded-2xl p-7 text-left hover:shadow-lg transition-all hover:border-slate-300">
                <div className="text-4xl mb-3">{emoji}</div>
                <h3 className="font-extrabold text-slate-900 text-xl mb-4">{role}</h3>
                <ul className="space-y-2">
                  {perks.map(p => (
                    <li key={p} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <CheckCircle size={14} className="text-emerald-500 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24 bg-slate-900 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Star size={32} className="text-yellow-400 mx-auto mb-6" />
          <h2 className="text-4xl font-black tracking-tight mb-4">Ready to modernize your PG?</h2>
          <p className="text-slate-400 font-medium mb-10 text-lg">Free to use. No credit card. Set up in under 5 minutes.</p>
          <button onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-extrabold px-10 py-4 rounded-2xl transition-all shadow-[0_8px_24px_rgba(255,255,255,0.15)] text-lg">
            Create your community <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
          <Building2 size={16} /> EaseStay
        </div>
        <p className="text-xs text-slate-400 font-medium">Voice-First PG Management · Built with React + Supabase + Groq AI</p>
      </footer>
    </div>
  );
}
