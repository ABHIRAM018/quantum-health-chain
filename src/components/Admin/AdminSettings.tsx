import React, { useState, useEffect } from 'react';
import { User, Lock, Bell, Save, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Admin } from '../../types';

interface AdminSettingsProps {
  user: Admin;
  onBack: () => void;
}

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const AdminSettings: React.FC<AdminSettingsProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab]   = useState('profile');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState('');
  const [error, setError]           = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showNewPw, setShowNewPw]   = useState(false);

  const [profile, setProfile] = useState({
    name:  user.name  ?? '',
    email: user.email ?? '',
    phone: (user as any).phone ?? '',
  });

  const [password, setPassword] = useState({
    current: '',
    next:    '',
    confirm: '',
  });

  const [notifs, setNotifs] = useState({
    loginAlerts:       true,
    userCreated:       true,
    systemErrors:      true,
    securityAlerts:    true,
    dailyReport:       false,
    weeklyDigest:      true,
  });

  // Load saved notification prefs from DB settings
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/settings', { headers: authHeader() });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.adminNotifs) setNotifs(n => ({ ...n, ...data.adminNotifs }));
      } catch { /* use defaults */ }
    };
    load();
  }, []);

  const saveProfile = async () => {
    setSaving(true); setError(''); setSaved('');
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ name: profile.name, phone: profile.phone }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      // Sync localStorage session
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(parsed, { name: profile.name });
        localStorage.setItem('user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('qhc:user-updated'));
      }
      setSaved('Profile updated successfully!');
      setTimeout(() => setSaved(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (password.next !== password.confirm) {
      setError('New passwords do not match'); return;
    }
    if (password.next.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setSaving(true); setError(''); setSaved('');
    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ currentPassword: password.current, newPassword: password.next }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Password change failed');
      setPassword({ current: '', next: '', confirm: '' });
      setSaved('Password changed successfully!');
      setTimeout(() => setSaved(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveNotifs = async () => {
    setSaving(true); setError(''); setSaved('');
    try {
      // Load current settings then merge adminNotifs
      const getRes = await fetch('/api/admin/settings', { headers: authHeader() });
      const current = getRes.ok ? await getRes.json() : {};
      const merged = { ...(current || {}), adminNotifs: notifs };
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(merged),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      setSaved('Notification preferences saved!');
      setTimeout(() => setSaved(''), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile',  label: 'Profile',       icon: User  },
    { id: 'password', label: 'Password',       icon: Lock  },
    { id: 'notifs',   label: 'Notifications',  icon: Bell  },
  ];

  const toggle = (key: keyof typeof notifs) =>
    setNotifs(n => ({ ...n, [key]: !n[key] }));

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your account and preferences</p>
        </div>
        <button onClick={onBack} className="text-red-600 font-medium text-sm">← Back to Dashboard</button>
      </div>

      {/* Feedback */}
      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" /> {saved}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setError(''); setSaved(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.id ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-gray-900'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile.name}</p>
              <p className="text-gray-500 text-sm">{profile.email}</p>
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full mt-1 inline-block">Admin</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email (read-only)</label>
              <input value={profile.email} disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. +91-9876543210"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <input value="System Administrator" disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
            </div>
          </div>

          <button onClick={saveProfile} disabled={saving}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>
        </div>
      )}

      {/* PASSWORD TAB */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Change Password</h2>

          {[
            { label: 'Current Password', key: 'current', show: showPw,    toggle: () => setShowPw(v => !v) },
            { label: 'New Password',     key: 'next',    show: showNewPw, toggle: () => setShowNewPw(v => !v) },
            { label: 'Confirm New',      key: 'confirm', show: showNewPw, toggle: () => setShowNewPw(v => !v) },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
              <div className="relative">
                <input type={f.show ? 'text' : 'password'}
                  value={(password as any)[f.key]}
                  onChange={e => setPassword(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500" />
                <button type="button" onClick={f.toggle}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          <button onClick={savePassword} disabled={saving || !password.current || !password.next}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    : <><Lock className="w-4 h-4" /> Update Password</>}
          </button>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifs' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Notification Preferences</h2>
          <p className="text-gray-500 text-sm">Choose which events trigger admin notifications.</p>

          <div className="space-y-1">
            {[
              { key: 'loginAlerts',    label: 'Failed login alerts',           desc: 'Notify on suspicious login attempts' },
              { key: 'userCreated',    label: 'New user registrations',        desc: 'Alert when new users are added' },
              { key: 'systemErrors',   label: 'System errors',                 desc: 'Critical server or DB errors' },
              { key: 'securityAlerts', label: 'Security alert notifications',  desc: 'When new security alerts are raised' },
              { key: 'dailyReport',    label: 'Daily activity report',         desc: 'Summary email every morning' },
              { key: 'weeklyDigest',   label: 'Weekly analytics digest',       desc: 'Weekly summary of system activity' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className="relative shrink-0">
                  <input type="checkbox" className="sr-only"
                    checked={(notifs as any)[item.key]}
                    onChange={() => toggle(item.key as keyof typeof notifs)} />
                  <div className={`w-10 h-6 rounded-full transition-colors ${(notifs as any)[item.key] ? 'bg-red-600' : 'bg-gray-200'}`} />
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(notifs as any)[item.key] ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>

          <button onClick={saveNotifs} disabled={saving}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save Preferences</>}
          </button>
        </div>
      )}
    </div>
  );
};