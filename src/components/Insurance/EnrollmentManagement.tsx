import React, { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, Loader, AlertCircle } from 'lucide-react';
import { Insurance } from '../../types';

interface EnrollmentManagementProps {
  user: Insurance;
  onBack: () => void;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending:   { color: 'bg-yellow-100 text-yellow-700', icon: Clock,       label: 'Pending'   },
  active:    { color: 'bg-green-100  text-green-700',  icon: CheckCircle, label: 'Active'    },
  cancelled: { color: 'bg-gray-100   text-gray-600',   icon: XCircle,     label: 'Cancelled' },
  expired:   { color: 'bg-red-100    text-red-700',    icon: AlertCircle, label: 'Expired'   },
};

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const EnrollmentManagement: React.FC<EnrollmentManagementProps> = ({ user: _user, onBack }) => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('all');
  const [updating, setUpdating]       = useState<string | null>(null);
  const [error, setError]             = useState('');

  const loadEnrollments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/enrollments', { headers: authHeader() });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load');
      setEnrollments(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEnrollments(); }, [loadEnrollments]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/enrollments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update failed');
      await loadEnrollments();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === 'all' ? enrollments : enrollments.filter(e => e.status === filter);

  const stats = {
    total:     enrollments.length,
    pending:   enrollments.filter(e => e.status === 'pending').length,
    active:    enrollments.filter(e => e.status === 'active').length,
    cancelled: enrollments.filter(e => e.status === 'cancelled').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollment Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Review and manage patient policy applications</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadEnrollments} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onBack} className="text-orange-600 font-medium text-sm">← Back</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-gray-900',   icon: Users      },
          { label: 'Pending',   value: stats.pending,   color: 'text-yellow-600', icon: Clock      },
          { label: 'Active',    value: stats.active,    color: 'text-green-600',  icon: CheckCircle},
          { label: 'Cancelled', value: stats.cancelled, color: 'text-gray-400',   icon: XCircle    },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-gray-500">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'active', 'cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-orange-100 text-orange-700 border-orange-300'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}>
            {f} {f !== 'all' && `(${enrollments.filter(e => e.status === f).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-xl text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No enrollments found.</p>
          </div>
        ) : filtered.map(enr => {
          const sc = statusConfig[enr.status] ?? statusConfig.pending;
          const StatusIcon = sc.icon;
          return (
            <div key={enr.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-orange-600 text-sm font-bold">
                      {(enr.patient_name || '?').charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{enr.patient_name}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>
                        <StatusIcon className="w-3 h-3" /> {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{enr.patient_email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Plan: <span className="font-medium text-gray-700">{enr.policy_name}</span>
                      <span className="text-gray-400 ml-2">({enr.policy_type})</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Applied: {new Date(enr.enrolled_at).toLocaleDateString()}
                      {enr.expires_at && enr.status === 'active' && (
                        <> · Expires: {new Date(enr.expires_at).toLocaleDateString()}</>
                      )}
                    </p>
                    {enr.notes && (
                      <p className="text-xs text-gray-500 bg-gray-50 rounded p-2 mt-2 italic">
                        Note: {enr.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {enr.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => updateStatus(enr.id, 'cancelled')}
                      disabled={updating === enr.id}
                      className="flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      {updating === enr.id ? <Loader className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                      Reject
                    </button>
                    <button
                      onClick={() => updateStatus(enr.id, 'active')}
                      disabled={updating === enr.id}
                      className="flex items-center gap-1 text-xs text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      {updating === enr.id ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Approve
                    </button>
                  </div>
                )}
                {enr.status === 'active' && (
                  <button
                    onClick={() => updateStatus(enr.id, 'cancelled')}
                    disabled={updating === enr.id}
                    className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ml-4">
                    <XCircle className="w-3 h-3" /> Deactivate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};