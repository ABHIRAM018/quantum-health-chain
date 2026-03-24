import React, { useState, useEffect } from 'react';
import {
  FileText, User, CreditCard, Shield, Stethoscope,
  CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Send, Loader
} from 'lucide-react';

interface ForwardToInsuranceModalProps {
  bill: any;
  patientName: string;
  onClose: () => void;
  onSubmit: (data: ClaimData) => Promise<void>;
}

export interface ClaimData {
  insuranceId:   string;
  policyNumber:  string;
  idProof:       string;
  notes:         string;
  coverageConfirmed: boolean;
  documentsChecked:  boolean;
}

const authHeader = (): Record<string, string> => {
  const t = localStorage.getItem('auth_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

const STEPS = [
  { id: 1, label: 'Patient & Bill',     icon: User       },
  { id: 2, label: 'Documents',          icon: FileText   },
  { id: 3, label: 'Verify Details',     icon: CheckCircle},
  { id: 4, label: 'Prepare & Submit',   icon: Send       },
];

export const ForwardToInsuranceModal: React.FC<ForwardToInsuranceModalProps> = ({
  bill, patientName, onClose, onSubmit
}) => {
  const [step, setStep]                 = useState(1);
  const [insurers, setInsurers]         = useState<any[]>([]);
  const [policies, setPolicies]         = useState<any[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');

  const [data, setData] = useState<ClaimData>({
    insuranceId:      '',
    policyNumber:     '',
    idProof:          '',
    notes:            '',
    coverageConfirmed: false,
    documentsChecked:  false,
  });

  // Form checkboxes for documents
  const [docs, setDocs] = useState({
    patientDetails:    false,
    billInvoice:       true,  // auto-checked since bill exists
    idProof:           false,
    policyCard:        false,
    prescription:      false,
  });

  useEffect(() => {
    // Load insurance providers
    fetch('/api/users/role/insurance', { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(setInsurers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!data.insuranceId) return;
    // Load policies for selected insurer
    fetch('/api/policies', { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(all => setPolicies(all.filter((p: any) =>
        (p.insurance_id ?? p.insuranceId) === data.insuranceId && p.status === 'active'
      )))
      .catch(() => {});
  }, [data.insuranceId]);

  const allDocsChecked = Object.values(docs).every(Boolean);
  const selectedInsurer = insurers.find(i => i.id === data.insuranceId);

  const canProceed = (s: number) => {
    if (s === 1) return !!data.insuranceId;
    if (s === 2) return allDocsChecked && !!data.idProof;
    if (s === 3) return data.coverageConfirmed && data.documentsChecked;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Forward to Insurance</h2>
              <p className="text-xs text-gray-500">Bill #{bill.id?.slice(0,8)}… · ${Number(bill.amount).toFixed(2)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Step indicators */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      done   ? 'bg-green-500 text-white' :
                      active ? 'bg-orange-500 text-white' :
                               'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${active ? 'text-orange-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-5 mx-1 transition-colors ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1 — Patient & Bill Details */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-orange-500" /> Patient & Bill Information
              </h3>

              {/* Bill summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Patient</span><p className="font-semibold text-gray-900 mt-0.5">{patientName}</p></div>
                  <div><span className="text-gray-500">Bill Amount</span><p className="font-bold text-orange-700 text-lg mt-0.5">${Number(bill.amount).toFixed(2)}</p></div>
                  <div><span className="text-gray-500">Bill Date</span><p className="font-medium text-gray-900 mt-0.5">{new Date(bill.created_at ?? bill.createdAt).toLocaleDateString()}</p></div>
                  <div><span className="text-gray-500">Status</span><p className="font-medium text-amber-600 mt-0.5 capitalize">{bill.status}</p></div>
                </div>
              </div>

              {/* Select insurer */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Insurance Provider <span className="text-red-500">*</span>
                </label>
                {insurers.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
                    No insurance providers registered in the system.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {insurers.map(ins => (
                      <label key={ins.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        data.insuranceId === ins.id
                          ? 'border-orange-400 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                      }`}>
                        <input type="radio" name="insurer" value={ins.id}
                          checked={data.insuranceId === ins.id}
                          onChange={() => setData(d => ({ ...d, insuranceId: ins.id, policyNumber: '' }))}
                          className="accent-orange-500" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{ins.name}</p>
                          <p className="text-xs text-gray-500">{ins.email}</p>
                        </div>
                        {data.insuranceId === ins.id && <CheckCircle className="w-5 h-5 text-orange-500" />}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Select policy */}
              {data.insuranceId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Policy / Insurance Card Number
                  </label>
                  {policies.length > 0 ? (
                    <select value={data.policyNumber}
                      onChange={e => setData(d => ({ ...d, policyNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400">
                      <option value="">Select a policy (optional)</option>
                      {policies.map(p => (
                        <option key={p.id} value={p.policy_number ?? p.policyName ?? p.id}>
                          {p.policy_name ?? p.policyName} — ${Number(p.coverage_amount ?? p.coverageAmount ?? 0).toLocaleString()} coverage
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={data.policyNumber}
                      onChange={e => setData(d => ({ ...d, policyNumber: e.target.value }))}
                      placeholder="Enter policy number manually"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Documents */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" /> Collect Required Documents
              </h3>
              <p className="text-gray-500 text-sm">Confirm all required documents have been collected before proceeding.</p>

              <div className="space-y-3">
                {[
                  { key: 'patientDetails',  icon: User,        label: 'Patient Details / Customer Details', desc: 'Full name, date of birth, contact information' },
                  { key: 'billInvoice',     icon: CreditCard,  label: 'Bills / Invoices',                   desc: `Bill #${bill.id?.slice(0,8)} — $${Number(bill.amount).toFixed(2)}` },
                  { key: 'idProof',         icon: Shield,      label: 'ID Proof',                           desc: 'Government-issued ID, Aadhaar, Passport etc.' },
                  { key: 'policyCard',      icon: FileText,    label: 'Policy Number / Insurance Card',     desc: 'Active insurance policy document' },
                  { key: 'prescription',    icon: Stethoscope, label: 'Doctor Prescription (if medical)',   desc: 'Required for medical/surgical claims' },
                ].map(item => {
                  const Icon = item.icon;
                  const checked = docs[item.key as keyof typeof docs];
                  return (
                    <label key={item.key} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      checked ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-orange-200'
                    }`}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setDocs(d => ({ ...d, [item.key]: !d[item.key as keyof typeof docs] }))}
                        className="w-4 h-4 accent-green-500 shrink-0" />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${checked ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-4 h-4 ${checked ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${checked ? 'text-green-800' : 'text-gray-700'}`}>{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      {checked && <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
                    </label>
                  );
                })}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  ID Proof Reference Number <span className="text-red-500">*</span>
                </label>
                <input value={data.idProof}
                  onChange={e => setData(d => ({ ...d, idProof: e.target.value }))}
                  placeholder="e.g. Aadhaar: XXXX-XXXX-XXXX or Passport: A1234567"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
              </div>

              {!allDocsChecked && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Please confirm all documents are collected before proceeding.
                </div>
              )}
            </div>
          )}

          {/* STEP 3 — Verify Details */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-orange-500" /> Verify Details
              </h3>

              {/* Summary card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200">
                {[
                  { label: 'Patient',           value: patientName },
                  { label: 'Bill Amount',        value: `$${Number(bill.amount).toFixed(2)}` },
                  { label: 'Insurance Provider', value: selectedInsurer?.name ?? '—' },
                  { label: 'Policy Number',      value: data.policyNumber || 'Not specified' },
                  { label: 'ID Proof',           value: data.idProof },
                  { label: 'Documents',          value: `${Object.values(docs).filter(Boolean).length}/5 collected` },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500 text-sm">{row.label}</span>
                    <span className="font-medium text-gray-900 text-sm">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Verification checkboxes */}
              <div className="space-y-3">
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${data.documentsChecked ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={data.documentsChecked}
                    onChange={() => setData(d => ({ ...d, documentsChecked: !d.documentsChecked }))}
                    className="w-4 h-4 accent-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">All information is correct and complete</p>
                    <p className="text-xs text-gray-500 mt-0.5">I confirm the patient details, bill amount, and documents are accurate.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer ${data.coverageConfirmed ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <input type="checkbox" checked={data.coverageConfirmed}
                    onChange={() => setData(d => ({ ...d, coverageConfirmed: !d.coverageConfirmed }))}
                    className="w-4 h-4 accent-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Policy is active and claim is within coverage</p>
                    <p className="text-xs text-gray-500 mt-0.5">I confirm the patient's insurance policy is active and this claim is covered.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4 — Prepare & Submit */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-500" /> Prepare Claim File & Submit
              </h3>

              {/* Claim file summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-orange-800 mb-3">Claim File Summary</p>
                <div className="space-y-2 text-sm">
                  {[
                    { icon: User,        label: 'Patient',          value: patientName },
                    { icon: CreditCard,  label: 'Claim Amount',     value: `$${Number(bill.amount).toFixed(2)}` },
                    { icon: Shield,      label: 'Insurance',        value: selectedInsurer?.name },
                    { icon: FileText,    label: 'Policy',           value: data.policyNumber || 'Pending assignment' },
                    { icon: CheckCircle, label: 'Documents',        value: '5/5 collected' },
                    { icon: CheckCircle, label: 'Verification',     value: 'Passed' },
                  ].map(row => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <Icon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="text-gray-500 w-24">{row.label}</span>
                        <span className="font-medium text-gray-900">{row.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Notes / Supporting Information</label>
                <textarea value={data.notes}
                  onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
                  rows={3} placeholder="Add any additional context, special circumstances, or supporting information..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none" />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                <p className="font-semibold mb-1">What happens next?</p>
                <ol className="space-y-1 list-decimal list-inside text-xs">
                  <li>Claim is submitted to <strong>{selectedInsurer?.name}</strong></li>
                  <li>Insurance team reviews patient eligibility & coverage</li>
                  <li>Insurance approves and creates payment request to bank</li>
                  <li>Bank processes payment directly to hospital</li>
                  <li>Patient & hospital are notified of final settlement</li>
                </ol>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex items-center justify-between">
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            Step {step} of {STEPS.length}
          </div>

          {step < 4 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed(step)}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !canProceed(step)}
              className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Claim</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};