import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, XCircle, CheckCircle, User, Eye, FileText, DollarSign } from 'lucide-react';
import { Doctor } from '../../types';

interface PatientConsentsProps { user: Doctor; onBack: () => void; onViewPatientRecords?: (patientId: string, patientName: string) => void; }

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const accessTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  medical:   { label: 'Medical Records',  icon: FileText,    color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200'   },
  financial: { label: 'Financial Data',   icon: DollarSign,  color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  full:      { label: 'Full Access',      icon: Eye,         color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200'},
};

export const PatientConsents: React.FC<PatientConsentsProps> = ({ user: _user, onBack, onViewPatientRecords }) => {
  const [consents, setConsents]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<'all' | 'active' | 'revoked' | 'expired'>('all');

  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/consents/granted-to-me', { headers: authHeader() });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setFetchError(`Server error ${res.status}: ${err.error ?? 'Unknown'}. Make sure server.js was restarted.`);
          return;
        }
        const data = await res.json();
        setConsents(data.map((r: any) => ({
          id:          r.id,
          patientId:   r.patient_id    ?? r.patientId,
          patientName: r.patient_name  ?? r.patientName  ?? 'Unknown Patient',
          patientEmail:r.patient_email ?? r.patientEmail ?? '',
          accessType:  r.access_type   ?? r.accessType,
          status:      r.status,
          validUntil:  new Date(r.valid_until ?? r.validUntil),
          reason:      r.reason ?? '',
          createdAt:   new Date(r.created_at ?? r.createdAt),
        })));
      } catch (e: any) {
        setFetchError('Could not connect. Please restart node server.js and refresh.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-mark expired: past validUntil date
  const now = new Date();
  const enriched = consents.map(c => ({
    ...c,
    effectiveStatus: c.status === 'active' && c.validUntil < now ? 'expired' : c.status,
  }));

  const filtered = filter === 'all' ? enriched : enriched.filter(c => c.effectiveStatus === filter);

  const counts = {
    active:  enriched.filter(c => c.effectiveStatus === 'active').length,
    revoked: enriched.filter(c => c.effectiveStatus === 'revoked').length,
    expired: enriched.filter(c => c.effectiveStatus === 'expired').length,
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Patient Consents</h1>
            <p className="text-gray-500 text-sm">Patients who have granted you data access</p>
          </div>
        </div>
        <button onClick={onBack} className="text-emerald-600 font-medium text-sm">&#8592; Back to Dashboard</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active',  value: counts.active,  color: 'text-green-600',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle },
          { label: 'Revoked', value: counts.revoked, color: 'text-red-600',    bg: 'bg-red-50 border-red-200',      icon: XCircle     },
          { label: 'Expired', value: counts.expired, color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',    icon: Clock       },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 flex items-center gap-3 ${s.bg}`}>
            <s.icon className={`w-5 h-5 ${s.color} shrink-0`} />
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label} Consents</p>
            </div>
          </div>
        ))}
      </div>

      {fetchError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          ⚠ {fetchError}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {(['all', 'active', 'revoked', 'expired'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-900'
            }`}>{f} {f !== 'all' && `(${counts[f] ?? 0})`}</button>
        ))}
      </div>

      {/* Consent list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {filter !== 'all' ? filter : ''} consents found</p>
          <p className="text-gray-400 text-sm mt-1">Patients can grant you access through their Patient Portal → Consent page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const atc = accessTypeConfig[c.accessType] ?? accessTypeConfig.medical;
            const AccessIcon = atc.icon;
            const isActive = c.effectiveStatus === 'active';
            const isRevoked = c.effectiveStatus === 'revoked';

            return (
              <div key={c.id} className={`bg-white border rounded-xl p-5 ${
                isActive ? 'border-green-200' : isRevoked ? 'border-red-100' : 'border-gray-200 opacity-70'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.patientName}</p>
                      <p className="text-gray-500 text-xs">{c.patientEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Access type badge */}
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${atc.bg} ${atc.color}`}>
                      <AccessIcon className="w-3 h-3" />
                      {atc.label}
                    </span>
                    {/* Status badge */}
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                    {isRevoked && (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                        <XCircle className="w-3 h-3" /> Revoked
                      </span>
                    )}
                    {c.effectiveStatus === 'expired' && (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
                        <Clock className="w-3 h-3" /> Expired
                      </span>
                    )}
                  </div>
                </div>

                {/* Details row */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Valid Until</p>
                    <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {c.validUntil.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Granted On</p>
                    <p className="text-sm font-medium text-gray-900">{c.createdAt.toLocaleDateString()}</p>
                  </div>
                  {c.reason && (
                    <div className="bg-gray-50 rounded-lg p-3 md:col-span-1">
                      <p className="text-xs text-gray-500 mb-0.5">Reason</p>
                      <p className="text-sm text-gray-700 truncate">{c.reason}</p>
                    </div>
                  )}
                </div>

                {isActive && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-emerald-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Access granted: {atc.label}
                    </div>
                    <button
                      onClick={() => {
                        if (onViewPatientRecords) {
                          onViewPatientRecords(c.patientId, c.patientName);
                        } else {
                          window.dispatchEvent(new CustomEvent('qhc:navigate', {
                            detail: { page: 'records', patientId: c.patientId, patientName: c.patientName }
                          }));
                        }
                      }}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                      <FileText className="w-3 h-3" /> View Medical Records
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};