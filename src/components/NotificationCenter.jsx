import { useState, useRef, useEffect } from 'react';
import { Bell, X, UserPlus, AlertTriangle, ClipboardList, Check, Trash2 } from 'lucide-react';

/**
 * NotificationCenter — Bell icon + dropdown panel for the dashboard header.
 *
 * Props:
 *   - notifications: array from useNotifications
 *   - unreadCount: number
 *   - markAllRead: function
 *   - clearAll: function
 *   - onNavigate: (targetTab) => void — callback to switch dashboard tabs
 */
export default function NotificationCenter({ notifications, unreadCount, markAllRead, clearAll, onNavigate }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    setOpen(prev => !prev);
    if (!open && unreadCount > 0) markAllRead();
  };

  const getIcon = (type) => {
    if (type === 'join_request') return <UserPlus size={14} className="text-blue-500 shrink-0" />;
    if (type === 'emergency') return <AlertTriangle size={14} className="text-red-500 shrink-0" />;
    return <ClipboardList size={14} className="text-amber-500 shrink-0" />;
  };

  const timeAgo = (ts) => {
    const diff = Math.max(0, Date.now() - new Date(ts).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-extrabold text-white bg-red-500 rounded-full ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[420px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={10} /> Clear all
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Bell size={32} className="mb-3 text-slate-300" />
                <p className="text-sm font-semibold">No notifications yet</p>
                <p className="text-xs font-medium mt-1">New issues and join requests will appear here</p>
              </div>
            ) : (
              notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => {
                    if (notif.targetTab && onNavigate) onNavigate(notif.targetTab);
                    setOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!notif.read ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!notif.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{notif.body}</p>
                    )}
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">{timeAgo(notif.timestamp)}</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => { markAllRead(); }}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors py-1"
              >
                <Check size={12} /> Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
