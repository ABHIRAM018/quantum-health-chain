import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, Clock, XCircle, Plus, Star,
  AlertCircle, ChevronDown, ChevronUp, Loader, RefreshCw
} from 'lucide-react';
import { Patient } from '../../types';

interface InsurancePlansProps {
  user: Patient;
  onBack: () => void;
}

const typeColor: Record<string, string> = {
  basic:    'bg-gray-100    text-gray-600    border-gray-300',
  premium:  'bg-amber-50    text-amber-700   border-amber-200',
  family:   'bg-blue-50     text-blue-700    border-blue-200',
  senior:   'bg-violet-50   text-violet-700  border-violet-200',
  critical: 'bg-red-50      text-red-700     border-red-200',
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending:   { color: 'bg-yellow-100 text-yellow-700', icon: Clock,         label: 'Pending Approval' },
  active:    { color: 'bg-green-100  text-green-700',  icon: CheckCircle,   label: 'Active'           },
  cancelled: { color: 'bg-gray-100   text-gray-600',   icon: XCircle,       label: 'Cancelled'        },
  expired:   { color: 'bg-red-100    text-red-700',    icon: AlertCircle,   label: 'Expired'          },
};

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

export const InsurancePlans: React.FC<InsurancePlansProps> = ({ user: _user, onBack }) => {
  const [tab, setTab]               = useState<'browse' | 'my'>('browse');
  const [policies, setPolicies]     = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [applying, setApplying]     = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [applyNotes, setApplyNotes] = useState('');
  const [showApplyModal, setShowApplyModal] = useState<any | null>(null);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [polRes, enrRes] = await Promise.all([
        fetch('/api/policies/public', { headers: authHeader() }),
        fetch('/api/enrollments',     { headers: authHeader() }),
      ]);
      if (polRes.ok) setPolicies(await polRes.json());
      if (enrRes.ok) setEnrollments(await enrRes.json());
    } catch (e: any) {
      setError('Failed to load plans: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Check enrollment status for a policy ────────────────
  const getEnrollment = (policyId: string) =>
    enrollments.find(e => (e.policy_id ?? e.policyId) === policyId);

  // ── Apply for a policy ───────────────────────────────────
  const handleApply = async () => {
    if (!showApplyModal) return;
    setApplying(showApplyModal.id);
    setError('');
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ policyId: showApplyModal.id, notes: applyNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Application failed');
      await loadAll();
      setShowApplyModal(null);
      setApplyNotes('');
      setSuccess(`Applied for "${showApplyModal.policy_name}"! The insurer will review and activate your plan.`);
      setTab('my');
      setTimeout(() => setSuccess(''), 5000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplying(null);
    }
  };

  // ── Cancel an enrollment ─────────────────────────────────
  const handleCancel = async (enrollmentId: string) => {
    if (!window.confirm('Cancel this enrollment?')) return;
    setCancelling(enrollmentId);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Cancel failed');
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  const activeEnrollments = enrollments.filter(e => e.status === 'active');

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Plans</h1>
          <p className="text-gray-500 text-sm mt-0.5">Browse and enroll in health insurance plans</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadAll} className="p-2 text-gray-500 hover:text-gray-700 rounded-lg" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onBack} className="text-blue-600 font-medium text-sm">← Back to Dashboard</button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Active plan banner */}
      {activeEnrollments.length > 0 && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5" />
            <span className="font-semibold">You're covered!</span>
          </div>
          <p className="text-green-100 text-sm">
            Active plan{activeEnrollments.length > 1 ? 's' : ''}: {activeEnrollments.map(e => e.policy_name).join(', ')}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            {[
              { id: 'browse', label: 'Browse Plans', count: policies.length },
              { id: 'my',     label: 'My Enrollments', count: enrollments.length },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`py-4 px-4 border-b-2 font-medium text-sm mr-4 ${
                  tab === t.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {t.label}
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* ── BROWSE TAB ── */}
          {tab === 'browse' && (
            <div className="space-y-4">
              {policies.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No insurance plans available yet. Check back later.</p>
                </div>
              ) : policies.map(policy => {
                const enrollment = getEnrollment(policy.id);
                const isExpanded = expanded === policy.id;
                return (
                  <div key={policy.id} className={`border rounded-xl overflow-hidden transition-all ${
                    enrollment?.status === 'active' ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'
                  }`}>
                    {/* Policy header — always visible */}
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-gray-900">{policy.policy_name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${typeColor[policy.policy_type] || typeColor.basic}`}>
                              {policy.policy_type}
                            </span>
                            {enrollment?.status === 'active' && (
                              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Enrolled
                              </span>
                            )}
                            {enrollment?.status === 'pending' && (
                              <span className="flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">by {policy.insurer_name}</p>

                          {/* Key numbers */}
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-gray-500">Coverage</p>
                              <p className="text-gray-900 font-bold text-sm">
                                ${(parseFloat(policy.coverage_amount) / 1000).toFixed(0)}K
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-gray-500">Premium/mo</p>
                              <p className="text-green-600 font-bold text-sm">${parseFloat(policy.premium_monthly).toFixed(0)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                              <p className="text-xs text-gray-500">Deductible</p>
                              <p className="text-yellow-600 font-bold text-sm">${parseFloat(policy.deductible || 0).toFixed(0)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Action button */}
                        <div className="ml-4 flex flex-col items-end gap-2">
                          {!enrollment && (
                            <button
                              onClick={() => { setShowApplyModal(policy); setApplyNotes(''); setError(''); }}
                              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                              <Plus className="w-4 h-4" /> Apply Now
                            </button>
                          )}
                          {enrollment?.status === 'pending' && (
                            <span className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg">
                              Awaiting approval
                            </span>
                          )}
                          {enrollment?.status === 'active' && (
                            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                              <Star className="w-3.5 h-3.5 fill-green-500 text-green-500" /> Active Plan
                            </span>
                          )}
                          {enrollment?.status === 'cancelled' && (
                            <button
                              onClick={() => { setShowApplyModal(policy); setApplyNotes(''); setError(''); }}
                              className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                              <Plus className="w-4 h-4" /> Re-apply
                            </button>
                          )}

                          {/* Expand/collapse */}
                          <button
                            onClick={() => setExpanded(isExpanded ? null : policy.id)}
                            className="text-gray-400 hover:text-gray-600 p-1">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable details */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50/50">
                        {policy.covered_services?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Covered Services</p>
                            <div className="flex flex-wrap gap-1.5">
                              {policy.covered_services.map((s: string, i: number) => (
                                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {policy.network_hospitals?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Network Hospitals</p>
                            <div className="flex flex-wrap gap-1.5">
                              {policy.network_hospitals.map((h: string, i: number) => (
                                <span key={i} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MY ENROLLMENTS TAB ── */}
          {tab === 'my' && (
            <div className="space-y-4">
              {enrollments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="mb-3">No enrollments yet.</p>
                  <button onClick={() => setTab('browse')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                    Browse Plans
                  </button>
                </div>
              ) : enrollments.map(enrollment => {
                const sc = statusConfig[enrollment.status] ?? statusConfig.pending;
                const StatusIcon = sc.icon;
                return (
                  <div key={enrollment.id} className={`border rounded-xl p-5 ${
                    enrollment.status === 'active'    ? 'border-green-200  bg-green-50/30'  :
                    enrollment.status === 'pending'   ? 'border-yellow-200 bg-yellow-50/20' :
                    enrollment.status === 'cancelled' ? 'border-gray-200   bg-gray-50 opacity-70' :
                    'border-red-200 bg-red-50/20'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900">{enrollment.policy_name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${typeColor[enrollment.policy_type] || typeColor.basic}`}>
                            {enrollment.policy_type}
                          </span>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" /> {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Insurer: {enrollment.insurer_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Applied: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          {enrollment.expires_at && enrollment.status === 'active' && (
                            <> · Expires: {new Date(enrollment.expires_at).toLocaleDateString()}</>
                          )}
                        </p>

                        {/* Key numbers */}
                        <div className="grid grid-cols-3 gap-3 mt-3 max-w-xs">
                          <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                            <p className="text-xs text-gray-500">Coverage</p>
                            <p className="text-gray-900 font-bold text-sm">
                              ${(parseFloat(enrollment.coverage_amount || 0) / 1000).toFixed(0)}K
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                            <p className="text-xs text-gray-500">Premium</p>
                            <p className="text-green-600 font-bold text-sm">
                              ${parseFloat(enrollment.premium_monthly || 0).toFixed(0)}/mo
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                            <p className="text-xs text-gray-500">Deductible</p>
                            <p className="text-yellow-600 font-bold text-sm">
                              ${parseFloat(enrollment.deductible || 0).toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Cancel button */}
                      {(enrollment.status === 'pending' || enrollment.status === 'active') && (
                        <button
                          onClick={() => handleCancel(enrollment.id)}
                          disabled={cancelling === enrollment.id}
                          className="flex items-center gap-1 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ml-4">
                          {cancelling === enrollment.id
                            ? <Loader className="w-3 h-3 animate-spin" />
                            : <XCircle className="w-3 h-3" />}
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Apply Modal ── */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-xl">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg">Apply for Insurance Plan</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Plan summary */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="text-gray-900 font-semibold">{showApplyModal.policy_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Insurer</span>
                  <span className="text-gray-900">{showApplyModal.insurer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly Premium</span>
                  <span className="text-green-600 font-bold">${parseFloat(showApplyModal.premium_monthly).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coverage</span>
                  <span className="text-gray-900 font-bold">${parseFloat(showApplyModal.coverage_amount).toLocaleString()}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Additional Notes (optional)
                </label>
                <textarea
                  value={applyNotes}
                  onChange={e => setApplyNotes(e.target.value)}
                  placeholder="Any pre-existing conditions or special requirements..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <p className="text-xs text-gray-400">
                Your application will be reviewed by {showApplyModal.insurer_name}. You will be notified once it is approved and activated.
              </p>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => { setShowApplyModal(null); setError(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={applying === showApplyModal.id}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {applying === showApplyModal.id
                  ? <><Loader className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Shield className="w-4 h-4" /> Submit Application</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};