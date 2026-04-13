import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PublicNavbar from '../components/PublicNavbar';
import { 
  Building2, Star, MapPin, CheckCircle2, ChevronLeft, ChevronRight, 
  Wifi, ShieldCheck, Shirt, Utensils, Waves, Car, SplitSquareHorizontal, Info, MessageSquare, Phone, Mail, X
} from 'lucide-react';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1de2d9d00c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1628592102751-ba83b0314276?auto=format&fit=crop&w=1200&q=80'
];

const DEFAULT_FEATURES = [
  "High-Speed WiFi", "Air Conditioned", "24/7 Security", 
  "Daily Cleaning", "In-house Laundry", "Fully Furnished"
];

const getFeatureIcon = (text) => {
  const t = text.toLowerCase();
  if (t.includes('wifi') || t.includes('internet')) return <Wifi size={20} />;
  if (t.includes('secur') || t.includes('guard')) return <ShieldCheck size={20} />;
  if (t.includes('laundry') || t.includes('wash')) return <Shirt size={20} />;
  if (t.includes('food') || t.includes('meal')) return <Utensils size={20} />;
  if (t.includes('pool')) return <Waves size={20} />;
  if (t.includes('park')) return <Car size={20} />;
  if (t.includes('ac ') || t.includes('air')) return <SplitSquareHorizontal size={20} />;
  return <CheckCircle2 size={20} />;
};

function StarDisplay({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={14} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
      ))}
    </span>
  );
}

export default function CommunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [com, setCom] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  // Join request state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [joinStatus, setJoinStatus] = useState(null); // null | 'pending' | 'active' | 'sending'
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => {
    async function fetchAll() {
      const [{ data: community }, { data: reviewData }] = await Promise.all([
        supabase
          .from('communities')
          .select('*, profiles:owner_id(full_name, phone, email: id)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('reviews')
          .select('*, profiles:resident_id(full_name)')
          .eq('community_id', id)
          .order('created_at', { ascending: false })
      ]);

      if (community) setCom(community);
      setReviews(reviewData || []);

      // Check if current user already has a membership
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) {
        const { data: mem } = await supabase
          .from('members')
          .select('status')
          .eq('user_id', s.user.id)
          .eq('community_id', id)
          .maybeSingle();
        if (mem) setJoinStatus(mem.status);
      }

      setLoading(false);
    }
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin text-violet-600"><Building2 size={40} /></div>
      </div>
    );
  }

  if (!com) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Community Not Found</h2>
        <button onClick={() => navigate('/communities')} className="text-violet-600 font-bold hover:underline">Return to Directory</button>
      </div>
    );
  }

  const images = (com.images && com.images.length > 0) ? com.images : FALLBACK_IMAGES;
  const featuresList = (com.features && com.features.length > 0) ? com.features : DEFAULT_FEATURES;
  const address = com.location_address || "Community Address Not Provided";

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length);

  const handleJoinRequest = async (e) => {
    e.preventDefault();
    if (!session) { navigate('/auth'); return; }
    setJoinStatus('sending');
    setJoinError('');
    try {
      const { error } = await supabase.from('members').insert({
        user_id: session.user.id,
        community_id: id,
        room_number: roomNumber || 'TBD',
        status: 'pending',
      });
      if (error) throw error;
      setJoinStatus('pending');
      setShowJoinModal(false);
    } catch (err) {
      setJoinError(err.message.includes('unique') ? 'You already have a pending or active membership for this PG.' : err.message);
      setJoinStatus(null);
    }
  };

  const joinButtonLabel = () => {
    if (joinStatus === 'pending') return '⏳ Request Pending';
    if (joinStatus === 'active') return '✅ Already a Member';
    if (joinStatus === 'sending') return 'Sending...';
    return 'Request to Join';
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-violet-200 pb-24">
      <PublicNavbar />

      {/* Join Request Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
            <button onClick={() => setShowJoinModal(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100"><X size={18} /></button>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Join {com.name}</h2>
            <p className="text-slate-500 text-sm mb-6">Your request will be sent to the owner for approval.</p>
            <form onSubmit={handleJoinRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Room Number (optional)</label>
                <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101 or TBD"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 font-medium text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition placeholder:text-slate-400" />
              </div>
              {joinError && <p className="text-red-600 text-sm font-semibold">{joinError}</p>}
              <button type="submit" className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors shadow-md">
                Send Request
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-28">
        {/* Title Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5"><ShieldCheck size={14}/> Verified PG</span>
              <span className="flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-full text-xs">
                <Star size={14} className="fill-amber-500"/>
                {avgRating ? `${avgRating} (${reviews.length} reviews)` : 'No reviews yet'}
              </span>
              {com.free_rooms !== undefined && (
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1.5 ${com.free_rooms > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {com.free_rooms > 0 ? `${com.free_rooms} Rooms Available` : 'Fully Booked'}
                </span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-2 truncate">{com.name}</h1>
            <p className="flex items-center gap-2 text-slate-500 font-medium">
              <MapPin size={18} className="text-slate-400" /> {address}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
             <button
               onClick={() => joinStatus ? null : (session ? setShowJoinModal(true) : navigate('/auth'))}
               disabled={joinStatus === 'pending' || joinStatus === 'active' || joinStatus === 'sending'}
               className={`font-bold py-3 px-8 rounded-full shadow-lg text-lg transition-all hover:-translate-y-0.5 active:scale-95 ${
                 joinStatus === 'pending' ? 'bg-amber-100 text-amber-700 cursor-not-allowed shadow-none' :
                 joinStatus === 'active' ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed shadow-none' :
                 'bg-violet-600 hover:bg-violet-700 text-white hover:shadow-xl'
               }`}
             >
               {joinButtonLabel()}
             </button>
          </div>
        </div>

        {/* Image Carousel */}
        <div className="relative group rounded-[2rem] overflow-hidden bg-slate-100 aspect-[16/9] md:aspect-[21/9] mb-12 shadow-inner border border-slate-200">
          <img 
            src={images[activeImage]} 
            alt="Community Area" 
            className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          
          {images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/90 text-white hover:text-slate-900 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-xl"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={nextImage}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/90 text-white hover:text-slate-900 backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 shadow-xl"
              >
                <ChevronRight size={24} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {images.map((_, i) => (
                  <div key={i} className={`h-2 rounded-full transition-all ${i === activeImage ? 'w-8 bg-white' : 'w-2 bg-white/50'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Main Column */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Description */}
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2"><Info size={24} className="text-violet-500"/> About this Community</h2>
              <div className="text-lg text-slate-600 leading-relaxed font-medium">
                {com.description || "Experience premium community living with state-of-the-art facilities, fully managed services, and an amazing environment designed for modern residents."}
              </div>
            </section>

            <hr className="border-slate-100 border-2 rounded-full" />

            {/* Features */}
            <section>
               <h2 className="text-2xl font-black text-slate-900 mb-6">Premium Features</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {featuresList.map((feature, i) => (
                   <div key={i} className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl hover:border-violet-300 transition-colors">
                     <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl text-violet-600 shadow-sm shrink-0">
                       {getFeatureIcon(feature)}
                     </div>
                     <span className="font-bold text-slate-700 text-lg">{feature}</span>
                   </div>
                 ))}
               </div>
            </section>

            <hr className="border-slate-100 border-2 rounded-full" />

            {/* Reviews Section */}
            <section>
              <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-2">
                <MessageSquare size={24} className="text-violet-500" /> Resident Reviews
                {avgRating && (
                  <span className="ml-2 flex items-center gap-1.5 text-base font-bold text-amber-500">
                    <Star size={18} className="fill-amber-400 text-amber-400" /> {avgRating}
                    <span className="text-slate-400 font-semibold text-sm">({reviews.length})</span>
                  </span>
                )}
              </h2>

              {reviews.length === 0 ? (
                <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 font-medium text-sm">
                  No reviews yet — residents can rate this PG from their dashboard!
                </div>
              ) : (
                <div className="space-y-4 mt-6">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 font-black text-sm flex items-center justify-center uppercase shrink-0">
                            {(review.profiles?.full_name || 'A').charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{review.profiles?.full_name || 'Anonymous Resident'}</p>
                            <p className="text-xs text-slate-400 font-medium">{new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <StarDisplay rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-slate-600 font-medium text-sm leading-relaxed">"{review.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            
            {/* Location Panel */}
            <div className="bg-white border text-center border-slate-200 rounded-[2rem] overflow-hidden shadow-lg p-1">
               <div className="h-48 bg-slate-100 rounded-t-[1.75rem] relative flex flex-col items-center justify-center overflow-hidden border border-slate-200">
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />
                 <div className="relative z-10 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-xl animate-bounce shadow-red-500/20 text-white">
                   <MapPin size={24} />
                 </div>
                 <div className="relative z-10 mt-3 text-red-600 font-bold text-sm bg-red-100/80 px-3 py-1 rounded-full">Location</div>
               </div>
               <div className="p-6">
                 <h3 className="text-lg font-bold text-slate-900 mb-2 truncate">Address</h3>
                 <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">{address}</p>
                 <button className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors">
                   Get Directions
                 </button>
               </div>
            </div>

            {/* Manager Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 text-center">
              <div className="w-20 h-20 bg-violet-100 text-violet-600 font-black text-2xl flex items-center justify-center rounded-full mx-auto mb-4 border-4 border-white shadow-sm uppercase">
                 {(com.profiles?.full_name || 'U').charAt(0)}
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-1">{com.profiles?.full_name || 'Verified Owner'}</h3>
              <p className="text-slate-500 text-sm font-medium mb-4">Property Manager • EaseStay Verified</p>

              <div className="space-y-2 mb-5">
                {com.profiles?.phone && (
                  <a href={`tel:${com.profiles.phone}`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors">
                    <Phone size={15} className="text-violet-500" /> {com.profiles.phone}
                  </a>
                )}
                {!com.profiles?.phone && (
                  <p className="text-xs text-slate-400 font-medium">No contact info provided by owner</p>
                )}
              </div>

              <button
                onClick={() => joinStatus ? null : (session ? setShowJoinModal(true) : navigate('/auth'))}
                disabled={joinStatus === 'pending' || joinStatus === 'active'}
                className={`w-full py-2.5 font-bold rounded-xl transition-colors text-sm ${
                  joinStatus === 'pending' ? 'bg-amber-50 border border-amber-200 text-amber-700 cursor-not-allowed' :
                  joinStatus === 'active' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-not-allowed' :
                  'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
                }`}
              >
                {joinButtonLabel()}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
