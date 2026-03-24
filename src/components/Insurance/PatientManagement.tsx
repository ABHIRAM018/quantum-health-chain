import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, FileText, Shield, Phone, MapPin, Calendar, RefreshCw, TrendingUp } from 'lucide-react';
import { Insurance } from '../../types';

interface PatientManagementProps { user: Insurance; onBack: () => void; }

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const PatientManagement: React.FC<PatientManagementProps> = ({ user, onBack }) => {
  const [patients, setPatients]         = useState<any[]>([]);
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<any | null>(null);
  const [selectedClaims, setSelectedClaims] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [_policies, setPolicies]        = useState<any[]>([]);

  // ── Load everything from PostgreSQL ─────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, polRes] = await Promise.all([
        fetch('/api/users/role/patient', { headers: authHeader() }),
        fetch('/api/claims',             { headers: authHeader() }),
        fetch('/api/policies',           { headers: authHeader() }),
      ]);

      const allPatients: any[] = pRes.ok  ? await pRes.json()  : [];
      const allClaims:   any[] = cRes.ok  ? await cRes.json()  : [];
      const allPolicies: any[] = polRes.ok? await polRes.json(): [];
      setPolicies(allPolicies);

      // Enrich each patient with their claim stats for this insurer
      const enriched = allPatients.map(p => {
        const myClaims = allClaims.filter(
          (c: any) => (c.patient_id ?? c.patientId) === p.id &&
                      (c.insurance_id ?? c.insuranceId) === user.id
        );
        const approved     = myClaims.filter((c: any) => c.status === 'approved');
        const totalClaimed = myClaims.reduce((s: number, c: any) => s + parseFloat(c.amount), 0);
        const totalApproved= approved.reduce((s: number, c: any) => s + parseFloat(c.amount), 0);
        const lastClaim    = [...myClaims].sort((a: any, b: any) =>
          new Date(b.created_at ?? b.createdAt).getTime() -
          new Date(a.created_at ?? a.createdAt).getTime()
        )[0] ?? null;
        const policy = allPolicies[0]; // patient linked to insurer's first active policy
        return {
          ...p,
          claimsCount:   myClaims.length,
          approvedCount: approved.length,
          totalClaimed,
          totalApproved,
          policyName: policy?.policy_name ?? policy?.policyName ?? 'Standard Plan',
          status: myClaims.length > 0 ? 'active' : 'enrolled',
          lastClaim,
          rawClaims: myClaims,
        };
      });

      setPatients(enriched);
    } catch (e) {
      console.error('Failed to load patient data', e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // When a patient is selected, show their live claim history
  const handleSelectPatient = (p: any) => {
    if (selected?.id === p.id) { setSelected(null); setSelectedClaims([]); return; }
    setSelected(p);
    // Normalise snake_case from DB
    setSelectedClaims((p.rawClaims ?? []).map((c: any) => ({
      id:        c.id,
      status:    c.status,
      amount:    parseFloat(c.amount),
      createdAt: new Date(c.created_at ?? c.createdAt),
    })));
  };

  const filtered = patients.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalClaimed  = patients.reduce((s, p) => s + p.totalClaimed,  0);
  const totalApproved = patients.reduce((s, p) => s + p.totalApproved, 0);
  const activeCount   = patients.filter(p => p.claimsCount > 0).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">All patients covered under your insurance plans</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAll} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onBack} className="text-orange-600 font-medium text-sm">← Back</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients',   value: patients.length,                   color: 'text-gray-900',  icon: Users      },
          { label: 'Active Claimants', value: activeCount,                       color: 'text-orange-600',icon: FileText   },
          { label: 'Total Claimed',    value: `$${totalClaimed.toLocaleString()}`,color: 'text-blue-600', icon: TrendingUp },
          { label: 'Total Approved',   value: `$${totalApproved.toLocaleString()}`,color:'text-green-600',icon: Shield     },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-xl font-bold ${c.color} mt-0.5`}>{c.value}</p>
              </div>
              <c.icon className={`w-6 h-6 ${c.color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Search + filter */}
        <div className="p-4 border-b border-gray-200 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
            <option value="all">All Patients</option>
            <option value="active">With Claims</option>
            <option value="enrolled">No Claims Yet</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Patient', 'Contact', 'Policy', 'Claims', 'Total Claimed', 'Last Activity'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No patients found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}
                  className={`cursor-pointer transition-colors ${selected?.id === p.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                  onClick={() => handleSelectPatient(p)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-orange-600 text-xs font-bold">{p.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.phone || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      {p.policyName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-medium text-gray-900">{p.claimsCount}</span>
                    <span className="text-gray-400 text-xs"> ({p.approvedCount} approved)</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">${p.totalClaimed.toLocaleString()}</p>
                    <p className="text-xs text-green-600">${p.totalApproved.toLocaleString()} approved</p>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {p.lastClaim
                      ? new Date(p.lastClaim.created_at ?? p.lastClaim.createdAt).toLocaleDateString()
                      : 'No claims'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Patient Detail — {selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {[
                { icon: Phone,    label: 'Phone',            value: selected.phone             || '—' },
                { icon: MapPin,   label: 'Address',          value: selected.address           || '—' },
                { icon: Calendar, label: 'Date of Birth',    value: selected.date_of_birth || selected.dateOfBirth ? new Date(selected.date_of_birth ?? selected.dateOfBirth).toLocaleDateString() : '—' },
                { icon: Shield,   label: 'Emergency Contact',value: selected.emergency_contact || selected.emergencyContact || '—' },
              ].map(f => (
                <div key={f.label} className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <f.icon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{f.label}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{f.value}</p>
                </div>
              ))}
            </div>

            {/* Claim history — from DB */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Claim History ({selectedClaims.length} claim{selectedClaims.length !== 1 ? 's' : ''})
              </p>
              <div className="space-y-2">
                {selectedClaims.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2 text-center">No claims filed with this insurer</p>
                ) : selectedClaims.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Claim #{c.id.slice(-8)}</p>
                      <p className="text-xs text-gray-400">{c.createdAt.toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'approved'     ? 'bg-green-100 text-green-700'  :
                        c.status === 'rejected'     ? 'bg-red-100 text-red-700'      :
                        c.status === 'under_review' ? 'bg-yellow-100 text-amber-700' :
                                                      'bg-blue-100 text-blue-700'
                      }`}>{c.status.replace('_', ' ')}</span>
                      <span className="text-sm font-bold text-gray-900">${c.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};