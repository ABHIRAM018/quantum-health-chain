import React, { useState, useEffect } from 'react';
import {
  CreditCard, FileText, Send, Download, CheckCircle,
  Clock, AlertCircle, ChevronRight, Shield, Info, Loader
} from 'lucide-react';
import { api } from '../../utils/api';
import { Patient, Bill, InsuranceClaim } from '../../types';
import { ClaimWizard, ClaimDocumentData } from './ClaimWizard';

interface BillsAndClaimsProps {
  user: Patient;
  onBack: () => void;
}

type PaymentStep = 'idle' | 'confirming' | 'processing' | 'done' | 'error';

// ── Derives a rich display status from bill + its claim ───────
function getEffectiveStatus(bill: Bill, claims: InsuranceClaim[]): {
  label: string;
  color: string;
  description: string;
} {
  const billStatus = bill.status as string;

  if (billStatus === 'paid') {
    return { label: 'Paid', color: 'bg-green-100 text-green-700', description: 'Bill has been fully settled' };
  }

  const claim = claims.find(
    c => c.billId === bill.id || (c as any).bill_id === bill.id
  );

  if (!claim) {
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', description: 'Awaiting action' };
  }

  const cs = claim.status as string;

  if (cs === 'submitted')    return { label: 'Claim Submitted',    color: 'bg-blue-100 text-blue-700',   description: 'Waiting for insurance review' };
  if (cs === 'under_review') return { label: 'Under Review',       color: 'bg-purple-100 text-purple-700', description: 'Insurance is reviewing your claim' };
  if (cs === 'rejected')     return { label: 'Claim Rejected',     color: 'bg-red-100 text-red-700',     description: 'Insurance rejected — you may need to pay directly' };

  if (cs === 'approved') {
    if (billStatus === 'submitted') return { label: 'Sent to Bank',  color: 'bg-indigo-100 text-indigo-700', description: 'Insurance approved — payment sent to bank' };
    return { label: 'Claim Approved', color: 'bg-green-100 text-green-700', description: 'Insurance approved — processing payment' };
  }

  const labelMap: Record<string, string> = {
    pending: 'Pending', submitted: 'With Insurance', approved: 'Approved', paid: 'Paid',
  };
  return { label: labelMap[billStatus] ?? billStatus, color: 'bg-gray-100 text-gray-600', description: '' };
}

// ─────────────────────────────────────────────────────────────
// Re-export ClaimWizard from same folder so Hospital can import it too
// ─────────────────────────────────────────────────────────────
export { ClaimWizard } from './ClaimWizard';

export const BillsAndClaims: React.FC<BillsAndClaimsProps> = ({ user, onBack }) => {
  const [bills, setBills]       = useState<Bill[]>([]);
  const [claims, setClaims]     = useState<InsuranceClaim[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('bills');
  const [payingBillId, setPayingBillId]   = useState<string | null>(null);
  const [payStep, setPayStep]             = useState<PaymentStep>('idle');
  const [payMessage, setPayMessage]       = useState('');

  // Wizard state
  const [wizardBill, setWizardBill] = useState<Bill | null>(null);

  useEffect(() => { loadData(); }, [user.id]);

  const loadData = async () => {
    try {
      const [billsData, claimsData] = await Promise.all([
        api.patients.getBills(user.id, user.role),
        api.patients.getInsuranceClaims(user.id, user.role),
      ]);
      setBills(billsData);
      setClaims(claimsData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Payment flow ─────────────────────────────────────────
  const startPayment   = (billId: string) => { setPayingBillId(billId); setPayStep('confirming'); setPayMessage(''); };
  const cancelPayment  = () => { setPayingBillId(null); setPayStep('idle'); setPayMessage(''); };

  const confirmPayment = async (billId: string) => {
    setPayStep('processing');
    setPayMessage('Contacting payment gateway...');
    try {
      await new Promise(r => setTimeout(r, 600));
      setPayMessage('Verifying bill details...');
      await new Promise(r => setTimeout(r, 600));
      setPayMessage('Processing payment...');

      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/bills/${billId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Payment failed');

      await loadData();
      setPayMessage('Payment successful!');
      setPayStep('done');
      setTimeout(cancelPayment, 2000);
    } catch (e: any) {
      setPayStep('error');
      setPayMessage(e.message || 'Payment failed');
    }
  };

  // ── Wizard submit ────────────────────────────────────────
  const handleWizardSubmit = async (wizardData: ClaimDocumentData) => {
    const bill = wizardBill!;
    const token = localStorage.getItem('auth_token');

    // 1. Find insurance provider
    const insRes = await fetch('/api/users/role/insurance', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const insurers = insRes.ok ? await insRes.json() : [];
    const insuranceId = (user as any).insuranceId || (user as any).insurance_id || insurers[0]?.id;
    if (!insuranceId) throw new Error('No insurance provider found.');

    // 2. Submit the claim
    await api.patients.submitInsuranceClaim(
      { patientId: user.id, billId: bill.id, insuranceId, amount: bill.amount },
      user.role
    );

    // 3. Save claim documents to DB
    const claimsAfter = await api.patients.getInsuranceClaims(user.id, user.role);
    const newClaim = claimsAfter.find(
      c => (c.billId === bill.id || (c as any).bill_id === bill.id)
    );

    if (newClaim) {
      await fetch('/api/claim-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          claimId:            newClaim.id,
          billId:             bill.id,
          patientId:          user.id,
          submittedByRole:    'patient',
          patientName:        wizardData.patientName,
          patientPhone:       wizardData.patientPhone,
          patientAddress:     wizardData.patientAddress,
          dateOfBirth:        wizardData.dateOfBirth,
          policyNumber:       wizardData.policyNumber,
          insuranceCard:      wizardData.insuranceCard,
          insuranceName:      wizardData.insuranceName,
          doctorName:         wizardData.doctorName,
          doctorPrescription: wizardData.doctorPrescription,
          diagnosis:          wizardData.diagnosis,
          hasBill:            wizardData.hasBill,
          hasIdProof:         wizardData.hasIdProof,
          hasPolicyCard:      wizardData.hasPolicyCard,
          hasPrescription:    wizardData.hasPrescription,
          detailsVerified:    wizardData.detailsVerified,
          policyActive:       wizardData.policyActive,
          coverageConfirmed:  wizardData.coverageConfirmed,
          claimFormFilled:    wizardData.claimFormFilled,
          documentsArranged:  wizardData.documentsArranged,
          supportingDocsAdded: wizardData.supportingDocsAdded,
          notes:              wizardData.notes,
        }),
      });
    }

    await loadData();
    setWizardBill(null);
    setActiveTab('claims');
  };

  const handleDownload = (bill: Bill) => {
    const lines = [
      'MEDICAL BILL RECEIPT', '===================',
      `Bill ID:   ${bill.id}`, `Patient:   ${user.name}`,
      `Date:      ${new Date(bill.createdAt).toLocaleDateString()}`,
      `Status:    ${bill.status}`, '',
      'ITEMS:',
      ...(bill.items || []).map((i: any) => `  ${i.description} x${i.quantity}  $${i.total}`),
      '', `TOTAL: $${bill.amount}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `bill-${bill.id.slice(-8)}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const hasClaim = (billId: string) =>
    claims.some(c => c.billId === billId || (c as any).bill_id === billId);

  const canPayDirectly = (bill: Bill) => {
    const claim = claims.find(c => c.billId === bill.id || (c as any).bill_id === bill.id);
    const billStatus = bill.status as string;
    if (billStatus === 'paid') return false;
    if (!claim) return true;
    if (claim.status === 'rejected') return true;
    if (billStatus === 'approved') return true;
    return false;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bills & Claims</h1>
        <button onClick={onBack} className="text-blue-600 font-medium">Back to Dashboard</button>
      </div>

      {/* Payment flow guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2 text-blue-700 font-medium text-sm">
          <Info className="w-4 h-4" /> Payment Process
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-600 flex-wrap">
          {[
            'Hospital creates bill', 'Collect & submit documents',
            'Insurance reviews', 'Bank processes payment',
          ].map((step, i) => (
            <React.Fragment key={step}>
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-blue-200">
                <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">{i+1}</span>
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'bills',  label: 'Bills',            count: bills.length  },
              { id: 'claims', label: 'Insurance Claims', count: claims.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 space-y-4">
          {/* ── BILLS TAB ── */}
          {activeTab === 'bills' && (
            <>
              {bills.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No bills yet. Bills appear here after the hospital creates them.</p>
                </div>
              ) : bills.map(bill => {
                const effStatus = getEffectiveStatus(bill, claims);
                const billClaim = claims.find(c => c.billId === bill.id || (c as any).bill_id === bill.id);
                return (
                  <div key={bill.id} className={`border rounded-xl p-4 transition-colors ${
                    (bill.status as string) === 'paid' ? 'border-green-200 bg-green-50/30' :
                    effStatus.label.includes('Sent') || effStatus.label.includes('Approved') ? 'border-indigo-200 bg-indigo-50/20' :
                    'border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          (bill.status as string) === 'paid' ? 'bg-green-100 text-green-600' :
                          effStatus.label.includes('Reject') ? 'bg-red-100 text-red-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Bill #{bill.id.slice(-8)}</p>
                          <p className="text-sm text-gray-500">{new Date(bill.createdAt).toLocaleDateString()}</p>
                          <p className="text-xl font-bold text-orange-600 mt-1">${Number(bill.amount).toLocaleString()}</p>

                          {bill.items?.length > 0 && (
                            <div className="mt-2 space-y-0.5">
                              {bill.items.map((item: any, i: number) => (
                                <div key={item.id || i} className="flex justify-between text-xs text-gray-500">
                                  <span>{item.description} ×{item.quantity}</span>
                                  <span>${item.total ?? (item.quantity * (item.unit_price ?? item.unitPrice))}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {effStatus.description && (
                            <p className="text-xs text-gray-400 mt-1 italic">{effStatus.description}</p>
                          )}

                          {/* Inline payment confirm */}
                          {payingBillId === bill.id && (
                            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              {payStep === 'confirming' && (
                                <>
                                  <p className="text-sm font-medium text-gray-900 mb-2">Confirm Payment</p>
                                  <p className="text-xs text-gray-500 mb-3">
                                    You are about to pay <strong>${Number(bill.amount).toLocaleString()}</strong>. This will be recorded in the system.
                                  </p>
                                  <div className="flex gap-2">
                                    <button onClick={() => confirmPayment(bill.id)}
                                      className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs hover:bg-green-700 flex items-center gap-1">
                                      <Shield className="w-3 h-3" /> Confirm & Pay
                                    </button>
                                    <button onClick={cancelPayment}
                                      className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-xs hover:bg-gray-300">
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              )}
                              {payStep === 'processing' && (
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                  <Loader className="w-4 h-4 animate-spin" /> {payMessage}
                                </div>
                              )}
                              {payStep === 'done' && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <CheckCircle className="w-4 h-4" /> {payMessage}
                                </div>
                              )}
                              {payStep === 'error' && (
                                <div className="text-sm text-red-600">
                                  <p>{payMessage}</p>
                                  <button onClick={cancelPayment} className="mt-1 text-xs underline">Dismiss</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side — status badge + actions */}
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${effStatus.color}`}>
                          {effStatus.label}
                        </span>

                        <button onClick={() => handleDownload(bill)}
                          className="text-gray-400 hover:text-blue-600 p-1" title="Download Receipt">
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Open wizard to submit insurance claim */}
                        {(bill.status as string) === 'pending' && !hasClaim(bill.id) && (
                          <button
                            onClick={() => setWizardBill(bill)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Submit Insurance Claim
                          </button>
                        )}

                        {/* Claim in-progress indicator */}
                        {billClaim && !['rejected'].includes(billClaim.status) && (bill.status as string) !== 'paid' && (bill.status as string) !== 'approved' && (
                          <span className="text-xs text-indigo-600 flex items-center gap-1">
                            {billClaim.status === 'approved' || (bill.status as string) === 'submitted'
                              ? <CheckCircle className="w-3 h-3 text-green-500" />
                              : <Clock className="w-3 h-3" />}
                            {effStatus.label}
                          </span>
                        )}

                        {canPayDirectly(bill) && payingBillId !== bill.id && (
                          <button onClick={() => startPayment(bill.id)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-700 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> Pay Now
                          </button>
                        )}

                        {(bill.status as string) === 'paid' && (
                          <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                            <CheckCircle className="w-4 h-4" /> Fully Settled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* ── CLAIMS TAB ── */}
          {activeTab === 'claims' && (
            <>
              {claims.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No claims yet. Submit a claim from the Bills tab.</p>
                </div>
              ) : claims.map(claim => (
                <div key={claim.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        claim.status === 'approved'     ? 'bg-green-100 text-green-600'  :
                        claim.status === 'rejected'     ? 'bg-red-100   text-red-600'    :
                        claim.status === 'under_review' ? 'bg-yellow-100 text-yellow-600':
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {claim.status === 'approved' ? <CheckCircle className="w-4 h-4" /> :
                         claim.status === 'rejected'  ? <AlertCircle  className="w-4 h-4" /> :
                         <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Claim #{claim.id.slice(-8)}</p>
                        <p className="text-sm text-gray-500">Amount: ${Number(claim.amount).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">
                          Submitted: {new Date(claim.createdAt).toLocaleDateString()}
                        </p>
                        {claim.approvalLetter && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                            ✓ {claim.approvalLetter}
                          </div>
                        )}
                        {claim.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            ✗ {claim.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      claim.status === 'submitted'    ? 'bg-blue-100   text-blue-700'   :
                      claim.status === 'under_review' ? 'bg-yellow-100 text-yellow-700' :
                      claim.status === 'approved'     ? 'bg-green-100  text-green-700'  :
                      'bg-red-100 text-red-700'
                    }`}>{claim.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Claim Wizard Modal ── */}
      {wizardBill && (
        <ClaimWizard
          bill={wizardBill}
          mode="patient"
          patientInfo={{
            name:        (user as any).name,
            phone:       (user as any).phone,
            address:     (user as any).address,
            dateOfBirth: (user as any).dateOfBirth
              ? new Date((user as any).dateOfBirth).toISOString().split('T')[0]
              : undefined,
            insuranceId: (user as any).insuranceId || (user as any).insurance_id,
          }}
          onClose={() => setWizardBill(null)}
          onSubmit={handleWizardSubmit}
        />
      )}
    </div>
  );
};