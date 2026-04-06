import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, Bell, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';

/**
 * Global real-time notification system.
 * Subscribes to new issues for the given communityId.
 * Returns a <NotificationContainer /> to render and a count of unread notifications.
 */

let toastId = 0;

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration || 6000);
    return () => clearTimeout(t);
  }, [toast.id]);

  const config = {
    emergency: { bg: 'bg-red-600', icon: <AlertTriangle size={18} />, border: 'border-red-700' },
    warning:   { bg: 'bg-orange-500', icon: <AlertTriangle size={18} />, border: 'border-orange-600' },
    success:   { bg: 'bg-emerald-600', icon: <CheckCircle size={18} />, border: 'border-emerald-700' },
    info:      { bg: 'bg-slate-800', icon: <Info size={18} />, border: 'border-slate-900' },
  };
  const c = config[toast.type] || config.info;

  return (
    <div className={`flex items-start gap-3 ${c.bg} border ${c.border} text-white px-5 py-4 rounded-2xl shadow-2xl min-w-[300px] max-w-[380px] animate-in slide-in-from-right-full duration-300`}>
      <div className="shrink-0 mt-0.5">{c.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-snug">{toast.title}</p>
        {toast.body && <p className="text-xs opacity-80 mt-0.5 leading-relaxed">{toast.body}</p>}
      </div>
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
}

// Global toast queue (module-level so any component can push)
let _pushToast = null;

export function pushToast(toast) {
  if (_pushToast) _pushToast(toast);
}

export default function NotificationSystem({ communityId, role }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  // Expose globally
  useEffect(() => {
    _pushToast = addToast;
    return () => { _pushToast = null; };
  }, [addToast]);

  // Subscribe to new issues in the community
  useEffect(() => {
    if (!communityId) return;

    const channel = supabase.channel(`notifications_${communityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'issues',
        filter: `community_id=eq.${communityId}`,
      }, (payload) => {
        const issue = payload.new;
        const isEmergency = issue.priority === 'Critical' || issue.category === 'Emergency';

        addToast({
          type: isEmergency ? 'emergency' : 'info',
          title: isEmergency ? `🚨 EMERGENCY: ${issue.title}` : `New Issue: ${issue.title}`,
          body: `${issue.category} · Room ${issue.room_number || '?'} · ${issue.priority} priority`,
          duration: isEmergency ? 15000 : 6000,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'issues',
        filter: `community_id=eq.${communityId}`,
      }, (payload) => {
        const issue = payload.new;
        const old = payload.old;
        if (issue.status !== old.status) {
          addToast({
            type: issue.status === 'Resolved' ? 'success' : 'info',
            title: `Issue ${issue.status}: ${issue.title}`,
            body: `Status changed to ${issue.status}`,
            duration: 4000,
          });
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [communityId]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
