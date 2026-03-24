import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Pill } from 'lucide-react';
import { api } from '../../utils/api';
import { Doctor, Appointment } from '../../types';

interface AppointmentManagementProps {
 user: Doctor;
 onBack: () => void;
 onCreatePrescription?: (appointmentId: string) => void;
}

export const AppointmentManagement: React.FC<AppointmentManagementProps> = ({ user, onBack, onCreatePrescription }) => {
 const [appointments, setAppointments] = useState<Appointment[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('all');

 useEffect(() => {
 loadAppointments();
 }, [user.id]);

 const loadAppointments = async () => {
 try {
 const appointmentsData = await api.doctors.getAppointments(user.id, user.role);
 setAppointments(appointmentsData);
 } catch (error) {
 console.error('Error loading appointments:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleStatusUpdate = async (appointmentId: string, status: Appointment['status']) => {
 try {
 await api.doctors.updateAppointmentStatus(appointmentId, status, user.id, user.role);
 await loadAppointments();
 } catch (error) {
 console.error('Error updating appointment:', error);
 }
 };

 const filteredAppointments = appointments.filter(appointment => {
 if (filter === 'all') return true;
 return appointment.status === filter;
 });

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading appointments...</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
 <button
 onClick={onBack}
 className="text-green-600 hover:text-green-600 font-medium"
 >
 Back to Dashboard
 </button>
 </div>

 {/* Filter Tabs */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8 px-6">
 {[
 { id: 'all', label: 'All Appointments' },
 { id: 'pending', label: 'Pending' },
 { id: 'confirmed', label: 'Confirmed' },
 { id: 'completed', label: 'Completed' },
 { id: 'cancelled', label: 'Cancelled' },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setFilter(tab.id)}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 filter === tab.id
 ? 'border-green-500 text-green-600'
 : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </nav>
 </div>

 <div className="p-6 bg-gray-50 min-h-full">
 {filteredAppointments.length === 0 ? (
 <div className="text-center py-8">
 <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments</h3>
 <p className="text-gray-500">No appointments found for the selected filter.</p>
 </div>
 ) : (
 <div className="space-y-4">
 {filteredAppointments.map((appointment) => (
 <div key={appointment.id} className="bg-gray-50 rounded-lg p-4">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3">
 <div className={`p-2 rounded-full ${
 appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
 appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
 appointment.status === 'completed' ? 'bg-green-100 text-green-600' :
 'bg-red-100 text-red-600'
 }`}>
 <Calendar className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <h3 className="font-medium text-gray-900">{appointment.reason}</h3>
 <p className="text-sm text-gray-500">Patient: {appointment.patientId}</p>
 <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
 <div className="flex items-center space-x-1">
 <Calendar className="w-4 h-4" />
 <span>{new Date(appointment.dateTime).toLocaleDateString()}</span>
 </div>
 <div className="flex items-center space-x-1">
 <Clock className="w-4 h-4" />
 <span>{new Date(appointment.dateTime).toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 })}</span>
 </div>
 </div>
 
 {appointment.diagnosis && (
 <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-gray-700">
 <p><strong>Diagnosis:</strong> {appointment.diagnosis}</p>
 {appointment.prescription && (
 <p><strong>Prescription:</strong> {appointment.prescription}</p>
 )}
 </div>
 )}
 </div>
 </div>
 
 <div className="flex flex-col items-end space-y-2">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 appointment.status === 'pending' ? 'bg-yellow-100 text-amber-300' :
 appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-300' :
 appointment.status === 'completed' ? 'bg-green-100 text-emerald-300' :
 'bg-red-100 text-red-300'
 }`}>
 {appointment.status}
 </span>
 
 <div className="flex space-x-2">
 {appointment.status === 'pending' && (
 <>
 <button
 onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
 className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 flex items-center space-x-1"
 >
 <CheckCircle className="w-3 h-3" />
 <span>Accept</span>
 </button>
 <button
 onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
 className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 flex items-center space-x-1"
 >
 <XCircle className="w-3 h-3" />
 <span>Decline</span>
 </button>
 </>
 )}
 
 {appointment.status === 'confirmed' && (
 <div className="flex space-x-2">
 <button
 onClick={() => handleStatusUpdate(appointment.id, 'completed')}
 className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 flex items-center space-x-1"
 >
 <CheckCircle className="w-3 h-3" />
 <span>Complete</span>
 </button>
 {onCreatePrescription && (
 <button
 onClick={() => onCreatePrescription(appointment.id)}
 className="bg-emerald-600 text-white px-3 py-1 rounded text-xs hover:bg-emerald-700 flex items-center space-x-1"
 >
 <Pill className="w-3 h-3" />
 <span>Prescribe</span>
 </button>
 )}
 </div>
 )}
 
 {appointment.status === 'completed' && onCreatePrescription && (
 <button
 onClick={() => onCreatePrescription(appointment.id)}
 className="bg-emerald-600 text-white px-3 py-1 rounded text-xs hover:bg-emerald-700 flex items-center space-x-1"
 >
 <Pill className="w-3 h-3" />
 <span>Prescribe</span>
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
};
