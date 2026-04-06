import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Save, Camera, Mail, Shield } from 'lucide-react';

export default function ProfilePage({ session }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
      }
      setLoading(false);
    }
    fetchProfile();
  }, [session]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, bio })
      .eq('id', session.user.id);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const roleLabel = { resident: 'Resident', owner: 'PG Owner', worker: 'Technician' };
  const roleBadge = {
    resident: 'bg-blue-50 text-blue-600 border-blue-200',
    owner: 'bg-primary/10 text-primary border-primary/20',
    worker: 'bg-amber-50 text-amber-600 border-amber-200'
  };

  if (loading) return (
    <div className="p-8 text-center text-slate-400 font-medium">Loading profile...</div>
  );

  return (
    <div className="max-w-2xl w-full space-y-8 text-left">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-slate-500 mt-2 font-medium">View and edit your account information.</p>
      </div>

      {/* Avatar Card */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-100 flex items-center justify-center border border-slate-200 shadow-sm">
            <span className="text-4xl font-extrabold text-primary">
              {fullName?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera size={20} className="text-white" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">{fullName || 'Unknown User'}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${roleBadge[profile?.role] || roleBadge.resident}`}>
              {roleLabel[profile?.role] || profile?.role}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 font-medium">
            <Mail size={14} />
            {session.user.email}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
          <User size={18} className="text-primary" /> Personal Information
        </h3>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}
        {saved && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-600 font-bold">
            ✓ Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="relative">
            <input
              type="text" required
              value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 pt-6 pb-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
            />
            <label className="absolute left-4 top-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Full Name</label>
          </div>

          <div className="relative">
            <input
              type="tel"
              value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 pt-6 pb-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium"
            />
            <label className="absolute left-4 top-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Phone Number</label>
          </div>

          <div className="relative">
            <textarea
              value={bio} onChange={e => setBio(e.target.value)}
              placeholder="A short bio about yourself..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 pt-7 pb-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm font-medium resize-none"
            />
            <label className="absolute left-4 top-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Bio</label>
          </div>

          <div className="relative">
            <input
              type="email"
              value={session.user.email}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 pt-6 pb-2 text-slate-400 cursor-not-allowed transition-all shadow-sm font-medium"
            />
            <label className="absolute left-4 top-2 text-[10px] uppercase tracking-wider font-bold text-slate-400">Email Address (read-only)</label>
          </div>

          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(0,0,0,0.1)] disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-primary" /> Account Details
        </h3>
        <div className="space-y-3 text-sm font-medium">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">User ID</span>
            <span className="text-slate-600 font-mono text-xs">{session.user.id.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">Role</span>
            <span className="text-slate-700">{roleLabel[profile?.role] || profile?.role}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">Member Since</span>
            <span className="text-slate-700">{new Date(profile?.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
