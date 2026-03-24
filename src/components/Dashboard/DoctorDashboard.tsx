import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react'; 
import { api } from '../../utils/api';
import { Doctor, Appointment } from '../../types';

interface DoctorDashboardProps {
 user: Doctor;
 onPageChange: (page: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user, onPageChange }) => {
 const [appointments, setAppointments] = useState<Appointment[]>([]);
 const [loading, setLoading] = useState(true);

 const loadData = async () => {
 try {
 const appointmentsData = await api.doctors.getAppointments(user.id, user.role);
 setAppointments(appointmentsData);
 } catch (error) {
 console.error('Error loading doctor data:', error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, [user.id, user.role]);

 const handleStatusUpdate = async (appointmentId: string, status: Appointment['status']) => {
 try {
 await api.doctors.updateAppointmentStatus(appointmentId, status, user.id, user.role);
 await loadData();
 } catch (error) {
 console.error('Error updating appointment:', error);
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading dashboard...</div>
 </div>
 );
 }

 const todaysAppointments = appointments.filter(a =>
   new Date(a.dateTime ?? (a as any).date_time).toDateString() === new Date().toDateString()
 );

 const pendingAppointments = appointments.filter(a => a.status === 'pending').slice(0, 5);
 const completedToday = appointments.filter(a =>
   new Date(a.dateTime ?? (a as any).date_time).toDateString() === new Date().toDateString() && a.status === 'completed'
 ).length;

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="bg-gradient-to-r from-green-600 to-green-700 text-gray-900 rounded-lg p-6">
 <h1 className="text-2xl font-bold mb-2">Good morning, Dr. {user.name}</h1>
 <p className="text-green-100">You have {todaysAppointments.length} appointments today</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Today's Appointments</p>
 <p className="text-3xl font-bold text-gray-900">{todaysAppointments.length}</p>
 </div>
 <Calendar className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
 <p className="text-3xl font-bold text-gray-900">{pendingAppointments.length}</p>
 </div>
 <Clock className="w-8 h-8 text-yellow-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Completed Today</p>
 <p className="text-3xl font-bold text-gray-900">{completedToday}</p>
 </div>
 <CheckCircle className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Patients</p>
 <p className="text-3xl font-bold text-gray-900">{new Set(appointments.map(a => a.patientId)).size}</p>
 </div>
 <Users className="w-8 h-8 text-blue-600" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Today's Schedule */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
 <button
 onClick={() => onPageChange('appointments')}
 className="text-green-600 hover:text-green-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {todaysAppointments.length > 0 ? (
 <div className="space-y-4">
 {todaysAppointments.map((appointment) => (
 <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
 <div className={`p-2 rounded-full ${
 appointment.status === 'completed' ? 'bg-green-100 text-green-600' :
 appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
 'bg-yellow-100 text-yellow-600'
 }`}>
 <Clock className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <p className="font-medium text-gray-900">{appointment.reason}</p>
 <p className="text-xs text-gray-500 mt-1">
 Patient ID: {appointment.patientId}
 </p>
 <p className="text-xs text-gray-500">
 {new Date(appointment.dateTime).toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 })}
 </p>
 <p className="text-xs text-gray-500 capitalize">{appointment.status}</p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-8">No appointments today</p>
 )}
 </div>
 </div>

 {/* Pending Appointments */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Pending Appointments</h2>
 <button
 onClick={() => onPageChange('appointments')}
 className="text-green-600 hover:text-green-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {pendingAppointments.length > 0 ? (
 <div className="space-y-4">
 {pendingAppointments.map((appointment) => (
 <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg">
 <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full">
 <Clock className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <p className="font-medium text-gray-900">{appointment.reason}</p>
 <p className="text-sm text-gray-500">
 {new Date(appointment.dateTime).toLocaleDateString()} at{' '}
 {new Date(appointment.dateTime).toLocaleTimeString([], {
 hour: '2-digit',
 minute: '2-digit',
 })}
 </p>
 </div>
 <div className="flex space-x-2">
 <button onClick={() => handleStatusUpdate(appointment.id, 'confirmed')} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
 Accept
 </button>
 <button onClick={() => handleStatusUpdate(appointment.id, 'cancelled')} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
 Decline
 </button>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-8">No pending appointments</p>
 )}
 </div>
 </div>
 </div>

 {/* Quick Stats */}
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Statistics</h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="text-center">
 <p className="text-2xl font-bold text-green-600">{(user as any).consultationFee ?? 0}</p>
 <p className="text-sm text-gray-500">Consultation Fee</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-blue-600">{user.experience}</p>
 <p className="text-sm text-gray-500">Years Experience</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-purple-600">{(user as any).specialization || "General"}</p>
 <p className="text-sm text-gray-500">Specialization</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-orange-600">{appointments.length}</p>
 <p className="text-sm text-gray-500">Total Appointments</p>
 </div>
 </div>
 </div>
 </div>
 );
};