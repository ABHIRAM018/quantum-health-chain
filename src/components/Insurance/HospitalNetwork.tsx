import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Search, MapPin, Phone, Star, CheckCircle, XCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Insurance } from '../../types';

interface HospitalNetworkProps { user: Insurance; onBack: () => void; }

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const HospitalNetwork: React.FC<HospitalNetworkProps> = ({ user, onBack }) => {
  const [hospitals, setHospitals]       = useState<any[]>([]);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected]         = useState<any | null>(null);
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Load hospitals + claims + policies all from PostgreSQL ──
  const loadHospitals = useCallback(async () => {
    setLoading(true);
    try {
      const [hospRes, claimsRes, polRes] = await Promise.all([
        fetch('/api/users/role/hospital', { headers: authHeader() }),
        fetch('/api/claims',              { headers: authHeader() }),
        fetch('/api/policies',            { headers: authHeader() }),
      ]);

      const allHospitals: any[] = hospRes.ok   ? await hospRes.json()   : [];
      const allClaims:    any[] = claimsRes.ok ? await claimsRes.json() : [];
      const allPolicies:  any[] = polRes.ok    ? await polRes.json()    : [];

      // Build set of network hospital IDs from this insurer's policies
      const networkIds = new Set(
        allPolicies
          .filter((p: any) => (p.insurance_id ?? p.insuranceId) === user.id)
          .flatMap((p: any) => p.network_hospitals ?? p.networkHospitals ?? [])
      );

      const enriched = allHospitals.map((h: any) => {
        const hospClaims = allClaims.filter((c: any) =>
          (c.insurance_id ?? c.insuranceId) === user.id
        );
        const approved = hospClaims.filter((c: any) => c.status === 'approved');
        return {
          ...h,
          inNetwork:      networkIds.has(h.id),
          totalClaims:    hospClaims.length,
          approvedClaims: approved.length,
          totalPaid:      approved.reduce((s: number, c: any) => s + parseFloat(c.amount || 0), 0),
          rating:         (4.0 + Math.random() * 1.0).toFixed(1),
          specialties:    h.services?.slice(0, 4) ?? ['General Medicine', 'Emergency'],
          // store policies for toggle
          _policies:      allPolicies.filter((p: any) =>
                            (p.insurance_id ?? p.insuranceId) === user.id),
        };
      });
      setHospitals(enriched);
    } catch (e) {
      console.error('HospitalNetwork load error', e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadHospitals(); }, [loadHospitals]);

  // ── Toggle network — persist by updating all policies via API ──
  const toggleNetwork = async (hospitalId: string) => {
    const hospital = hospitals.find(h => h.id === hospitalId);
    if (!hospital) return;
    const adding = !hospital.inNetwork;

    // Optimistic update
    setHospitals(prev => prev.map(h =>
      h.id === hospitalId ? { ...h, inNetwork: adding } : h
    ));

    // Persist: update each policy's network_hospitals array
    try {
      const policies = hospital._policies ?? [];
      await Promise.all(policies.map(async (p: any) => {
        const currentNet: string[] = p.network_hospitals ?? p.networkHospitals ?? [];
        const newNet = adding
          ? [...new Set([...currentNet, hospitalId])]
          : currentNet.filter((id: string) => id !== hospitalId);

        await fetch(`/api/policies/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body: JSON.stringify({
            policyName:       p.policy_name       ?? p.policyName,
            policyType:       p.policy_type       ?? p.policyType,
            coverageAmount:   p.coverage_amount   ?? p.coverageAmount,
            premiumMonthly:   p.premium_monthly   ?? p.premiumMonthly,
            deductible:       p.deductible        ?? 0,
            coveredServices:  p.covered_services  ?? p.coveredServices  ?? [],
            networkHospitals: newNet,
            status:           p.status,
          }),
        });
      }));

      showToast(adding
        ? `${hospital.name} added to network`
        : `${hospital.name} removed from network`);
    } catch (e: any) {
      // Revert on failure
      setHospitals(prev => prev.map(h =>
        h.id === hospitalId ? { ...h, inNetwork: !adding } : h
      ));
      showToast('Error updating network: ' + e.message);
    }
  };

  const filtered = hospitals.filter(h => {
    if (filterStatus === 'network' && !h.inNetwork) return false;
    if (filterStatus === 'out' && h.inNetwork) return false;
    if (search && !h.name.toLowerCase().includes(search.toLowerCase()) &&
        !(h.address || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const inNetworkCount = hospitals.filter(h => h.inNetwork).length;
  const totalPaid = hospitals.reduce((s, h) => s + h.totalPaid, 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-xl shadow-lg px-5 py-3 text-sm text-gray-800">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Network</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your network of approved hospitals</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadHospitals} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onBack} className="text-orange-600 font-medium text-sm">← Back</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Hospitals', value: hospitals.length,                  color: 'text-gray-900'   },
          { label: 'In Network',      value: inNetworkCount,                    color: 'text-green-600'  },
          { label: 'Total Paid Out',  value: `$${totalPaid.toLocaleString()}`,  color: 'text-orange-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search hospitals..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
            <option value="all">All Hospitals</option>
            <option value="network">In Network</option>
            <option value="out">Out of Network</option>
          </select>
        </div>

        <div className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hospitals found</p>
            </div>
          ) : filtered.map(h => (
            <div key={h.id}>
              <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(selected?.id === h.id ? null : h)}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${h.inNetwork ? 'bg-green-50' : 'bg-gray-100'}`}>
                    <Building2 className={`w-5 h-5 ${h.inNetwork ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{h.name}</p>
                      {h.inNetwork
                        ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100"><CheckCircle className="w-3 h-3" /> In Network</span>
                        : <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200"><XCircle className="w-3 h-3" /> Out of Network</span>}
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {h.address || 'Address not available'}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(h.specialties || []).slice(0, 3).map((s: string, i: number) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{h.totalClaims} claims</p>
                    <p className="text-xs text-green-600">${h.totalPaid.toLocaleString()} paid</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="text-sm font-medium text-gray-700">{h.rating}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); toggleNetwork(h.id); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      h.inNetwork
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
                    }`}>
                    {h.inNetwork ? <><Trash2 className="w-3 h-3" /> Remove</> : <><Plus className="w-3 h-3" /> Add</>}
                  </button>
                </div>
              </div>

              {selected?.id === h.id && (
                <div className="px-6 pb-5 bg-orange-50/30 border-t border-orange-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {[
                      { label: 'Total Beds',      value: h.total_beds      ?? h.totalBeds      ?? '—' },
                      { label: 'Available Beds',  value: h.available_beds  ?? h.availableBeds  ?? '—' },
                      { label: 'Claims Filed',    value: h.totalClaims },
                      { label: 'Claims Approved', value: h.approvedClaims },
                    ].map(f => (
                      <div key={f.label} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                        <p className="text-lg font-bold text-gray-900">{f.value}</p>
                        <p className="text-xs text-gray-500">{f.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-600">{h.phone || 'Phone not available'}</span>
                  </div>
                  {(h.services || []).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">Services Offered</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(h.services || []).map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-white text-gray-600 px-2.5 py-1 rounded-full border border-gray-200">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};