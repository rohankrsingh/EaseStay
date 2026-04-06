import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, User, KeyRound, Mail, ArrowRight, ShieldCheck, Zap, Mic, AlertCircle, Wrench } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('resident');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        if (data?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, full_name: fullName, role: role }]);
          if (profileError) throw profileError;
          if (!data.session) {
            setSuccessMsg("Account created! Please check your email to verify your address.");
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'resident', label: 'Resident', icon: User },
    { id: 'owner', label: 'Owner', icon: KeyRound },
    { id: 'worker', label: 'Technician', icon: Wrench },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 flex overflow-hidden selection:bg-primary/20">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/5 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[40%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-purple-700/5 blur-[100px] mix-blend-multiply" />
      </div>

      <div className="relative z-10 flex w-full max-w-7xl mx-auto">
        {/* Left Presentation */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 xl:p-24">
          <div>
            <div className="flex items-center gap-3 font-bold text-2xl tracking-tighter mb-16 text-slate-800">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center shadow-[0_0_20px_rgba(170,59,255,0.2)]">
                <Building2 size={24} className="text-white" />
              </div>
              <span>Ease<span className="text-primary">Stay</span></span>
            </div>
            <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6 text-slate-900">
              Smarter living, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                simplified management.
              </span>
            </h1>
            <p className="text-lg text-slate-500 max-w-md leading-relaxed mb-12">
              The premier platform connecting PG residents with owners through seamless voice-first issue tracking and real-time updates.
            </p>
            <div className="space-y-4">
              {[
                { icon: Mic, text: 'Instant Voice-to-Text Reporting' },
                { icon: Zap, text: 'AI-Powered Issue Categorization' },
                { icon: ShieldCheck, text: 'Real-Time Tracking & Resolution' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 text-sm font-medium text-slate-700 bg-white/60 w-max px-5 py-3 rounded-2xl border border-slate-200/60 backdrop-blur-md shadow-sm">
                  <Icon className="text-primary" size={20} />
                  {text}
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-400">© 2026 EaseStay Management. All rights reserved.</p>
        </div>

        {/* Right Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[440px]">
            <div className="lg:hidden mb-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-400 flex items-center justify-center shadow-[0_0_30px_rgba(170,59,255,0.2)] mb-6">
                <Building2 size={32} className="text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">EaseStay</h1>
              <p className="text-slate-500 mt-2 font-medium">Next-gen PG Management</p>
            </div>

            <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/60 p-8 md:p-10 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

              <div className="mb-8">
                <h2 className="text-2xl font-extrabold tracking-tight mb-2 text-slate-900">
                  {isLogin ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  {isLogin ? 'Enter your details to access your dashboard' : 'Join the newest era of property management'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="font-medium">{error}</p>
                </div>
              )}
              {successMsg && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="font-medium">{successMsg}</p>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-5">
                    {/* Role Selector */}
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 gap-1">
                      {roles.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setRole(id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                            role === id
                              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon size={14} /> {label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <input
                        type="text" placeholder="John Doe" required
                        value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 pt-6 pb-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
                      />
                      <label className="absolute left-4 top-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Full Name</label>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="email" placeholder="name@example.com" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 pt-6 pb-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
                  />
                  <label className="absolute left-4 top-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Email Address</label>
                </div>

                <div className="relative">
                  <input
                    type="password" placeholder="••••••••" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 pt-6 pb-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
                  />
                  <label className="absolute left-4 top-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Password</label>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="relative group w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-4 font-bold text-white shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] transition-all disabled:opacity-50 overflow-hidden"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  <span className="relative flex items-center gap-2">
                    {loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}
                    {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  </span>
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-primary hover:underline underline-offset-4 transition-colors">
                    {isLogin ? 'Create one now' : 'Sign in instead'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
