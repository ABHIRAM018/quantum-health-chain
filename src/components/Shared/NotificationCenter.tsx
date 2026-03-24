import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Calendar, FileText, CreditCard, Shield, AlertTriangle, Info } from 'lucide-react';
import { Notification } from '../../types';
import { notifications as mockNotifications } from '../../data/mockDatabase';

interface NotificationCenterProps { userId: string; }

const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000';

const typeIcon = (type: Notification['type']) => {
  const cls = 'w-4 h-4';
  switch (type) {
    case 'appointment':  return <Calendar className={`${cls} text-blue-400`} />;
    case 'prescription': return <FileText className={`${cls} text-green-600`} />;
    case 'bill':         return <CreditCard className={`${cls} text-yellow-600`} />;
    case 'claim':        return <Shield className={`${cls} text-purple-600`} />;
    case 'payment':      return <CreditCard className={`${cls} text-teal-600`} />;
    case 'consent':      return <Shield className={`${cls} text-rose-600`} />;
    case 'alert':        return <AlertTriangle className={`${cls} text-red-600`} />;
    default:             return <Info className={`${cls} text-gray-400`} />;
  }
};

const timeAgo = (date: Date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── in-memory store so addNotification() works across components ──
let _listeners: Array<() => void> = [];
const _live: Notification[] = [];

export const addNotification = (notif: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
  const n: Notification = { ...notif, id: `notif-${Date.now()}`, read: false, createdAt: new Date() };
  _live.unshift(n);
  mockNotifications.unshift(n);
  _listeners.forEach(fn => fn());
  // Also persist to server non-blocking
  const token = localStorage.getItem('auth_token');
  fetch(`${BASE}/api/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(notif),
  }).catch(() => {});
  return n;
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId }) => {
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    fetch(`${BASE}/api/notifications`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(2000),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.length) {
          const mapped: Notification[] = data.map((r: any) => ({
            id: r.id, userId: r.user_id ?? r.userId,
            title: r.title, message: r.message, type: r.type,
            read: r.read, actionUrl: r.action_url ?? r.actionUrl,
            createdAt: new Date(r.created_at ?? r.createdAt),
          }));
          // merge live (just-added) + server
          const serverIds = new Set(mapped.map(n => n.id));
          const liveOnly = _live.filter(n => !serverIds.has(n.id) && n.userId === userId);
          setItems([...liveOnly, ...mapped]);
        } else {
          // fallback to mock
          const mock = mockNotifications.filter(n => n.userId === userId);
          const liveOnly = _live.filter(n => !mock.find(m => m.id === n.id) && n.userId === userId);
          setItems([...liveOnly, ...mock]);
        }
      })
      .catch(() => {
        const mock = mockNotifications.filter(n => n.userId === userId);
        const liveOnly = _live.filter(n => !mock.find(m => m.id === n.id) && n.userId === userId);
        setItems([...liveOnly, ...mock]);
      });
  }, [userId]);

  useEffect(() => {
    load();
    // re-render when addNotification() fires
    _listeners.push(load);
    // poll every 30s for real-time feel
    const interval = setInterval(load, 30000);
    return () => {
      _listeners = _listeners.filter(fn => fn !== load);
      clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = items.filter(n => !n.read).length;

  const markRead = (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const token = localStorage.getItem('auth_token');
    fetch(`${BASE}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).catch(() => {});
    const n = mockNotifications.find(x => x.id === id);
    if (n) n.read = true;
  };

  const markAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    items.forEach(n => { const f = mockNotifications.find(x => x.id === n.id); if (f) f.read = true; });
    const token = localStorage.getItem('auth_token');
    fetch(`${BASE}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }).catch(() => {});
  };

  const dismiss = (id: string) => setItems(prev => prev.filter(n => n.id !== id));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="text-gray-900 font-semibold text-sm">Notifications</span>
              {unread > 0 && (
                <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">{unread}</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : items.map(n => (
              <div key={n.id}
                onClick={() => {
                  const pageMap: Record<string, string> = {
                    appointment: 'appointments',
                    consent:     'consents',     // doctor
                    bill:        'bills',         // patient/hospital
                    claim:       'claims',        // insurance
                    payment:     'payments',      // bank
                    enrollment:  'enrollments',  // insurance
                    prescription:'prescriptions', // doctor
                    loan:        'loans',         // bank
                    alert:       'alerts',        // admin
                  };
                  const targetPage = n.actionUrl || pageMap[n.type];
                  if (targetPage) {
                    window.dispatchEvent(new CustomEvent('qhc:navigate', { detail: { page: targetPage } }));
                    setOpen(false);
                    markRead(n.id);
                  }
                }}
                className={`flex gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors group ${!n.read ? 'bg-blue-50/40' : ''} cursor-pointer`}
              >
                <div className="mt-0.5 shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!n.read ? 'bg-gray-100' : 'bg-gray-50'}`}>
                    {typeIcon(n.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-tight ${n.read ? 'text-gray-500' : 'text-gray-900'}`}>{n.title}</p>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} title="Mark read"
                          className="p-0.5 text-gray-400 hover:text-green-600 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => dismiss(n.id)} title="Dismiss"
                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};