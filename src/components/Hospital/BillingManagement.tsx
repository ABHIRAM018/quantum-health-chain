import React, { useState, useEffect } from 'react';
import {
  Plus, CreditCard, Send, FileText, DollarSign,
  Search, Filter, CheckCircle, User, Stethoscope, X, Calendar
} from 'lucide-react';
import { api } from '../../utils/api';
import { addNotification } from '../Shared/NotificationCenter';
import { Hospital, Bill, BillItem } from '../../types';
import { ClaimWizard, ClaimDocumentData } from '../Patient/ClaimWizard';

interface BillingManagementProps {
  user: Hospital;
}

function getEffectiveStatus(status: string): { label: string; color: string; description: string } {
  switch (status) {
    case 'pending':   return { label: 'Pending',          color: 'bg-yellow-100 text-yellow-700',  description: 'Awaiting insurance submission' };
    case 'submitted': return { label: 'Sent to Insurance', color: 'bg-blue-100   text-blue-700',   description: 'Claim submitted to insurance' };
    case 'approved':  return { label: 'Claim Approved',   color: 'bg-green-100  text-green-700',   description: 'Insurance approved — awaiting payment' };
    case 'paid':      return { label: 'Paid',             color: 'bg-emerald-100 text-emerald-700', description: 'Fully settled' };
    default:          return { label: status,             color: 'bg-gray-100   text-gray-600',    description: '' };
  }
}


export const BillingManagement: React.FC<BillingManagementProps> = ({ user }) => {
  const [bills, setBills]               = useState<Bill[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formError, setFormError]       = useState('');

  // Wizard state — stores the bill that is being forwarded
  const [wizardBill, setWizardBill] = useState<Bill | null>(null);
  // Patient info cache keyed by patientId
  const [patientCache, setPatientCache] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    appointmentId: '',
    patientId: '',
    patientName: '',
    doctorId: '',
    doctorName: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }] as Omit<BillItem, 'id' | 'total'>[],
  });

  useEffect(() => { loadAll(); }, [user.id]);

  const loadAll = async () => {
    try {
      const [billsData, apptData, doctorsData] = await Promise.all([
        api.hospitals.getBills(user.id, user.role),
        api.hospitals.getAppointments(user.id, user.role).catch(() => []),
        api.hospitals.getDoctors(user.id, user.role).catch(() => []),
      ]);
      setBills(billsData);
      setAppointments(apptData);
      setDoctors(doctorsData);
    } catch (err) {
      console.error('loadAll error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentChange = (apptId: string) => {
    if (!apptId) {
      setFormData(f => ({ ...f, appointmentId: '', patientId: '', patientName: '', doctorId: '', doctorName: '' }));
      return;
    }
    const appt = appointments.find((a: any) => a.id === apptId);
    if (!appt) return;

    const doctor = doctors.find((d: any) => d.id === (appt.doctorId || appt.doctor_id));
    const patientId = appt.patientId || appt.patient_id;

    setFormData(f => ({
      ...f,
      appointmentId: apptId,
      patientId,
      patientName: appt.patientName || patientId,
      doctorId:    doctor?.id || appt.doctorId || appt.doctor_id || '',
      doctorName:  doctor?.name || '',
    }));

    if (patientId) {
      const token = localStorage.getItem('auth_token');
      fetch(`/api/users/role/patient`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then(r => r.json())
        .then(patients => {
          const p = patients.find((p: any) => p.id === patientId);
          if (p) {
            setFormData(f => ({ ...f, patientName: p.name }));
            setPatientCache(c => ({ ...c, [patientId]: p }));
          }
        }).catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.appointmentId) { setFormError('Please select an appointment'); return; }
    if (!formData.patientId)     { setFormError('No patient linked to this appointment'); return; }

    const validItems = formData.items.filter(i => i.description && i.unitPrice > 0);
    if (validItems.length === 0) { setFormError('Add at least one bill item with a price'); return; }

    setLoading(true);
    try {
      const billItems = validItems.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        ...item,
        total: item.quantity * item.unitPrice,
      }));
      const totalAmount = billItems.reduce((sum, item) => sum + item.total, 0);

      await api.hospitals.createBill({
        patientId:     formData.patientId,
        hospitalId:    user.id,
        doctorId:      formData.doctorId || undefined,
        appointmentId: formData.appointmentId,
        amount:        totalAmount,
        items:         billItems,
      } as any, user.role);

      if (formData.patientId) {
        addNotification({
          userId:  formData.patientId,
          type:    'bill',
          title:   'New Bill Generated',
          message: `A bill of $${totalAmount.toFixed(2)} has been created for your appointment.`,
        });
      }

      await loadAll();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  // Open wizard before forwarding
  const handleForwardClick = (bill: Bill) => {
    // Pre-load patient if not cached
    const patientId = (bill as any).patientId || (bill as any).patient_id;
    if (patientId && !patientCache[patientId]) {
      const token = localStorage.getItem('auth_token');
      fetch('/api/users/role/patient', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        .then(r => r.json())
        .then(patients => {
          const p = patients.find((pt: any) => pt.id === patientId);
          if (p) setPatientCache(c => ({ ...c, [patientId]: p }));
        }).catch(() => {});
    }
    setWizardBill(bill);
  };

  // Wizard submission — saves docs, then forwards the bill to insurance
  const handleWizardSubmit = async (wizardData: ClaimDocumentData) => {
    const bill = wizardBill!;
    const token = localStorage.getItem('auth_token');

    // 1. Forward the bill → creates insurance_claim in DB
    const result = await api.hospitals.forwardClaim(bill.id, user.id, user.role);

    // 2. Find the created claim ID from the response
    const claimId = (result as any)?.claim?.id || (result as any)?.claimId;

    // 3. Save document details
    if (claimId) {
      await fetch('/api/claim-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          claimId,
          billId:             bill.id,
          patientId:          (bill as any).patientId || (bill as any).patient_id,
          submittedByRole:    'hospital',
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

    // 4. Notify doctor
    const doctorId = (bill as any).doctor_id || (bill as any).doctorId;
    if (doctorId) {
      addNotification({
        userId: doctorId, type: 'claim',
        title: 'Insurance Claim Forwarded',
        message: `Claim for patient ($${Number(bill.amount).toFixed(2)}) forwarded to insurance with full documentation.`,
      });
    }

    await loadAll();
    setWizardBill(null);
  };

  const handleMarkPaid = async (bill: Bill) => {
    try {
      await api.hospitals.markBillPaid(bill.id, user.role);
      await loadAll();
      const doctorId = (bill as any).doctor_id || (bill as any).doctorId;
      if (doctorId) {
        addNotification({
          userId: doctorId, type: 'payment',
          title: 'Payment Completed',
          message: `Payment of $${Number(bill.amount).toFixed(2)} has been completed.`,
        });
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ appointmentId: '', patientId: '', patientName: '', doctorId: '', doctorName: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }] });
    setFormError('');
    setShowCreateForm(false);
  };

  const addBillItem = () =>
    setFormData(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unitPrice: 0 }] }));

  const updateBillItem = (index: number, field: string, value: any) =>
    setFormData(f => ({ ...f, items: f.items.map((item, i) => i === index ? { ...item, [field]: value } : item) }));

  const removeBillItem = (index: number) => {
    if (formData.items.length > 1)
      setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const billedAppointmentIds = new Set(bills.map((b: any) => b.appointmentId || b.appointment_id).filter(Boolean));
  const unbilledAppointments = appointments.filter((a: any) => {
    const id = a.id;
    return !billedAppointmentIds.has(id) &&
      (a.status === 'completed' || a.status === 'confirmed' || a.status === 'pending');
  });

  const filteredBills = bills.filter(bill => {
    const matchSearch = bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.patientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || bill.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalAmount  = bills.reduce((s, b) => s + Number(b.amount), 0);
  const pendingBills = bills.filter(b => b.status === 'pending');
  const approvedBills = bills.filter(b => b.status === 'approved');

  if (loading && bills.length === 0) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Loading billing data...</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
          <p className="text-gray-500 text-sm">Bills are created from completed appointments</p>
        </div>
        <button onClick={() => setShowCreateForm(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" /><span>Create Bill</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bills',   value: bills.length,          color: 'text-purple-600', icon: <FileText className="w-7 h-7 text-purple-600" /> },
          { label: 'Pending',       value: pendingBills.length,   color: 'text-yellow-600', icon: <CreditCard className="w-7 h-7 text-yellow-600" /> },
          { label: 'Approved',      value: approvedBills.length,  color: 'text-green-600',  icon: <CheckCircle className="w-7 h-7 text-green-600" /> },
          { label: 'Total Amount',  value: `$${totalAmount.toLocaleString()}`, color: 'text-purple-600', icon: <DollarSign className="w-7 h-7 text-purple-600" /> },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 flex items-center justify-between">
            <div><p className="text-sm text-gray-500">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div>
            {s.icon}
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search bills..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Create Bill Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Create Bill from Appointment</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          {formError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{formError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Select Appointment *
              </label>
              <select value={formData.appointmentId}
                onChange={e => handleAppointmentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                required>
                <option value="">— Select an appointment —</option>
                {unbilledAppointments.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.dateTime || a.date_time).toLocaleDateString()} —{' '}
                    {a.reason} — Patient: {a.patientId || a.patient_id} [{a.status}]
                  </option>
                ))}
              </select>
              {unbilledAppointments.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No unbilled appointments found.</p>
              )}
            </div>

            {formData.patientId && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Patient</p>
                  <p className="text-sm font-medium text-gray-900">{formData.patientName || formData.patientId}</p>
                </div>
                {formData.doctorName && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Doctor</p>
                    <p className="text-sm font-medium text-gray-900">{formData.doctorName}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-600">Bill Items</label>
                <button type="button" onClick={addBillItem}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                  + Add Item
                </button>
              </div>
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg items-center">
                    <input type="text" placeholder="Description (e.g. Consultation)"
                      value={item.description}
                      onChange={e => updateBillItem(index, 'description', e.target.value)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <input type="number" placeholder="Price" value={item.unitPrice || ''}
                      onChange={e => updateBillItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0" step="0.01"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                      {formData.items.length > 1 && (
                        <button type="button" onClick={() => removeBillItem(index)}
                          className="text-red-500 hover:text-red-700 text-sm ml-2">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right">
                <span className="text-lg font-bold text-purple-600">
                  Total: ${formData.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Bill'}
              </button>
              <button type="button" onClick={resetForm}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Bills List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bills ({filteredBills.length})</h2>
        </div>
        <div className="p-5 space-y-4">
          {filteredBills.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No bills found</p>
            </div>
          ) : filteredBills.map(bill => {
            const appt = appointments.find((a: any) => a.id === ((bill as any).appointmentId || (bill as any).appointment_id));
            const doctor = doctors.find((d: any) => d.id === ((bill as any).doctorId || (bill as any).doctor_id));
            return (
              <div key={bill.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Bill #{bill.id.slice(-8)}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                        <User className="w-3 h-3" />
                        <span>Patient: {(bill as any).patientId || (bill as any).patient_id}</span>
                      </div>
                      {doctor && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Stethoscope className="w-3 h-3" />
                          <span>Dr. {doctor.name}</span>
                        </div>
                      )}
                      {appt && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(appt.dateTime || appt.date_time).toLocaleDateString()} — {appt.reason}</span>
                        </div>
                      )}
                      <p className="text-lg font-bold text-purple-600 mt-1">${Number(bill.amount).toLocaleString()}</p>
                      {bill.items?.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {bill.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-xs text-gray-500">
                              <span>{item.description} ×{item.quantity}</span>
                              <span>${item.total || (item.quantity * item.unitPrice)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {(() => {
                      const eff = getEffectiveStatus(bill.status as string);
                      return (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${eff.color}`}>
                          {eff.label}
                        </span>
                      );
                    })()}

                    {/* Forward to Insurance — opens wizard */}
                    {bill.status === 'pending' && (
                      <button
                        onClick={() => handleForwardClick(bill)}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Forward to Insurance
                      </button>
                    )}

                    {bill.status === 'approved' && (
                      <button onClick={() => handleMarkPaid(bill)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Mark Paid
                      </button>
                    )}
                    {(bill.status as string) === 'submitted' && (
                      <span className="text-xs text-blue-600 flex items-center gap-1">
                        <Send className="w-3 h-3" /> Awaiting insurance
                      </span>
                    )}
                    {bill.status === 'paid' && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Claim Wizard Modal ── */}
      {wizardBill && (() => {
        const patientId = (wizardBill as any).patientId || (wizardBill as any).patient_id;
        const patient   = patientCache[patientId];
        const doctor    = doctors.find((d: any) => d.id === ((wizardBill as any).doctorId || (wizardBill as any).doctor_id));
        return (
          <ClaimWizard
            bill={wizardBill}
            mode="hospital"
            patientInfo={{
              name:    patient?.name,
              phone:   patient?.phone,
              address: patient?.address,
            }}
            onClose={() => setWizardBill(null)}
            onSubmit={handleWizardSubmit}
          />
        );
      })()}
    </div>
  );
};