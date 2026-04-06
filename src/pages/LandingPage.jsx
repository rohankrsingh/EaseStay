
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Mic, Users, Building2, CheckCircle, ArrowRight, BrainCircuit, Wrench, LayoutDashboard, Command, Bell, RotateCw } from 'lucide-react';

const features = [
  {
    icon: <Mic size={24} strokeWidth={1.5} />,
    title: 'Voice-First Reporting',
    desc: 'Speak your issue naturally — our AI transcribes and categorizes it instantly. No forms, no friction.',
    span: 'col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-transparent',
    iconColor: 'bg-white/10 text-white border-white/20',
    titleColor: 'text-white',
    descColor: 'text-slate-300',
  },
  {
    icon: <BrainCircuit size={24} strokeWidth={1.5} />,
    title: 'AI-Powered Triage',
    desc: 'Groq LLaMA categorizes priority and detects emergencies.',
    span: 'col-span-1 lg:col-span-1 bg-white border-slate-200 hover:shadow-lg',
    iconColor: 'bg-violet-50 text-violet-600 border-violet-100',
    titleColor: 'text-slate-900',
    descColor: 'text-slate-500',
  },
  {
    icon: <Wrench size={24} strokeWidth={1.5} />,
    title: 'Smart Dispatch',
    desc: 'Owners assign the right tech. Residents get direct contact info instantly.',
    span: 'col-span-1 lg:col-span-1 bg-white border-slate-200 hover:shadow-lg',
    iconColor: 'bg-amber-50 text-amber-600 border-amber-100',
    titleColor: 'text-slate-900',
    descColor: 'text-slate-500',
  },
  {
    icon: <Users size={24} strokeWidth={1.5} />,
    title: 'Community OS',
    desc: 'Manage roles, invites, and track every issue across the property from a unified command center.',
    span: 'col-span-1 md:col-span-2 lg:col-span-2 bg-slate-50 border-slate-200 hover:shadow-lg',
    iconColor: 'bg-blue-50 text-blue-600 border-blue-200',
    titleColor: 'text-slate-900',
    descColor: 'text-slate-500',
  },
];

const stats = [
  { value: '< 2s', label: 'AI Analysis' },
  { value: '3', label: 'Role Dashboards' },
  { value: '100%', label: 'Voice Native' },
  { value: '24/7', label: 'Emergency Alerts' },
];

const steps = [
  { step: '01', title: 'Resident Reports', desc: 'A resident logs an issue via voice or text message.', icon: <Mic size={28} strokeWidth={1.5} /> },
  { step: '02', title: 'AI Processes', desc: 'AI instantly categorizes the issue and assigns priority.', icon: <BrainCircuit size={28} strokeWidth={1.5} /> },
  { step: '03', title: 'Owner Gets Alerted', desc: 'The issue appears instantly on the live dashboard.', icon: <Bell size={28} strokeWidth={1.5} /> },
  { step: '04', title: 'Owner Dispatches', desc: 'With one click, the owner assigns an available technician.', icon: <LayoutDashboard size={28} strokeWidth={1.5} /> },
  { step: '05', title: 'Tech Resolves', desc: 'The technician fixes the problem and updates the status.', icon: <Wrench size={28} strokeWidth={1.5} /> },
  { step: '06', title: 'Real-Time Sync', desc: 'Everyone sees the completion instantly without reloading.', icon: <RotateCw size={28} strokeWidth={1.5} /> },
];

export default function LandingPage({ session }) {
  const navigate = useNavigate();
  const isLoggedIn = !!session;

  return (
    <div className="min-h-screen bg-white selection:bg-violet-200 overflow-hidden font-sans">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-100 transition-all">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shadow-inner">
              <Command size={18} className="text-white" />
            </div>
            <span className="font-display font-bold text-slate-900 text-xl tracking-tight">EaseStay</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <button onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-sm font-bold bg-slate-900 text-white px-5 py-2.5 rounded-full transition-all hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">
                <LayoutDashboard size={16} /> Enter App
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/auth')}
                  className="hidden sm:block text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors px-4 py-2 rounded-full">
                  Sign In
                </button>
                <button onClick={() => navigate('/auth')}
                  className="text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]">
                  Get Started →
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-20 px-6 max-w-[1400px] mx-auto">
        {/* Abstract Geometry */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-200/40 via-indigo-100/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none mix-blend-multiply opacity-70 animate-fade-in" />
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-fuchsia-100/40 via-violet-100/40 to-transparent rounded-full blur-3xl -z-10 pointer-events-none mix-blend-multiply opacity-70 animate-fade-in delay-200" />

        <div className="flex flex-col items-center text-center max-w-4.0xl mx-auto space-y-8 relative z-10">
          {/* <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm px-4 py-2 rounded-full text-xs font-extrabold tracking-widest text-slate-600 uppercase animate-fade-up">
            <span className="flex h-2 w-2 rounded-full bg-violet-600 animate-pulse"></span>
            EaseStay Platform 1.0
          </div> */}

          <h1 className="font-display text-5xl sm:text-[5.5rem] lg:text-[6.0rem] font-black text-slate-900 tracking-[-0.03em] leading-[0.95] animate-fade-up delay-100">
            From PG Complaint to Solution <br className="hidden lg:block" />
            <span className="relative">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800">Say It • Solve It • Done</span>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed animate-fade-up delay-200">
            A centralized smart platform that connects residents, owners, and technicians. Automate issue tracking, leverage AI for instant triage, and sync your entire PG perfectly in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4 animate-fade-up delay-300">
            <button onClick={() => navigate('/auth')}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-4 rounded-full transition-all shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 text-base w-full sm:w-auto">
              Start your community <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate('/auth')}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold px-8 py-4 rounded-full transition-all shadow-sm text-base w-full sm:w-auto hover:bg-slate-50">
              <Mic size={18} className="text-violet-600" /> Watch Voice Demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Demo Box (Grid Breaking) ── */}
      <section className="px-6 pb-24 max-w-[1000px] mx-auto relative z-20 animate-fade-up delay-300">
        <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl relative overflow-hidden group border border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <div className="bg-slate-950 rounded-[2rem] p-8 sm:p-12 relative z-10 border border-slate-800/50">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-800 pb-6">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="ml-4 text-xs font-mono text-slate-500">Live AI Triage Pipeline</span>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4 w-full">
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Input</span>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 relative overflow-hidden">
                    <Mic size={20} className="text-violet-400 relative z-10" />
                    <div className="absolute inset-0 bg-violet-500/20 animate-pulse" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-slate-300 font-medium leading-relaxed rounded-tl-none">
                    "Water is continuously leaking from the ceiling in room 302 and the power just tripped!"
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center md:h-32 text-slate-600 shrink-0">
                <ArrowRight size={24} className="rotate-90 md:rotate-0" />
              </div>

              <div className="flex-1 space-y-4 w-full">
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase text-violet-400 flex items-center gap-2">
                  <Zap size={14} /> AI Extracted Context
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-1">Priority</p>
                    <p className="font-bold text-red-500">Critical 🚨</p>
                  </div>
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400 font-bold mb-1">Category</p>
                    <p className="font-bold text-violet-300">Electrical Hazard</p>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 col-span-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Action</p>
                      <p className="font-bold text-slate-200 text-sm">Owner & Electrician Alerted</p>
                    </div>
                    <CheckCircle size={20} className="text-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="px-6 pb-32 max-w-[1400px] mx-auto border-b border-slate-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center group">
              <div className="font-display text-4xl sm:text-5xl font-black text-slate-900 mb-2 truncate transition-transform group-hover:-translate-y-1">{value}</div>
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Simple Workflow Steps ── */}
      <section className="px-6 py-32 max-w-[1400px] mx-auto border-b border-slate-100">
        <div className="text-center mb-20">
          <div className="inline-block bg-violet-50 text-violet-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6">How It Works</div>
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mb-6">Simple Workflow. <br className="hidden sm:block"/>Maximum Impact.</h2>
          <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-2xl mx-auto">See how a complaint goes from a quick voice note to a completely resolved issue without any friction.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {steps.map(({ step, title, desc, icon }) => (
            <div key={step} className="bg-white border border-slate-200 p-8 sm:p-10 rounded-[2.5rem] hover:shadow-2xl hover:shadow-violet-500/5 hover:-translate-y-1 hover:border-violet-200 transition-all duration-300 group flex flex-col items-start gap-8">
              <div className="w-full flex items-center justify-between">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-all duration-300 shadow-sm">
                  {icon}
                </div>
                <span className="font-display font-black text-5xl text-slate-100 group-hover:text-violet-100 transition-colors uppercase">{step}</span>
              </div>
              
              <div>
                <h3 className="font-display text-2xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Bento Grid ── */}
      <section className="px-6 py-32 max-w-[1400px] mx-auto">
        <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
          <div>
            <h2 className="font-display text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.05] mb-6">
              A smarter way to run <br className="hidden sm:block" />
              your property.
            </h2>
          </div>
          <p className="text-lg text-slate-500 font-medium max-w-lg leading-relaxed">
            Forget messy WhatsApp groups and endless phone calls. EaseStay brings order to chaos with an intelligent, self-organizing pipeline.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {features.map(({ icon, title, desc, span, iconColor, titleColor, descColor }) => (
            <div key={title} className={`p-8 sm:p-10 rounded-[2rem] border transition-all duration-300 ${span}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border shadow-sm ${iconColor}`}>
                {icon}
              </div>
              <h3 className={`font-display text-2xl font-bold tracking-tight mb-3 ${titleColor}`}>{title}</h3>
              <p className={`font-medium leading-relaxed max-w-md ${descColor} opacity-90`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role Features ── */}
      <section className="px-6 py-32 bg-slate-50 border-t border-slate-100">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-display text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-6">Engineered for everyone.</h2>
            <p className="text-slate-500 font-medium text-lg">One unified platform serving three distinct experiences.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { role: 'Resident', icon: <Mic />, features: ['Zero-friction voice reports', 'Real-time issue tracking', 'Community directory', 'Direct tech contact'] },
              { role: 'PG Owner', icon: <LayoutDashboard />, features: ['Global visibility board', 'AI categorized queues', '1-click technician dispatch', 'Member role control'] },
              { role: 'Technician', icon: <Wrench />, features: ['Dedicated task queue', 'Instant status updates', 'Location & room details', 'Resident contact links'] },
            ].map(({ role, icon, features }) => (
              <div key={role} className="bg-white rounded-[2rem] p-8 border border-slate-200">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900">
                    {icon}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-slate-900">{role}</h3>
                </div>
                <ul className="space-y-4">
                  {features.map(f => (
                    <li key={f} className="flex gap-3 text-slate-600 font-medium items-start">
                      <div className="mt-1 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                        <CheckCircle size={10} strokeWidth={3} />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer / CTA ── */}
      <footer className="relative bg-slate-950 text-white overflow-hidden">
        {/* Abstract shapes */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 px-6 py-32 max-w-4xl mx-auto text-center border-b border-slate-800">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-12">
            <Command size={32} className="-rotate-12 text-white" />
          </div>
          <h2 className="font-display text-5xl sm:text-7xl font-black tracking-[-0.03em] mb-6 drop-shadow-sm">Modernize your property today.</h2>
          <p className="text-slate-400 font-medium text-lg sm:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Stop losing track of maintenance requests. Join EaseStay and run your community efficiently, transparently, and cleanly.
          </p>
          <button onClick={() => navigate('/auth')}
            className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 font-bold px-10 py-5 rounded-full transition-all hover:bg-slate-200 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)] text-lg">
            Create Free Account <ArrowRight size={20} />
          </button>
        </div>

        <div className="relative z-10 px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-6 max-w-[1400px] mx-auto text-sm text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <Command size={16} className="text-slate-400" /> EaseStay Platform
          </div>
          <div className="flex gap-6">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Twitter</span>
          </div>
          <div>© {new Date().getFullYear()} EaseStay. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
