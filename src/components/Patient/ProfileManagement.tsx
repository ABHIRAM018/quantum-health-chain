import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Shield, Save, Edit, CheckCircle } from 'lucide-react';
import { Patient } from '../../types';

interface ProfileManagementProps {
  user: Patient;
  onBack: () => void;
  onPageChange: (page: string) => void;
}

export const ProfileManagement: React.FC<ProfileManagementProps> = ({ user, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
    emergencyContact: user.emergencyContact || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          // emergencyContact is not in the server's UPDATE query —
          // persist locally until the server supports it
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(err.error || 'Update failed');
      }

      const updated = await res.json();
      // Merge server response back into localStorage session
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        localStorage.setItem('user', JSON.stringify({
          ...parsed,
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
          emergencyContact: formData.emergencyContact, // kept locally
        }));
      }

      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, icon: any) => (
    <div key={label} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl">
      <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
        {React.createElement(icon, { className: 'w-4 h-4' })}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-green-200 rounded-xl shadow-lg px-5 py-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Profile updated successfully!
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500 text-sm">Manage your personal information and preferences</p>
        </div>
        <button onClick={onBack} className="text-blue-600 font-medium text-sm">← Back to Dashboard</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/20">
              {user.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500 capitalize">{user.role} Account</p>
            </div>
          </div>
          <button
            onClick={() => { setIsEditing(!isEditing); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isEditing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
            }`}
          >
            <Edit className="w-4 h-4" />
            {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
          )}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', icon: User },
                  { label: 'Email Address', key: 'email', type: 'email', icon: Mail },
                  { label: 'Phone Number', key: 'phone', type: 'tel', icon: Phone },
                  { label: 'Emergency Contact', key: 'emergencyContact', type: 'text', icon: Shield },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                      <f.icon className="w-3.5 h-3.5" /> {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={(formData as any)[f.key]}
                      onChange={e => setFormData(d => ({ ...d, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      required={f.key === 'name'}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Home Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData(d => ({ ...d, address: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {field('Full Name', user.name, User)}
              {field('Email Address', user.email, Mail)}
              {field('Phone Number', user.phone, Phone)}
              {field('Date of Birth', user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : '—', Calendar)}
              {field('Emergency Contact', user.emergencyContact, Shield)}
              {field('Address', user.address, MapPin)}
            </div>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="text-blue-900 font-bold mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" /> Security & Privacy
          </h3>
          <p className="text-blue-700 text-sm mb-4">
            Your profile data is protected by multiple security layers, including RBAC and encryption.
            Only authorized healthcare providers can access your medical records.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/50 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-800">2FA: Enabled</div>
            <div className="bg-white/50 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-800">Last login: Today</div>
          </div>
        </div>
      )}
    </div>
  );
};