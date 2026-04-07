import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Building2, ChevronRight, Users, ShieldCheck, ArrowLeft, Zap } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommunities() {
      const [{ data: comms }, { data: metrics }] = await Promise.all([
        supabase.from('communities').select('*, profiles:owner_id(full_name)').order('created_at', { ascending: false }),
        supabase.from('community_metrics').select('*')
      ]);

      if (comms) {
        const metricsMap = Object.fromEntries((metrics || []).map(m => [m.community_id, m]));
        
        const sortedComms = comms.map(com => {
          const m = metricsMap[com.id] || { scale: 0, issues_resolved: 0, avg_resolution_hours: 0, resident_rating: 0, total_reviews: 0 };
          
          let residentScore = m.resident_rating > 0 ? m.resident_rating : 3.5; 
          let speedBonus = m.issues_resolved > 0 ? Math.max(0, (24 - m.avg_resolution_hours) * 0.03) : 0;
          let scaleBonus = Math.min(0.5, (m.scale + (m.issues_resolved * 2)) * 0.01);
          
          let rawRank = residentScore + speedBonus + scaleBonus;
          let finalDisplayRating = Math.min(5.0, Math.max(1.0, rawRank));

          return { ...com, metrics: m, displayRating: finalDisplayRating, speedBonus };
        }).sort((a, b) => b.displayRating - a.displayRating);

        setCommunities(sortedComms);
      }
      setLoading(false);
    }
    fetchCommunities();
  }, []);

  // Visual placeholders since real image uploads don't exist yet
  const getGradient = (i) => {
    const gradients = [
      'from-violet-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-400 to-rose-500',
      'from-blue-500 to-sky-400',
      'from-amber-400 to-orange-500',
      'from-fuchsia-500 to-pink-600'
    ];
    return gradients[i % gradients.length];
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-violet-200">
      
      <PublicNavbar />

      {/* ── Hero ── */}
      <header className="pt-32 pb-16 px-6 relative overflow-hidden bg-white border-b border-slate-200">
        <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-[size:20px_20px]" />
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-violet-50/50 to-transparent pointer-events-none" />
        
        <div className="max-w-[1200px] mx-auto relative z-10 text-center">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mb-6 font-display">
            Find the perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Community.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Browse verified PG accommodations managed on the EaseStay ecosystem. Top-rated communities with 24/7 AI-assisted maintenance.
          </p>
        </div>
      </header>

      {/* ── Directory Grid ── */}
      <main className="max-w-[1200px] mx-auto px-6 py-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-3xl h-80 border border-slate-200" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="mx-auto text-slate-300 mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Communities Found</h3>
            <p className="text-slate-500">There are no publicly listed communities at this moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
             {communities.map((com, idx) => (
                <div 
                  key={com.id} 
                  onClick={() => navigate(`/communities/${com.id}`)}
                  className="cursor-pointer group bg-white border border-slate-200 hover:border-violet-200 rounded-[2rem] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Card Cover */}
                  <div className={`h-32 bg-gradient-to-br ${getGradient(idx)} relative p-6 flex items-start justify-between`}>
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                    <div className="relative z-10 flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm">
                      <ShieldCheck size={14} /> Verified Manager
                    </div>
                    {/* Rating Badge */}
                    <div className="relative z-10 flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-lg text-xs font-black text-slate-900">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      {Number(com.displayRating || 4.5).toFixed(1)}
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div className="p-6 sm:p-8 flex-1 flex flex-col relative bg-white">
                    {/* Avatar Overlap */}
                    <div className="absolute -top-10 right-8 w-16 h-16 rounded-2xl bg-white p-1.5 shadow-md">
                      <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center font-black text-xl text-slate-400 uppercase">
                        {com.name.charAt(0)}
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 mb-2 truncate pr-16">{com.name}</h3>
                    
                    <div className="flex flex-col gap-2.5 mt-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Users size={16} className="text-slate-400" />
                        Managed by <span className="text-slate-700 font-bold">{com.profiles?.full_name || 'Owner'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <ShieldCheck size={16} className="text-slate-400" />
                        {com.metrics.issues_resolved > 0 ? `${com.metrics.issues_resolved} Issues Resolved` : 'Always Maintained'}
                      </div>
                      {com.speedBonus > 0.3 && (
                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 w-max px-2.5 py-1 rounded-lg">
                          <Zap size={14} className="fill-emerald-600" /> Rapid Resolution
                        </div>
                      )}
                    </div>

                    {/* Footer Auth Call to action */}
                    <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                       <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                         View Details
                       </div>
                       <button onClick={(e) => {
                           e.stopPropagation();
                           navigate(`/communities/${com.id}`);
                         }}
                         className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 hover:bg-violet-600 text-slate-600 hover:text-white transition-all group-hover:scale-110">
                         <ChevronRight size={18} />
                       </button>
                    </div>
                  </div>
                </div>
             ))}
          </div>
        )}
      </main>
      
      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
             <Building2 size={24} /> EaseStay
          </div>
          <p className="text-slate-500 font-medium">© {new Date().getFullYear()} EaseStay Platform. Simplifying accommodations.</p>
        </div>
      </footer>
    </div>
  );
}
