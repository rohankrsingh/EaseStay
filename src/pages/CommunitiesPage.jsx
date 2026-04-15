import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Star, Building2, ChevronRight, Users, ShieldCheck, ArrowLeft, Zap, Search, Filter, X } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [filteredCommunities, setFilteredCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(5);
  const [minReviews, setMinReviews] = useState(0);
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'reviews', 'name'
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function fetchCommunities() {
      const [{ data: comms }, { data: metrics }] = await Promise.all([
        supabase.from('communities').select('*, profiles:owner_id(full_name)').order('created_at', { ascending: false }),
        supabase.from('community_metrics').select('*')
      ]);

      if (comms) {
        const metricsMap = Object.fromEntries((metrics || []).map(m => [m.community_id, m]));
        const allRated = (metrics || []).filter((item) => Number(item.resident_rating || 0) > 0);
        const globalAverageRating = allRated.length > 0
          ? allRated.reduce((sum, item) => sum + Number(item.resident_rating || 0), 0) / allRated.length
          : 3.8;
        const minReviewsForConfidence = 10; // Confidence threshold like marketplace apps
        
        const sortedComms = comms.map(com => {
          const m = metricsMap[com.id] || { scale: 0, issues_resolved: 0, avg_resolution_hours: 0, resident_rating: 0, total_reviews: 0 };

          // Swiggy/Zomato-style Bayesian rating so low-review PGs cannot dominate rankings.
          const reviewCount = Number(m.total_reviews || 0);
          const residentRating = Number(m.resident_rating || 0);
          const bayesianRating = (
            ((reviewCount / (reviewCount + minReviewsForConfidence)) * (residentRating > 0 ? residentRating : globalAverageRating)) +
            ((minReviewsForConfidence / (reviewCount + minReviewsForConfidence)) * globalAverageRating)
          );
          
          // Give stronger weight to issue resolution volume and proven track record.
          const resolvedCount = Number(m.issues_resolved || 0);
          const speedScore = resolvedCount > 0 ? Math.max(0, Math.min(5, 5 - ((m.avg_resolution_hours || 0) / 16))) : 2.5;
          const volumeScore = Math.min(5, 1.2 + (Math.log1p(resolvedCount) * 1.15));
          const issueBaseScore = (speedScore * 0.25) + (volumeScore * 0.75);
          const issueConfidence = Math.min(1, resolvedCount / 40);
          const provenIssueScore = (issueBaseScore * issueConfidence) + (globalAverageRating * (1 - issueConfidence));

          // Reviews still matter, but operational proof has higher impact.
          const rawScore = Math.min(5.0, Math.max(1.0, (bayesianRating * 0.35) + (provenIssueScore * 0.65)));

          // Hard cap for unrated PGs so reviewed PGs are prioritized in ranking.
          const finalDisplayRating = reviewCount === 0 ? Math.min(3.0, rawScore) : rawScore;

          return {
            ...com,
            metrics: m,
            displayRating: finalDisplayRating,
            resolutionScore: issueBaseScore,
            reviewConfidence: Math.min(1, reviewCount / minReviewsForConfidence)
          };
        }).sort((a, b) => b.displayRating - a.displayRating);

        setCommunities(sortedComms);
      }
      setLoading(false);
    }
    fetchCommunities();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = communities;

    // Search by name or owner
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(com => 
        com.name.toLowerCase().includes(query) || 
        (com.profiles?.full_name || '').toLowerCase().includes(query)
      );
    }

    // Filter by rating range
    result = result.filter(com => 
      com.displayRating >= minRating && com.displayRating <= maxRating
    );

    // Filter by minimum reviews
    result = result.filter(com => 
      (com.metrics.total_reviews || 0) >= minReviews
    );

    // Sort
    if (sortBy === 'rating') {
      result.sort((a, b) => b.displayRating - a.displayRating);
    } else if (sortBy === 'reviews') {
      result.sort((a, b) => (b.metrics.total_reviews || 0) - (a.metrics.total_reviews || 0));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredCommunities(result);
  }, [communities, searchQuery, minRating, maxRating, minReviews, sortBy]);

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
        <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-size-[20px_20px]" />
        <div className="absolute right-0 top-0 w-1/2 h-full bg-linear-to-l from-violet-50/50 to-transparent pointer-events-none" />
        
        <div className="max-w-300 mx-auto relative z-10 text-center">
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mb-6 font-display">
            Find the perfect <span className="text-transparent bg-clip-text bg-linear-to-r from-violet-600 to-indigo-600">Community.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Browse verified PG accommodations managed on the EaseStay ecosystem. Top-rated communities with 24/7 AI-assisted maintenance.
          </p>
        </div>
      </header>

      {/* ── Search & Filters ── */}
      <main className="max-w-300 mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by community name or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 text-slate-900 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex gap-4 items-center mb-8 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-colors"
          >
            <Filter size={18} />
            Filters
            {(minRating > 0 || maxRating < 5 || minReviews > 0) && (
              <span className="ml-1 bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                {(minRating > 0 ? 1 : 0) + (maxRating < 5 ? 1 : 0) + (minReviews > 0 ? 1 : 0)}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-100"
            >
              <option value="rating">Rating (Highest)</option>
              <option value="reviews">Reviews (Most)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Active Filter Count */}
          {(searchQuery || minRating > 0 || maxRating < 5 || minReviews > 0) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setMinRating(0);
                setMaxRating(5);
                setMinReviews(0);
              }}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Clear all
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-4">
                  Rating: {minRating.toFixed(1)} - {maxRating.toFixed(1)}
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={minRating}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val <= maxRating) setMinRating(val);
                      }}
                      className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={maxRating}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val >= minRating) setMaxRating(val);
                      }}
                      className="flex-1 h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    />
                  </div>
                </div>
              </div>

              {/* Reviews Filter */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-4">
                  Minimum Reviews: {minReviews}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={minReviews}
                  onChange={(e) => setMinReviews(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0</span>
                  <span>100+</span>
                </div>
              </div>

              {/* Filter Summary */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-4">
                  Results: {filteredCommunities.length}
                </label>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>• Rating: {minRating.toFixed(1)} - {maxRating.toFixed(1)} ⭐</p>
                  <p>• Reviews: {minReviews}+</p>
                  <p>• Sorted by: <span className="font-semibold capitalize">{sortBy}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Directory Grid ── */}
      <main className="max-w-300 mx-auto px-6 py-4 pb-16">
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
        ) : filteredCommunities.length === 0 ? (
          <div className="text-center py-20">
            <Search size={48} className="mx-auto text-slate-300 mb-6" />
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Results Found</h3>
            <p className="text-slate-500 mb-6">Try adjusting your search terms or filters to find communities.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setMinRating(0);
                setMaxRating(5);
                setMinReviews(0);
              }}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredCommunities.map((com, idx) => (
                <div 
                  key={com.id} 
                  onClick={() => navigate(`/communities/${com.id}`)}
                  className="cursor-pointer group bg-white border border-slate-200 hover:border-violet-200 rounded-4xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Card Cover */}
                  <div className={`h-32 bg-linear-to-br ${getGradient(idx)} relative p-6 flex items-start justify-between`}>
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
                      {com.resolutionScore >= 3.9 && (
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
        <div className="max-w-300 mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
             <Building2 size={24} /> EaseStay
          </div>
          <p className="text-slate-500 font-medium">© {new Date().getFullYear()} EaseStay Platform. Simplifying accommodations.</p>
        </div>
      </footer>
    </div>
  );
}
