import React, { useState, useEffect } from 'react';
import {
  X, ChevronRight, ChevronLeft, FileText, User, Shield,
  CheckCircle, AlertCircle, ClipboardList, Stethoscope,
  CreditCard, Phone, MapPin, Calendar, Hash, Building2,
  Loader, Check
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface ClaimWizardBill {
  id: string;
  amount: number | string;
  items?: { description: string; quantity: number; total?: number; unitPrice?: number }[];
  patientId?: string;
  patient_id?: string;
  hospitalId?: string;
  hospital_id?: string;
  doctorId?: string;
  doctor_id?: string;
}

export interface ClaimWizardProps {
  bill: ClaimWizardBill;
  mode: 'patient' | 'hospital';        // who is initiating
  patientInfo?: {                       // pre-fill from logged-in patient
    name?: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
    insuranceId?: string;
  };
  onClose: () => void;
  onSubmit: (wizardData: ClaimDocumentData) => Promise<void>;
}

export interface ClaimDocumentData {
  billId: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string;
  dateOfBirth: string;
  policyNumber: string;
  insuranceCard: string;
  insuranceName: string;
  doctorName: string;
  doctorPrescription: string;
  diagnosis: string;
  hasBill: boolean;
  hasIdProof: boolean;
  hasPolicyCard: boolean;
  hasPrescription: boolean;
  detailsVerified: boolean;
  policyActive: boolean;
  coverageConfirmed: boolean;
  claimFormFilled: boolean;
  documentsArranged: boolean;
  supportingDocsAdded: boolean;
  notes: string;
}

// ─────────────────────────────────────────────────────────────
// Step config
// ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'collect',  label: 'Collect Documents',   icon: FileText      },
  { id: 'verify',   label: 'Verify Details',       icon: CheckCircle   },
  { id: 'prepare',  label: 'Prepare Claim File',   icon: ClipboardList },
  { id: 'review',   label: 'Review & Submit',      icon: Shield        },
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, icon, required, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
      {icon && <span className="text-gray-400 w-4 h-4">{icon}</span>}
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white ${props.className || ''}`}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none ${props.className || ''}`}
  />
);

const CheckItem: React.FC<{
  label: string;
  sublabel?: string;
  checked: boolean;
  required?: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, sublabel, checked, required, onChange }) => (
  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
    checked ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-blue-200'
  }`}>
    <div
      onClick={() => onChange(!checked)}
      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${
        checked ? 'bg-green-500 border-green-500' : 'border-gray-300'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </div>
    <div onClick={() => onChange(!checked)}>
      <p className={`text-sm font-medium ${checked ? 'text-green-800' : 'text-gray-700'}`}>
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
    </div>
  </label>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export const ClaimWizard: React.FC<ClaimWizardProps> = ({
  bill, mode, patientInfo, onClose, onSubmit
}) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [data, setData] = useState<ClaimDocumentData>({
    billId: bill.id,
    patientName:    patientInfo?.name        || '',
    patientPhone:   patientInfo?.phone       || '',
    patientAddress: patientInfo?.address     || '',
    dateOfBirth:    patientInfo?.dateOfBirth || '',
    policyNumber:   patientInfo?.insuranceId || '',
    insuranceCard:  '',
    insuranceName:  '',
    doctorName:     '',
    doctorPrescription: '',
    diagnosis:      '',
    hasBill:        true,   // bill already exists in system
    hasIdProof:     false,
    hasPolicyCard:  false,
    hasPrescription: false,
    detailsVerified:  false,
    policyActive:     false,
    coverageConfirmed: false,
    claimFormFilled:   false,
    documentsArranged: false,
    supportingDocsAdded: false,
    notes: '',
  });

  const set = (key: keyof ClaimDocumentData, value: any) =>
    setData(d => ({ ...d, [key]: value }));

  // Validation per step
  const canProceed = (): boolean => {
    if (step === 0) {
      return !!(
        data.patientName &&
        data.policyNumber &&
        data.hasBill &&
        data.hasIdProof &&
        data.hasPolicyCard
      );
    }
    if (step === 1) {
      return data.detailsVerified && data.policyActive && data.coverageConfirmed;
    }
    if (step === 2) {
      return data.claimFormFilled && data.documentsArranged;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(data);
    } catch (e: any) {
      setError(e.message || 'Submission failed');
      setSubmitting(false);
    }
  };

  const amount = Number(bill.amount);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Submit Insurance Claim</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Bill #{bill.id.slice(-8)} — <span className="font-semibold text-blue-600">${amount.toLocaleString()}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-1 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      done   ? 'bg-green-500 text-white' :
                      active ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                               'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? <Check className="w-4 h-4" strokeWidth={3} /> : <Icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${
                      active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
                    }`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${
                      i < step ? 'bg-green-400' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── STEP 0: Collect Required Documents ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm mb-1">
                  <FileText className="w-4 h-4" /> Collect Required Documents
                </div>
                <p className="text-xs text-blue-600">Fill in the patient details and confirm all required documents are available before proceeding.</p>
              </div>

              {/* Patient / Customer Details */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" /> Patient / Customer Details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name" icon={<User className="w-3.5 h-3.5" />} required>
                    <Input value={data.patientName} onChange={e => set('patientName', e.target.value)} placeholder="Patient full name" />
                  </Field>
                  <Field label="Phone" icon={<Phone className="w-3.5 h-3.5" />}>
                    <Input value={data.patientPhone} onChange={e => set('patientPhone', e.target.value)} placeholder="+91 98765 43210" />
                  </Field>
                  <Field label="Date of Birth" icon={<Calendar className="w-3.5 h-3.5" />}>
                    <Input type="date" value={data.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                  </Field>
                  <Field label="Address" icon={<MapPin className="w-3.5 h-3.5" />}>
                    <Input value={data.patientAddress} onChange={e => set('patientAddress', e.target.value)} placeholder="Street, City" />
                  </Field>
                </div>
              </div>

              {/* Policy & Insurance */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-500" /> Policy Number / Insurance Card
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Policy Number" icon={<Hash className="w-3.5 h-3.5" />} required>
                    <Input value={data.policyNumber} onChange={e => set('policyNumber', e.target.value)} placeholder="e.g. POL-2024-001234" />
                  </Field>
                  <Field label="Insurance Card / Member ID" icon={<CreditCard className="w-3.5 h-3.5" />}>
                    <Input value={data.insuranceCard} onChange={e => set('insuranceCard', e.target.value)} placeholder="Member ID on card" />
                  </Field>
                  <Field label="Insurance Company Name" icon={<Building2 className="w-3.5 h-3.5" />} >
                    <Input value={data.insuranceName} onChange={e => set('insuranceName', e.target.value)} placeholder="e.g. HealthInsure Corp" className="col-span-2" />
                  </Field>
                </div>
              </div>

              {/* Doctor Prescription */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-gray-500" /> Doctor Prescription (if medical)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Attending Doctor" icon={<Stethoscope className="w-3.5 h-3.5" />}>
                    <Input value={data.doctorName} onChange={e => set('doctorName', e.target.value)} placeholder="Dr. Name" />
                  </Field>
                  <Field label="Diagnosis" icon={<FileText className="w-3.5 h-3.5" />}>
                    <Input value={data.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="Primary diagnosis" />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Prescription / Treatment Notes">
                      <Textarea value={data.doctorPrescription} onChange={e => set('doctorPrescription', e.target.value)}
                        rows={2} placeholder="Prescription details, treatment plan, medications..." />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Document checklist */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-gray-500" /> Document Checklist
                </h3>
                <div className="space-y-2">
                  <CheckItem
                    label="Bills / Invoices"
                    sublabel="Original hospital bill (auto-included from system)"
                    checked={data.hasBill}
                    onChange={v => set('hasBill', v)}
                    required
                  />
                  <CheckItem
                    label="ID Proof"
                    sublabel="Aadhaar / Passport / Driving Licence / Voter ID"
                    checked={data.hasIdProof}
                    onChange={v => set('hasIdProof', v)}
                    required
                  />
                  <CheckItem
                    label="Policy Card / Insurance Card"
                    sublabel="Physical or digital insurance membership card"
                    checked={data.hasPolicyCard}
                    onChange={v => set('hasPolicyCard', v)}
                    required
                  />
                  <CheckItem
                    label="Doctor Prescription"
                    sublabel="Required for medical claims — optional for non-medical"
                    checked={data.hasPrescription}
                    onChange={v => set('hasPrescription', v)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Verify Details ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-1">
                  <CheckCircle className="w-4 h-4" /> Verify Details
                </div>
                <p className="text-xs text-amber-600">Carefully review the collected information before checking each verification box.</p>
              </div>

              {/* Summary of entered data */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Collected Information Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Patient Name',    data.patientName     || '—'],
                    ['Phone',          data.patientPhone    || '—'],
                    ['Date of Birth',  data.dateOfBirth     || '—'],
                    ['Address',        data.patientAddress  || '—'],
                    ['Policy Number',  data.policyNumber    || '—'],
                    ['Insurance Card', data.insuranceCard   || '—'],
                    ['Insurance Co.',  data.insuranceName   || '—'],
                    ['Doctor',         data.doctorName      || '—'],
                    ['Diagnosis',      data.diagnosis       || '—'],
                    ['Bill Amount',    `$${amount.toLocaleString()}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-500 flex-shrink-0">{k}:</span>
                      <span className="text-gray-900 font-medium truncate">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 font-medium mb-1">Documents Attached:</p>
                  <div className="flex flex-wrap gap-2">
                    {data.hasBill         && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Bill</span>}
                    {data.hasIdProof      && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ ID Proof</span>}
                    {data.hasPolicyCard   && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Policy Card</span>}
                    {data.hasPrescription && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Prescription</span>}
                  </div>
                </div>
              </div>

              {/* Verification checklist */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Verification Checklist</h3>
                <div className="space-y-2">
                  <CheckItem
                    label="All information is correct"
                    sublabel="Patient name, phone, address, and date of birth match official documents"
                    checked={data.detailsVerified}
                    onChange={v => set('detailsVerified', v)}
                    required
                  />
                  <CheckItem
                    label="Policy is currently active"
                    sublabel="Confirmed that the insurance policy is valid and not expired"
                    checked={data.policyActive}
                    onChange={v => set('policyActive', v)}
                    required
                  />
                  <CheckItem
                    label="Coverage confirmed"
                    sublabel="Verified that this type of treatment / service is covered under the policy"
                    checked={data.coverageConfirmed}
                    onChange={v => set('coverageConfirmed', v)}
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Prepare Claim File ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-purple-700 font-semibold text-sm mb-1">
                  <ClipboardList className="w-4 h-4" /> Prepare Claim File
                </div>
                <p className="text-xs text-purple-600">Organize all documents into a proper claim file ready for insurance review.</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-blue-800">Claim File Preparation Steps:</p>
                <ol className="list-decimal list-inside text-xs text-blue-700 space-y-1.5">
                  <li>Arrange all physical/digital documents in order (Bill → ID → Policy Card → Prescription)</li>
                  <li>Fill in the insurance claim form completely with patient and billing details</li>
                  <li>Attach any supporting documents (lab reports, discharge summary, referral letters)</li>
                  <li>Double-check all signatures and dates are present</li>
                  <li>Keep copies of all submitted documents for records</li>
                </ol>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Preparation Checklist</h3>
                <div className="space-y-2">
                  <CheckItem
                    label="Claim form filled"
                    sublabel="Insurance claim form completed with all required fields — patient, policy, billing details"
                    checked={data.claimFormFilled}
                    onChange={v => set('claimFormFilled', v)}
                    required
                  />
                  <CheckItem
                    label="Documents arranged properly"
                    sublabel="All documents sorted and organized in correct sequence for submission"
                    checked={data.documentsArranged}
                    onChange={v => set('documentsArranged', v)}
                    required
                  />
                  <CheckItem
                    label="Supporting documents added"
                    sublabel="Lab reports, discharge summary, referral letters attached (if applicable)"
                    checked={data.supportingDocsAdded}
                    onChange={v => set('supportingDocsAdded', v)}
                  />
                </div>
              </div>

              <Field label="Additional Notes (optional)">
                <Textarea
                  value={data.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Any special instructions, pre-authorization codes, or notes for the insurance reviewer..."
                />
              </Field>
            </div>
          )}

          {/* ── STEP 3: Review & Submit ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-1">
                  <Shield className="w-4 h-4" /> Ready to Submit
                </div>
                <p className="text-xs text-green-600">Review the complete claim summary below. Click "Submit Claim" to send it to the insurance company for review.</p>
              </div>

              {/* Final summary */}
              <div className="space-y-3">

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Bill Information</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Bill #{bill.id.slice(-8)}</p>
                      {bill.items && bill.items.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {bill.items.map((item, i) => (
                            <p key={i} className="text-xs text-gray-500">
                              {item.description} ×{item.quantity} — ${item.total ?? (item.quantity * (item.unitPrice || 0))}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xl font-bold text-blue-600">${amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Patient Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Name: </span><span className="font-medium">{data.patientName}</span></div>
                    {data.patientPhone && <div><span className="text-gray-500">Phone: </span><span className="font-medium">{data.patientPhone}</span></div>}
                    {data.dateOfBirth  && <div><span className="text-gray-500">DOB: </span><span className="font-medium">{data.dateOfBirth}</span></div>}
                    {data.patientAddress && <div className="col-span-2"><span className="text-gray-500">Address: </span><span className="font-medium">{data.patientAddress}</span></div>}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Policy & Insurance</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Policy No.: </span><span className="font-medium">{data.policyNumber}</span></div>
                    {data.insuranceCard && <div><span className="text-gray-500">Card/Member ID: </span><span className="font-medium">{data.insuranceCard}</span></div>}
                    {data.insuranceName && <div className="col-span-2"><span className="text-gray-500">Company: </span><span className="font-medium">{data.insuranceName}</span></div>}
                  </div>
                </div>

                {(data.doctorName || data.diagnosis || data.doctorPrescription) && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Medical Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {data.doctorName   && <div><span className="text-gray-500">Doctor: </span><span className="font-medium">{data.doctorName}</span></div>}
                      {data.diagnosis    && <div><span className="text-gray-500">Diagnosis: </span><span className="font-medium">{data.diagnosis}</span></div>}
                      {data.doctorPrescription && (
                        <div className="col-span-2"><span className="text-gray-500">Prescription: </span><span className="font-medium">{data.doctorPrescription}</span></div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Document & Verification Checklist</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Bill attached',          data.hasBill],
                      ['ID Proof attached',       data.hasIdProof],
                      ['Policy Card attached',    data.hasPolicyCard],
                      ['Prescription attached',   data.hasPrescription],
                      ['Details verified',        data.detailsVerified],
                      ['Policy active',           data.policyActive],
                      ['Coverage confirmed',      data.coverageConfirmed],
                      ['Claim form filled',       data.claimFormFilled],
                      ['Documents arranged',      data.documentsArranged],
                      ['Supporting docs added',   data.supportingDocsAdded],
                    ].map(([label, val]) => (
                      <div key={label as string} className={`flex items-center gap-2 text-xs ${val ? 'text-green-700' : 'text-gray-400'}`}>
                        {val
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          : <AlertCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        }
                        {label as string}
                      </div>
                    ))}
                  </div>
                </div>

                {data.notes && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Notes:</p>
                    <p className="text-sm text-gray-700">{data.notes}</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</span>
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting
                ? <><Loader className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><Shield className="w-4 h-4" /> Submit Claim</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};