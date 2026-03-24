import React, { useState, useEffect } from 'react';
import { User, FileText, Pill, Save } from 'lucide-react';
import { api } from '../../utils/api';
import { Doctor, Appointment } from '../../types';

interface PatientTreatmentProps {
 user: Doctor;
 onBack: () => void;
}

export const PatientTreatment: React.FC<PatientTreatmentProps> = ({ user, onBack }) => {
 const [appointments, setAppointments] = useState<Appointment[]>([]);
 const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 const [treatmentData, setTreatmentData] = useState({
 diagnosis: '',
 prescription: '',
 notes: '',
 followUpAdvice: '',
 treatmentStatus: 'under_treatment' as 'under_treatment' | 'completed' | 'discharged',
 });

 useEffect(() => {
 loadAppointments();
 }, [user.id]);

 const loadAppointments = async () => {
 try {
 const appointmentsData = await api.doctors.getAppointments(user.id, user.role);
 // Filter for confirmed appointments that need treatment
 const treatmentAppointments = appointmentsData.filter(a => 
 a.status === 'confirmed' || a.status === 'completed'
 );
 setAppointments(treatmentAppointments);
 } catch (error) {
 console.error('Error loading appointments:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleAppointmentSelect = (appointment: Appointment) => {
 setSelectedAppointment(appointment);
 setTreatmentData({
 diagnosis: appointment.diagnosis || '',
 prescription: appointment.prescription || '',
 notes: '',
 followUpAdvice: '',
 treatmentStatus: 'under_treatment',
 });
 };

 const handleSaveTreatment = async () => {
 if (!selectedAppointment) return;

 setSaving(true);
 try {
 // Update appointment with treatment data
 await api.doctors.updateAppointment(selectedAppointment.id, {
 diagnosis: treatmentData.diagnosis,
 prescription: treatmentData.prescription,
 status: 'completed',
 }, user.id, user.role);

 // Add medical record
 await api.doctors.addMedicalRecord({
 patientId: selectedAppointment.patientId,
 doctorId: user.id,
 appointmentId: selectedAppointment.id,
 diagnosis: treatmentData.diagnosis,
 prescription: treatmentData.prescription,
 notes: treatmentData.notes,
 attachments: [],
 }, user.role);

 await loadAppointments();
 setSelectedAppointment(null);
 alert('Treatment data saved successfully!');
 } catch (error) {
 console.error('Error saving treatment:', error);
 alert('Error saving treatment data');
 } finally {
 setSaving(false);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading patient appointments...</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Patient Treatment</h1>
 <button
 onClick={onBack}
 className="text-green-600 hover:text-green-600 font-medium"
 >
 Back to Dashboard
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Patient List */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Patients for Treatment</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {appointments.length === 0 ? (
 <div className="text-center py-8">
 <User className="w-12 h-12 text-gray-500 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-gray-900 mb-2">No Patients</h3>
 <p className="text-gray-500">No patients scheduled for treatment.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {appointments.map((appointment) => (
 <div
 key={appointment.id}
 className={`p-3 rounded-lg cursor-pointer transition-colors ${
 selectedAppointment?.id === appointment.id
 ? 'bg-green-50 border-2 border-green-500'
 : 'bg-gray-50 hover:bg-gray-100'
 }`}
 onClick={() => handleAppointmentSelect(appointment)}
 >
 <div className="flex items-center space-x-3">
 <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
 <User className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <h3 className="font-medium text-gray-900">Patient {appointment.patientId}</h3>
 <p className="text-sm text-gray-500">{appointment.reason}</p>
 <p className="text-xs text-gray-500">
 {new Date(appointment.dateTime).toLocaleDateString()}
 </p>
 </div>
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 appointment.status === 'completed' ? 'bg-green-100 text-emerald-300' :
 'bg-blue-100 text-blue-300'
 }`}>
 {appointment.status}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Treatment Form */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Treatment Entry</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {selectedAppointment ? (
 <div className="space-y-4">
 <div className="bg-blue-50 p-4 rounded-lg">
 <h3 className="font-medium text-gray-900">Patient Information</h3>
 <p className="text-sm text-gray-500">ID: {selectedAppointment.patientId}</p>
 <p className="text-sm text-gray-500">Reason: {selectedAppointment.reason}</p>
 <p className="text-sm text-gray-500">
 Date: {new Date(selectedAppointment.dateTime).toLocaleDateString()}
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 <FileText className="w-4 h-4 inline mr-1" />
 Diagnosis
 </label>
 <textarea
 value={treatmentData.diagnosis}
 onChange={(e) => setTreatmentData({ ...treatmentData, diagnosis: e.target.value })}
 rows={3}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
 placeholder="Enter diagnosis..."
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 <Pill className="w-4 h-4 inline mr-1" />
 Prescription
 </label>
 <textarea
 value={treatmentData.prescription}
 onChange={(e) => setTreatmentData({ ...treatmentData, prescription: e.target.value })}
 rows={3}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
 placeholder="Enter prescription details..."
 required
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Treatment Notes
 </label>
 <textarea
 value={treatmentData.notes}
 onChange={(e) => setTreatmentData({ ...treatmentData, notes: e.target.value })}
 rows={3}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
 placeholder="Additional notes for hospital and insurance..."
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Follow-up Advice
 </label>
 <textarea
 value={treatmentData.followUpAdvice}
 onChange={(e) => setTreatmentData({ ...treatmentData, followUpAdvice: e.target.value })}
 rows={2}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
 placeholder="Follow-up instructions for patient..."
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Treatment Status
 </label>
 <select
 value={treatmentData.treatmentStatus}
 onChange={(e) => setTreatmentData({ 
 ...treatmentData, 
 treatmentStatus: e.target.value as any 
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
 >
 <option value="under_treatment">Under Treatment</option>
 <option value="completed">Treatment Completed</option>
 <option value="discharged">Discharged</option>
 </select>
 </div>

 <div className="pt-4">
 <button
 onClick={handleSaveTreatment}
 disabled={saving || !treatmentData.diagnosis || !treatmentData.prescription}
 className="w-full bg-green-600 text-gray-900 py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
 >
 <Save className="w-4 h-4" />
 <span>{saving ? 'Saving...' : 'Save Treatment Data'}</span>
 </button>
 </div>
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 Select a patient to enter treatment data
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
};