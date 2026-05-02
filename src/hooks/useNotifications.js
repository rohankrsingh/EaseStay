import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

/**
 * useNotifications — Supabase Realtime subscription hook for owner notifications.
 *
 * Subscribes to:
 *   1. `members` INSERT (new join requests with status = 'pending')
 *   2. `issues` INSERT (new issues reported by residents)
 *
 * Returns:
 *   - notifications: array of { id, type, title, body, timestamp, read }
 *   - unreadCount: number of unread notifications
 *   - markAllRead: function to mark all as read
 *   - clearAll: function to clear all notifications
 */
let _notifId = 0;

export default function useNotifications(communityId) {
  const [notifications, setNotifications] = useState([]);
  const channelRef = useRef(null);

  const addNotification = useCallback((notif) => {
    const id = ++_notifId;
    const entry = { ...notif, id, timestamp: new Date().toISOString(), read: false };
    setNotifications(prev => [entry, ...prev].slice(0, 50)); // Keep last 50

    // Fire global Sonner toast
    if (notif.type === 'join_request') {
      toast.info(notif.title, { description: notif.body, duration: 6000 });
    } else if (notif.type === 'emergency') {
      toast.error(notif.title, { description: notif.body, duration: 12000 });
    } else {
      toast(notif.title, { description: notif.body, duration: 5000 });
    }
  }, []);

  useEffect(() => {
    if (!communityId) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`notif_center_${communityId}`)
      // Listen for new join requests (members table INSERT with status = 'pending')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'members',
        filter: `community_id=eq.${communityId}`,
      }, (payload) => {
        const member = payload.new;
        if (member.status === 'pending') {
          addNotification({
            type: 'join_request',
            title: '👋 New Join Request',
            body: `Room ${member.room_number || '?'} — Waiting for your approval`,
            targetTab: 'community',
          });
        }
      })
      // Listen for new issues
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'issues',
        filter: `community_id=eq.${communityId}`,
      }, (payload) => {
        const issue = payload.new;
        const isEmergency = issue.priority === 'Critical' || issue.category === 'Emergency';
        addNotification({
          type: isEmergency ? 'emergency' : 'new_issue',
          title: isEmergency ? `🚨 EMERGENCY: ${issue.title}` : `📋 New Issue: ${issue.title}`,
          body: `${issue.category} · Room ${issue.room_number || '?'} · ${issue.priority} priority`,
          targetTab: 'issues',
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [communityId, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, unreadCount, markAllRead, clearAll };
}
