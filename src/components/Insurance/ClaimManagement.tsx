import React, { useState, useEffect } from 'react';
import {
  Shield, CheckCircle, XCircle, Clock, Send, Building2,
  AlertCircle, Loader, FileText, User, CreditCard, Stethoscope,
  Phone, MapPin, Hash, ClipboardList, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../../utils/api';
import { Insurance, InsuranceClaim } from '../../types';

interface ClaimManagementProps {
  user: Insurance;
  onBack: () => void;
}

interface ClaimDocument {
  id: string;
  claim_id: string;
  bill_id: string;
  patient_id: string;
  submitted_by_role: string;
  patient_name: string;
  patient_phone: string;
  patient_address: string;
  date_of_birth: string;
  policy_number: string;
  insurance_card: string;
  insurance_name: string;
  doctor_name: string;
  doctor_prescription: string;
  diagnosis: string;
  has_bill: boolean;
  has_id_proof: boolean;
  has_policy_card: boolean;
  has_prescription: boolean;
  details_verified: boolean;
  policy_active: boolean;
  coverage_confirmed: boolean;
  claim_form_filled: boolean;
  documents_arranged: boolean;
  supporting_docs_added: boolean;
  notes: string;
  created_at: string;
}

const authHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {} as Record<string, string>;
};

// ── Small badge-style checklist item ────────────────────────
const DocBadge: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
    ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
  }`}>
    {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {label}
  </span>
);

export const ClaimManagement: React.FC<ClaimManagementProps> = ({ user, onBack }) => {
  const [claims, setClaims]               = useState<InsuranceClaim[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [filter, setFilter]               = useState('all');

  const [reviewData, setReviewData] = useState({ notes: '' });

  // Send-to-bank modal state
  const [showBankModal, setShowBankModal]   = useState(false);
  const [banks, setBanks]                   = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [bankNotes, setBankNotes]           = useState('');
  const [sending, setSending]               = useState(false);
  const [reviewing, setReviewing]           = useState(false);

  const [patientNames, setPatientNames] = useState<Record<string, string>>({});

  // Claim documents
  const [claimDocs, setClaimDocs] = useState<Record<string, ClaimDocument>>({});
  const [showDocs, setShowDocs]   = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => { loadClaims(); loadBanks(); loadPatientNames(); }, [user.id]);

  // Load docs when a claim is selected
  useEffect(() => {
    if (selectedClaim) {
      setShowDocs(false);
      loadClaimDocs(selectedClaim.id);
    }
  }, [selectedClaim?.id]);

  const loadClaims = async () => {
    try {
      const data = await api.insurance.getClaims(user.id, user.role);
      setClaims(data);
    } catch (e) {
      console.error('Error loading claims:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      const res = await fetch('/api/users/role/bank', { headers: authHeader() });
      if (res.ok) setBanks(await res.json());
    } catch { /* non-critical */ }
  };

  const loadPatientNames = async () => {
    try {
      const res = await fetch('/api/users/role/patient', { headers: authHeader() });
      if (res.ok) {
        const data: any[] = await res.json();
        const map: Record<string, string> = {};
        data.forEach(u => { map[u.id] = u.name; });
        setPatientNames(map);
      }
    } catch { /* non-critical */ }
  };

  const loadClaimDocs = async (claimId: string) => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/claim-documents/${claimId}`, { headers: authHeader() });
      if (res.ok) {
        const doc: ClaimDocument = await res.json();
        setClaimDocs(prev => ({ ...prev, [claimId]: doc }));
      }
    } catch { /* no docs yet */ }
    finally { setLoadingDocs(false); }
  };

  // ── Approve / Reject ──────────────────────────────────────
  const handleClaimReview = async (claimId: string, status: InsuranceClaim['status']) => {
    setReviewing(true);
    try {
      await api.insurance.updateClaimStatus(claimId, status, user.id, user.role, reviewData.notes);
      await loadClaims();
      setSelectedClaim(prev => prev?.id === claimId ? { ...prev, status } : prev);
      setReviewData({ notes: '' });
    } catch (e) {
      alert('Error updating claim status');
    } finally {
      setReviewing(false);
    }
  };

  const openBankModal = () => {
    if (banks.length > 0) setSelectedBankId(banks[0].id);
    setBankNotes('');
    setShowBankModal(true);
  };

  const handleSendToBank = async () => {
    if (!selectedBankId) { alert('Please select a bank'); return; }
    if (!selectedClaim)  return;
    setSending(true);
    try {
      const res = await fetch(`/api/claims/${selectedClaim.id}/send-to-bank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ bankId: selectedBankId, notes: bankNotes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send payment request');
      }
      await loadClaims();
      setShowBankModal(false);
      setSelectedClaim(null);
      alert('✅ Payment request successfully sent to bank!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const filteredClaims = claims.filter(c => filter === 'all' || c.status === filter);

  const statusIcon = (status: string) => {
    if (status === 'approved')    return <CheckCircle className="w-4 h-4" />;
    if (status === 'rejected')    return <XCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const statusColors = (status: string) => ({
    badge: status === 'approved'    ? 'bg-green-100 text-emerald-700'  :
           status === 'rejected'    ? 'bg-red-100 text-red-700'        :
           status === 'under_review'? 'bg-yellow-100 text-amber-700'   :
                                      'bg-blue-100 text-blue-700',
    icon:  status === 'approved'    ? 'bg-green-100 text-green-600'    :
           status === 'rejected'    ? 'bg-red-100 text-red-600'        :
                                      'bg-yellow-100 text-yellow-600',
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading claims...</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Claim Management</h1>
        <button onClick={onBack} className="text-orange-600 font-medium">Back to Dashboard</button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'all',          label: 'All Claims'   },
              { id: 'submitted',    label: 'New Claims'   },
              { id: 'under_review', label: 'Under Review' },
              { id: 'approved',     label: 'Approved'     },
              { id: 'rejected',     label: 'Rejected'     },
            ].map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300'
                }`}>
                {tab.label}
                {tab.id !== 'all' && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {claims.filter(c => c.status === tab.id).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Claims List */}
            <div className="space-y-3">
              {filteredClaims.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No claims found.</p>
                </div>
              ) : filteredClaims.map(claim => {
                const colors = statusColors(claim.status);
                const hasDoc = !!claimDocs[claim.id];
                return (
                  <div key={claim.id}
                    className={`bg-white rounded-xl p-4 cursor-pointer transition-all border ${
                      selectedClaim?.id === claim.id
                        ? 'ring-2 ring-orange-500 border-orange-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedClaim(selectedClaim?.id === claim.id ? null : claim)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full shrink-0 ${colors.icon}`}>
                          {statusIcon(claim.status)}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">
                            Claim #{claim.id.slice(-12)}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Patient: {patientNames[claim.patientId] || claim.patientId.slice(-8)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Bill: {claim.billId.slice(-12)}
                          </p>
                          <p className="text-lg font-bold text-orange-600 mt-1">${claim.amount}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(claim.createdAt).toLocaleDateString()}
                          </p>
                          {hasDoc && (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1">
                              <FileText className="w-3 h-3" /> Documents attached
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                        {claim.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Claim Review Panel */}
            <div className="bg-white rounded-xl border border-gray-200">
              {selectedClaim ? (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Claim Review</h2>
                    <button onClick={() => setSelectedClaim(null)}
                      className="text-gray-400 hover:text-gray-600 p-1">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Basic Claim Details */}
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Claim Details</h3>
                    <div className="space-y-2 text-sm">
                      {[
                        ['Claim ID',   selectedClaim.id],
                        ['Patient',    patientNames[selectedClaim.patientId] || selectedClaim.patientId],
                        ['Bill ID',    selectedClaim.billId],
                        ['Amount',     `$${selectedClaim.amount}`],
                        ['Status',     selectedClaim.status.replace('_', ' ')],
                        ['Submitted',  new Date(selectedClaim.createdAt).toLocaleDateString()],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between">
                          <span className="text-gray-500 font-medium">{label}:</span>
                          <span className="text-gray-900 text-right max-w-[55%] break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Claim Documents Section ── */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowDocs(s => !s)}
                      className="w-full flex items-center justify-between p-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-blue-600" />
                        Submitted Documents &amp; Patient Details
                        {claimDocs[selectedClaim.id] && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-normal">Available</span>
                        )}
                      </span>
                      {showDocs ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {showDocs && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {loadingDocs ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader className="w-5 h-5 animate-spin text-blue-500" />
                          </div>
                        ) : claimDocs[selectedClaim.id] ? (() => {
                          const doc = claimDocs[selectedClaim.id];
                          return (
                            <div className="space-y-4 text-sm">

                              {/* Patient info */}
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5" /> Patient Details
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                  {doc.patient_name    && <div><span className="text-gray-500">Name: </span><span className="font-medium text-gray-900">{doc.patient_name}</span></div>}
                                  {doc.patient_phone   && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" /><span className="font-medium text-gray-900">{doc.patient_phone}</span></div>}
                                  {doc.date_of_birth   && <div><span className="text-gray-500">DOB: </span><span className="font-medium text-gray-900">{doc.date_of_birth}</span></div>}
                                  {doc.patient_address && <div className="col-span-2 flex items-start gap-1"><MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" /><span className="font-medium text-gray-900">{doc.patient_address}</span></div>}
                                </div>
                              </div>

                              {/* Policy info */}
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5" /> Policy / Insurance
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                  {doc.policy_number   && <div className="flex items-center gap-1"><Hash className="w-3 h-3 text-gray-400" /><span className="font-medium text-gray-900">{doc.policy_number}</span></div>}
                                  {doc.insurance_card  && <div className="flex items-center gap-1"><CreditCard className="w-3 h-3 text-gray-400" /><span className="font-medium text-gray-900">{doc.insurance_card}</span></div>}
                                  {doc.insurance_name  && <div className="col-span-2"><span className="text-gray-500">Company: </span><span className="font-medium text-gray-900">{doc.insurance_name}</span></div>}
                                </div>
                              </div>

                              {/* Medical info */}
                              {(doc.doctor_name || doc.diagnosis || doc.doctor_prescription) && (
                                <div>
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Stethoscope className="w-3.5 h-3.5" /> Medical Details
                                  </p>
                                  <div className="space-y-1">
                                    {doc.doctor_name        && <div><span className="text-gray-500">Doctor: </span><span className="font-medium text-gray-900">{doc.doctor_name}</span></div>}
                                    {doc.diagnosis          && <div><span className="text-gray-500">Diagnosis: </span><span className="font-medium text-gray-900">{doc.diagnosis}</span></div>}
                                    {doc.doctor_prescription && <div className="mt-1 p-2 bg-white rounded border border-gray-200"><p className="text-xs text-gray-500 mb-1">Prescription:</p><p className="text-gray-800">{doc.doctor_prescription}</p></div>}
                                  </div>
                                </div>
                              )}

                              {/* Checklists */}
                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" /> Documents Attached
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  <DocBadge label="Bill"         ok={doc.has_bill} />
                                  <DocBadge label="ID Proof"     ok={doc.has_id_proof} />
                                  <DocBadge label="Policy Card"  ok={doc.has_policy_card} />
                                  <DocBadge label="Prescription" ok={doc.has_prescription} />
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Verification Status</p>
                                <div className="flex flex-wrap gap-1.5">
                                  <DocBadge label="Details Verified"  ok={doc.details_verified} />
                                  <DocBadge label="Policy Active"     ok={doc.policy_active} />
                                  <DocBadge label="Coverage Confirmed" ok={doc.coverage_confirmed} />
                                  <DocBadge label="Claim Form Filled" ok={doc.claim_form_filled} />
                                  <DocBadge label="Docs Arranged"     ok={doc.documents_arranged} />
                                  <DocBadge label="Supporting Docs"   ok={doc.supporting_docs_added} />
                                </div>
                              </div>

                              {doc.notes && (
                                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                                  <p className="text-xs text-gray-500 font-medium mb-1">Submission Notes:</p>
                                  <p className="text-gray-800">{doc.notes}</p>
                                </div>
                              )}

                              <p className="text-xs text-gray-400 text-right">
                                Submitted by: {doc.submitted_by_role} • {new Date(doc.created_at).toLocaleString()}
                              </p>
                            </div>
                          );
                        })() : (
                          <div className="text-center py-6 text-gray-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No documents submitted with this claim.</p>
                            <p className="text-xs mt-1">Older claims submitted without the document wizard may not have attachments.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedClaim.approvalLetter && (
                    <div className="bg-green-50 border border-green-100 p-3 rounded-lg">
                      <p className="text-xs font-medium text-green-700 mb-1">Approval Notes</p>
                      <p className="text-sm text-green-800">{selectedClaim.approvalLetter}</p>
                    </div>
                  )}

                  {selectedClaim.rejectionReason && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-lg">
                      <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-800">{selectedClaim.rejectionReason}</p>
                    </div>
                  )}

                  {/* Review Actions */}
                  {(selectedClaim.status === 'submitted' || selectedClaim.status === 'under_review') && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">
                          Review Notes (saved with decision)
                        </label>
                        <textarea
                          value={reviewData.notes}
                          onChange={e => setReviewData({ notes: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                          placeholder="Enter approval letter or rejection reason..."
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleClaimReview(selectedClaim.id, 'approved')}
                          disabled={reviewing}
                          className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium">
                          {reviewing ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleClaimReview(selectedClaim.id, 'rejected')}
                          disabled={reviewing}
                          className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium">
                          {reviewing ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedClaim.status === 'approved' && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">
                          This will create a payment record in the bank's system, update the bill status to <strong>submitted</strong>, and notify the patient and hospital.
                        </p>
                      </div>
                      <button
                        onClick={openBankModal}
                        className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2 font-medium">
                        <Send className="w-4 h-4" />
                        Send Payment Request to Bank
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 py-16">
                  <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Select a claim to review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Send-to-Bank Confirmation Modal ───────────────── */}
      {showBankModal && selectedClaim && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-gray-200 shadow-xl">
            <div className="p-5 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                Confirm Payment Request to Bank
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Claim</span>
                  <span className="text-gray-900 font-medium">#{selectedClaim.id.slice(-12)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Patient</span>
                  <span className="text-gray-900 font-medium">
                    {patientNames[selectedClaim.patientId] || selectedClaim.patientId.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="text-orange-600 font-bold text-base">${selectedClaim.amount}</span>
                </div>
                {claimDocs[selectedClaim.id]?.policy_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Policy No.</span>
                    <span className="text-gray-900 font-medium">{claimDocs[selectedClaim.id].policy_number}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Select Bank <span className="text-red-500">*</span>
                </label>
                {banks.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No banks registered in the system. Please add a bank user first.
                  </div>
                ) : (
                  <select
                    value={selectedBankId}
                    onChange={e => setSelectedBankId(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400">
                    {banks.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.bank_name ? ` — ${b.bank_name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Payment Instructions / Notes (optional)
                </label>
                <textarea
                  value={bankNotes}
                  onChange={e => setBankNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Priority processing required, direct to hospital account..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-700">What happens after confirmation:</p>
                {[
                  'Payment record created in bank system (status: pending)',
                  'Bill status updated to "submitted"',
                  'Patient notified — insurance payment in progress',
                  'Hospital notified — payment dispatched',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setShowBankModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSendToBank}
                disabled={sending || !selectedBankId || banks.length === 0}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {sending
                  ? <><Loader className="w-4 h-4 animate-spin" /> Sending...</>
                  : <><Send className="w-4 h-4" /> Confirm & Send</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};