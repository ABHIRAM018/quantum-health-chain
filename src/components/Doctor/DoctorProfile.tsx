import React, { useState } from 'react';
import { User, Stethoscope, Award, DollarSign, Save, Edit, CheckCircle } from 'lucide-react';
import { Doctor } from '../../types';

interface DoctorProfileProps { user: Doctor; onBack: () => void; }

const authHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const DoctorProfile: React.FC<DoctorProfileProps> = ({ user, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const [formData, setFormData] = useState({
    name:            user.name,
    email:           user.email,
    specialization:  user.specialization,
    consultationFee: user.consultationFee,
    experience:      user.experience,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Persist to PostgreSQL via PUT /api/users/:id
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          name:    formData.name,
          phone:   (user as any).phone ?? '',
          address: (user as any).address ?? '',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');

      // Update localStorage session
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(parsed, formData);
        localStorage.setItem('user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('qhc:user-updated'));
      }
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string) => (
    <div key={label}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <p className="text-gray-900 font-medium">{value}</p>
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
        <h1 className="text-2xl font-bold text-gray-900">Doctor Profile</h1>
        <button onClick={onBack} className="text-green-600 font-medium text-sm">← Back</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Professional Information</h2>
          <button onClick={() => { setIsEditing(!isEditing); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isEditing ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}>
            <Edit className="w-4 h-4" /> {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
          )}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { label: 'Full Name',           key: 'name',            type: 'text',   icon: User       },
                  { label: 'Email',               key: 'email',           type: 'email',  icon: null       },
                  { label: 'Specialization',      key: 'specialization',  type: 'text',   icon: Stethoscope},
                  { label: 'Experience (Years)',  key: 'experience',      type: 'number', icon: Award      },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                      {f.icon && <f.icon className="w-3.5 h-3.5" />} {f.label}
                    </label>
                    <input type={f.type} value={(formData as any)[f.key]}
                      onChange={e => setFormData(d => ({ ...d, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500" required />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Consultation Fee ($)
                  </label>
                  <input type="number" value={formData.consultationFee}
                    onChange={e => setFormData(d => ({ ...d, consultationFee: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-500" required min="0" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                    : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
                <button type="button" onClick={() => setIsEditing(false)}
                  className="bg-gray-100 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-200">Cancel</button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {field('Full Name', formData.name)}
                {field('Email', formData.email)}
                {field('Specialization', formData.specialization)}
                {field('License Number', user.licenseNumber)}
              </div>
              <div className="space-y-4">
                {field('Experience', `${formData.experience} years`)}
                {field('Consultation Fee', `$${formData.consultationFee}`)}
                {field('Hospital ID', user.hospitalId)}
                {field('Member Since', new Date(user.createdAt).toLocaleDateString())}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Specialization', value: formData.specialization,      color: 'text-green-600'  },
            { label: 'Experience',     value: `${formData.experience} yrs`, color: 'text-blue-600'   },
            { label: 'Consult Fee',    value: `$${formData.consultationFee}`,color: 'text-orange-600' },
            { label: 'Status',         value: 'Active',                     color: 'text-teal-600'   },
          ].map(s => (
            <div key={s.label} className="text-center p-4 bg-gray-50 rounded-xl">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};