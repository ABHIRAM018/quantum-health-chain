import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Building2, Stethoscope, Send } from 'lucide-react';
import { api } from '../../utils/api';
import { Patient } from '../../types';

interface AppointmentBookingProps {
  user: Patient;
  onBack: () => void;
}

export const AppointmentBooking: React.FC<AppointmentBookingProps> = ({ user, onBack }) => {
  const [hospitals, setHospitals]           = useState<any[]>([]);
  const [doctors, setDoctors]               = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate]     = useState('');
  const [selectedTime, setSelectedTime]     = useState('');
  const [reason, setReason]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [success, setSuccess]               = useState(false);
  const [error, setError]                   = useState('');

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  ];

  const authHeader = (): Record<string, string> => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load hospitals on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/users/role/hospital', { headers: authHeader() });
        if (res.ok) {
          const data = await res.json();
          setHospitals(data);
          // Auto-select first hospital
          if (data.length > 0) {
            setSelectedHospital(data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load hospitals', e);
      }
    };
    load();
  }, []);

  // Load doctors whenever selectedHospital changes
  useEffect(() => {
    if (!selectedHospital) { setDoctors([]); return; }
    const load = async () => {
      try {
        const res = await fetch('/api/users/role/doctor', { headers: authHeader() });
        if (res.ok) {
          const all = await res.json();
          // Filter by hospital_id — also show all if none match (safety net)
          const filtered = all.filter((d: any) =>
            (d.hospital_id || d.hospitalId) === selectedHospital
          );
          setDoctors(filtered.length > 0 ? filtered : all);
        }
      } catch (e) {
        console.error('Failed to load doctors', e);
      }
    };
    load();
  }, [selectedHospital]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) { setError('Please select a doctor'); return; }
    if (!selectedDate)   { setError('Please select a date'); return; }
    if (!selectedTime)   { setError('Please select a time'); return; }

    setLoading(true);
    setError('');
    try {
      const dateTime = new Date(`${selectedDate}T${selectedTime}`);
      await api.patients.bookAppointment({
        patientId: user.id,
        doctorId: selectedDoctor,
        hospitalId: selectedHospital,
        dateTime,
        reason,
      }, user.role);

      // Notify doctor
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          userId: selectedDoctor,
          title: 'New Appointment Request',
          message: `${user.name} requested an appointment: ${reason}`,
          type: 'appointment',
        }),
      }).catch(() => {});

      setSuccess(true);
      setTimeout(() => onBack(), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Request Sent!</h2>
        <p className="text-gray-500">Your request has been sent to the doctor for approval.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
        <button onClick={onBack} className="text-blue-600 font-medium">Back to Dashboard</button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

        {/* Hospital */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            <Building2 className="w-4 h-4 inline mr-2" />Select Hospital
          </label>
          <select
            value={selectedHospital}
            onChange={e => { setSelectedHospital(e.target.value); setSelectedDoctor(''); }}
            className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Choose a hospital</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>
                {h.name}{h.address ? ` - ${h.address}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Doctor */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            <Stethoscope className="w-4 h-4 inline mr-2" />Select Doctor
            {doctors.length === 0 && selectedHospital && (
              <span className="text-amber-500 text-xs ml-2">Loading doctors...</span>
            )}
          </label>
          <select
            value={selectedDoctor}
            onChange={e => setSelectedDoctor(e.target.value)}
            className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Choose a doctor ({doctors.length} available)</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.specialization ?? 'General'}
                {(d.consultation_fee || d.consultationFee)
                  ? ` ($${d.consultation_fee ?? d.consultationFee})`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            <Calendar className="w-4 h-4 inline mr-2" />Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">
            <Clock className="w-4 h-4 inline mr-2" />Select Time
          </label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {timeSlots.map(time => (
              <button
                key={time}
                type="button"
                onClick={() => setSelectedTime(time)}
                className={`p-2 text-sm rounded-lg border transition-colors ${
                  selectedTime === time
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-500'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Reason for Visit</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your symptoms or reason for the appointment..."
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {loading ? <span>Booking...</span> : <><Send className="w-4 h-4" /><span>Send Appointment Request</span></>}
        </button>
      </form>
    </div>
  );
};