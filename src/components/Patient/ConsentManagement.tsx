import React, { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle, XCircle, Clock, Trash2, AlertTriangle, User, Building2, Banknote } from 'lucide-react';
import { ConsentRecord, Patient } from '../../types';
import { addNotification } from '../Shared/NotificationCenter';

interface ConsentManagementProps {
  user: Patient;
  onBack: () => void;
}

const roleIcon = (role: string) => {
  if (role === 'doctor') return <User className="w-4 h-4 text-green-600" />;
  if (role === 'insurance') return <Shield className="w-4 h-4 text-purple-600" />;
  if (role === 'bank') return <Banknote className="w-4 h-4 text-teal-600" />;
  return <Building2 className="w-4 h-4 text-gray-500" />;
};

const statusBadge = (status: ConsentRecord['status']) => {
  const map = {
    active: 'bg-green-100 text-green-600 border-emerald-800',
    revoked: 'bg-red-100 text-red-600 border-red-800',
    expired: 'bg-gray-100 text-gray-500 border-gray-300',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status]}`}>{status.toUpperCase()}</span>;
};

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const ConsentManagement: React.FC<ConsentManagementProps> = ({ user, onBack }) => {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    grantedTo: '',
    grantedToRole: 'doctor' as ConsentRecord['grantedToRole'],
    accessType: 'medical' as ConsentRecord['accessType'],
    validUntil: '',
    reason: '',
  });

  // ── Load consents from DB ─────────────────────────────────
  const loadConsents = async () => {
    try {
      const res = await fetch('/api/consents', { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        // Normalise snake_case → camelCase
        setRecords(data.map((r: any): ConsentRecord => ({
          id: r.id,
          patientId: r.patient_id ?? r.patientId,
          grantedTo: r.granted_to ?? r.grantedTo,
          grantedToRole: r.granted_to_role ?? r.grantedToRole,
          accessType: r.access_type ?? r.accessType,
          status: r.status,
          validUntil: new Date(r.valid_until ?? r.validUntil),
          reason: r.reason,
          createdAt: new Date(r.created_at ?? r.createdAt),
          updatedAt: new Date(r.updated_at ?? r.updatedAt),
        })));
      }
    } catch (e) {
      console.error('Failed to load consents', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Load available recipients (doctors, insurers, banks) ──
  const loadRecipients = async () => {
    try {
      const roles = ['doctor', 'insurance', 'bank'];
      const results = await Promise.all(
        roles.map(role =>
          fetch(`/api/users/role/${role}`, { headers: authHeader() })
            .then(r => r.ok ? r.json() : [])
        )
      );
      setRecipients(results.flat().filter((u: any) => u.id !== user.id));
    } catch (e) {
      console.error('Failed to load recipients', e);
    }
  };

  useEffect(() => {
    loadConsents();
    loadRecipients();
  }, [user.id]);

  // ── Grant consent ─────────────────────────────────────────
  const handleGrant = async () => {
    if (!form.grantedTo || !form.validUntil || !form.reason) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          grantedTo: form.grantedTo,
          grantedToRole: form.grantedToRole,
          accessType: form.accessType,
          validUntil: form.validUntil,
          reason: form.reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to grant consent');
      }
      await loadConsents();
      addNotification({
        userId: form.grantedTo,
        title: 'Consent Granted',
        message: `${user.name} has granted you ${form.accessType} data access until ${new Date(form.validUntil).toLocaleDateString()}.`,
        type: 'consent',
      });
      setShowForm(false);
      setForm({ grantedTo: '', grantedToRole: 'doctor', accessType: 'medical', validUntil: '', reason: '' });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Revoke consent ────────────────────────────────────────
  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/consents/${id}/revoke`, {
        method: 'PATCH',
        headers: authHeader(),
      });
      if (!res.ok) throw new Error('Failed to revoke consent');
      const record = records.find(c => c.id === id);
      if (record) {
        addNotification({
          userId: record.grantedTo,
          title: 'Consent Revoked',
          message: `${user.name} has revoked your data access.`,
          type: 'consent',
        });
      }
      await loadConsents();
    } catch (e: any) {
      alert('Error revoking consent: ' + e.message);
    }
  };

  const grouped = {
    active: records.filter(r => r.status === 'active'),
    revoked: records.filter(r => r.status === 'revoked'),
    expired: records.filter(r => r.status === 'expired'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading consents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-600 text-sm mb-4 flex items-center gap-1 transition-colors">← Back</button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Consent Management</h1>
            <p className="text-gray-500 text-sm">Control who can access your medical and financial data</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-gray-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Grant Access
        </button>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-950 border border-amber-800 rounded-xl p-4 mb-6">
        <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-300 font-medium text-sm">Your Data, Your Control</p>
          <p className="text-amber-500/80 text-xs mt-1">Doctors, insurance providers, and banks can only access your data when you grant explicit consent. You can revoke access at any time.</p>
        </div>
      </div>

      {/* Grant Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-gray-900 font-bold text-lg mb-4">Grant Data Access</h3>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-gray-500 text-xs font-medium mb-1 block">Grant Access To</label>
                <select value={form.grantedTo} onChange={e => {
                  const u = recipients.find((x: any) => x.id === e.target.value);
                  setForm(f => ({ ...f, grantedTo: e.target.value, grantedToRole: (u?.role as any) || 'doctor' }));
                }}
                  className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="">Select person or organisation...</option>
                  {recipients.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs font-medium mb-1 block">Access Type</label>
                <select value={form.accessType} onChange={e => setForm(f => ({ ...f, accessType: e.target.value as any }))}
                  className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="medical">Medical Records Only</option>
                  <option value="financial">Financial Records Only</option>
                  <option value="full">Full Access (Medical + Financial)</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs font-medium mb-1 block">Valid Until</label>
                <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-gray-500 text-xs font-medium mb-1 block">Reason / Purpose</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Ongoing cardiac treatment, Insurance claim review..."
                  className="w-full bg-white border border-gray-300 rounded-lg text-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-20" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleGrant} disabled={submitting}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? 'Granting...' : 'Grant Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent lists */}
      <div className="space-y-6">
        {[
          { key: 'active', label: 'Active Consents', icon: CheckCircle, color: 'text-green-600' },
          { key: 'revoked', label: 'Revoked', icon: XCircle, color: 'text-red-600' },
        ].map(({ key, label, icon: Icon, color }) => {
          const list = grouped[key as keyof typeof grouped];
          if (list.length === 0) return null;
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${color}`} />
                <h2 className="text-gray-900 font-semibold text-sm">{label} ({list.length})</h2>
              </div>
              <div className="space-y-2">
                {list.map(c => {
                  const recipient = recipients.find((u: any) => u.id === c.grantedTo);
                  return (
                    <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        {roleIcon(c.grantedToRole)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-gray-900 font-medium text-sm">{recipient?.name || c.grantedTo}</span>
                          {statusBadge(c.status)}
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{c.accessType}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{c.reason}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-500 text-xs">Valid until {new Date(c.validUntil).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {c.status === 'active' && (
                        <button onClick={() => handleRevoke(c.id)}
                          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors">
                          <Trash2 className="w-3 h-3" /> Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {records.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No consent records yet. Grant access to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};