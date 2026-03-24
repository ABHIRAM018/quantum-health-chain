import React, { useState, useEffect } from 'react';
import { Pill, Plus, Trash2, RefreshCw, User, Clock } from 'lucide-react';
import { Prescription, PrescriptionMedicine, Doctor } from '../../types';
import { api } from '../../utils/api';
import { addNotification } from '../Shared/NotificationCenter';

interface PrescriptionManagementProps {
  user: Doctor;
  onBack: () => void;
  initialAppointmentId?: string | null;
}

const statusColor = (s: Prescription['status']) => ({
  active:    'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100  text-gray-500  border-gray-200',
  cancelled: 'bg-red-100   text-red-600   border-red-200',
}[s]);

export const PrescriptionManagement: React.FC<PrescriptionManagementProps> = ({ user, onBack, initialAppointmentId }) => {
  const [rxList,      setRxList]      = useState<Prescription[]>([]);
  const [patients,    setPatients]    = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [showForm,    setShowForm]    = useState(false);
  const [selectedRx,  setSelectedRx]  = useState<Prescription | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const [form, setForm] = useState({
    patientId: '',
    appointmentId: '',
    notes: '',
    refillsAllowed: 1,
    medicines: [{ id: 'm1', medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }] as PrescriptionMedicine[],
  });

  // Load prescriptions and patients from DB
  useEffect(() => {
    loadData();
  }, [user.id]);

  useEffect(() => {
    if (initialAppointmentId) {
      handleInitialAppointment();
    }
  }, [initialAppointmentId, appointments]);

  const handleInitialAppointment = () => {
    const appt = appointments.find(a => a.id === initialAppointmentId);
    if (appt) {
      setForm(f => ({
        ...f,
        patientId: appt.patientId,
        appointmentId: appt.id,
      }));
      setShowForm(true);
    }
  };

  const loadData = async () => {
    try {
      // Load prescriptions from DB
      const rxData = await api.doctors.getPrescriptions(user.id, user.role);
      setRxList(rxData as Prescription[]);

      // Load real patients from DB
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/users/role/patient', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setPatients(await res.json());

      // Load appointments to link
      const appts = await api.doctors.getAppointments(user.id, user.role);
      setAppointments(appts);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  const addMedicine = () => {
    setForm(f => ({
      ...f,
      medicines: [...f.medicines, { id: `m${Date.now()}`, medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    }));
  };

  const removeMedicine = (id: string) => {
    setForm(f => ({ ...f, medicines: f.medicines.filter(m => m.id !== id) }));
  };

  const updateMedicine = (id: string, field: keyof PrescriptionMedicine, value: string) => {
    setForm(f => ({ ...f, medicines: f.medicines.map(m => m.id === id ? { ...m, [field]: value } : m) }));
  };

  const handleCreate = async () => {
    if (!form.patientId) { setError('Please select a patient'); return; }
    if (form.medicines.some(m => !m.medicineName)) { setError('Fill in all medicine names'); return; }
    setError('');
    setSaving(true);
    try {
      // Save to PostgreSQL via API
      await api.doctors.createPrescription({
        patientId:      form.patientId,
        doctorId:       user.id,
        appointmentId:  form.appointmentId || undefined,
        medicines:      form.medicines,
        notes:          form.notes,
        refillsAllowed: form.refillsAllowed,
      }, user.role);

      // Notify patient
      addNotification({
        userId: form.patientId,
        title:  'New Prescription Issued',
        message: `Dr. ${user.name} has issued a prescription with ${form.medicines.length} medicine(s). Check your Medical Records.`,
        type: 'prescription',
      });

      // Reload from DB to show persisted data
      await loadData();
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      setError(e.message || 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      patientId: '', appointmentId: '', notes: '', refillsAllowed: 1,
      medicines: [{ id: 'm1', medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    });
  };

  const updateStatus = async (id: string, status: Prescription['status']) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/prescriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status }),
      });
      setRxList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      console.error('Failed to update status:', e);
      // Update locally as fallback
      setRxList(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const getPatientName = (patientId: string) => {
    const p = patients.find(p => p.id === patientId);
    return p?.name || patientId;
  };

  return (
    <div className="min-h-full bg-gray-50 p-6">
      <button onClick={onBack} className="text-gray-500 hover:text-gray-700 text-sm mb-4">← Back</button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Pill className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-gray-500 text-sm">{rxList.length} prescription(s) issued</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Prescription
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-4 shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-lg text-gray-900">Issue New Prescription</h3>
              <p className="text-gray-500 text-sm mt-1">Saved directly to PostgreSQL database</p>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-600 text-xs font-medium mb-1 block">Patient *</label>
                  <select value={form.patientId}
                    disabled={!!initialAppointmentId}
                    onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <option value="">Select patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-600 text-xs font-medium mb-1 block">Appointment</label>
                  <select value={form.appointmentId}
                    disabled={!!initialAppointmentId}
                    onChange={e => {
                      const appt = appointments.find(a => a.id === e.target.value);
                      setForm(f => ({ ...f, appointmentId: e.target.value, patientId: appt?.patientId || f.patientId }));
                    }}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                    <option value="">None / Select appointment...</option>
                    {appointments.map(a => (
                      <option key={a.id} value={a.id}>
                        {new Date(a.dateTime).toLocaleDateString()} - {a.reason}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-600 text-xs font-medium mb-1 block">Refills Allowed</label>
                  <input type="number" min={0} max={12} value={form.refillsAllowed}
                    onChange={e => setForm(f => ({ ...f, refillsAllowed: +e.target.value }))}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              {/* Medicines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-600 text-xs font-medium">Medicines *</label>
                  <button onClick={addMedicine} className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Medicine
                  </button>
                </div>
                <div className="space-y-3">
                  {form.medicines.map((m, i) => (
                    <div key={m.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-500 text-xs font-medium">Medicine #{i + 1}</span>
                        {form.medicines.length > 1 && (
                          <button onClick={() => removeMedicine(m.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { field: 'medicineName', label: 'Medicine Name', placeholder: 'e.g. Metoprolol' },
                          { field: 'dosage',       label: 'Dosage',        placeholder: 'e.g. 25mg' },
                          { field: 'frequency',    label: 'Frequency',     placeholder: 'e.g. Twice daily' },
                          { field: 'duration',     label: 'Duration',      placeholder: 'e.g. 30 days' },
                        ].map(({ field, label, placeholder }) => (
                          <div key={field}>
                            <label className="text-gray-500 text-xs mb-1 block">{label}</label>
                            <input value={(m as any)[field]}
                              onChange={e => updateMedicine(m.id, field as any, e.target.value)}
                              placeholder={placeholder}
                              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                          </div>
                        ))}
                        <div className="col-span-2">
                          <label className="text-gray-500 text-xs mb-1 block">Instructions</label>
                          <input value={m.instructions}
                            onChange={e => updateMedicine(m.id, 'instructions', e.target.value)}
                            placeholder="e.g. Take with food, avoid alcohol"
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-600 text-xs font-medium mb-1 block">Doctor's Notes</label>
                <textarea value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional instructions, follow-up advice..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-20" />
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => { setShowForm(false); resetForm(); setError(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : 'Issue Prescription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRx && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Prescription Details</h3>
              <button onClick={() => setSelectedRx(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(selectedRx.status)}`}>
                  {selectedRx.status.toUpperCase()}
                </span>
                <span className="text-gray-500 text-xs">{new Date(selectedRx.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Patient</p>
                <p className="text-sm font-medium text-gray-900">{getPatientName(selectedRx.patientId)}</p>
              </div>
              <div className="space-y-2">
                {selectedRx.medicines?.map((m, i) => (
                  <div key={m.id || i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-gray-900 text-sm font-medium">{m.medicineName}</span>
                      <span className="text-gray-500 text-xs">{m.dosage}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{m.frequency} · {m.duration} · {m.instructions}</p>
                  </div>
                ))}
              </div>
              {selectedRx.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs font-medium mb-1">Doctor's Notes</p>
                  <p className="text-gray-700 text-sm">{selectedRx.notes}</p>
                </div>
              )}
              <div className="text-xs text-gray-500">
                Refills: {selectedRx.refillsUsed}/{selectedRx.refillsAllowed} used
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {rxList.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Pill className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No prescriptions issued yet.</p>
          </div>
        )}
        {rxList.map(rx => (
          <div key={rx.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-gray-300 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-900 font-medium text-sm">{getPatientName(rx.patientId)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(rx.status)}`}>{rx.status}</span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                {rx.medicines?.map(m => m.medicineName).filter(Boolean).join(', ') || 'No medicines listed'}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-400 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />{new Date(rx.createdAt).toLocaleDateString()}
                </span>
                <span className="text-gray-400 text-xs">Refills: {rx.refillsUsed}/{rx.refillsAllowed}</span>
                {rx.appointmentId && (
                  <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100 text-[10px]">
                    Linked Appt: {rx.appointmentId.substring(0, 8)}...
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setSelectedRx(rx)}
                className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">
                View
              </button>
              {rx.status === 'active' && (
                <button onClick={() => updateStatus(rx.id, 'completed')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:border-emerald-400 px-3 py-1.5 rounded-lg transition-colors">
                  Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};