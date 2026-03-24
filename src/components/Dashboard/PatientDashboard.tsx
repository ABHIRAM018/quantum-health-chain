import React, { useState, useEffect } from 'react';
import { Calendar, FileText, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';
import { Patient, Appointment, MedicalRecord, Bill } from '../../types';

interface PatientDashboardProps {
 user: Patient;
 onPageChange: (page: string) => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, onPageChange }) => {
 const [appointments, setAppointments] = useState<Appointment[]>([]);
 const [records, setRecords] = useState<MedicalRecord[]>([]);
 const [bills, setBills] = useState<Bill[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const loadData = async () => {
 try {
 const [appointmentsData, recordsData, billsData] = await Promise.all([
 api.patients.getAppointments(user.id, user.role),
 api.patients.getMedicalRecords(user.id, user.role),
 api.patients.getBills(user.id, user.role),
 ]);
 setAppointments(appointmentsData);
 setRecords(recordsData);
 setBills(billsData);
 } catch (error) {
 console.error('Error loading patient data:', error);
 } finally {
 setLoading(false);
 }
 };

 loadData();
 }, [user.id]);

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading dashboard...</div>
 </div>
 );
 }

 const upcomingAppointments = appointments.filter(a => 
   new Date(a.dateTime) > new Date() && a.status !== 'cancelled'
 ).slice(0, 3);

 const recentRecords = records.slice(0, 3);
 const pendingBills = bills.filter(b => b.status === 'pending').slice(0, 3);

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-gray-900 rounded-lg p-6">
 <h1 className="text-2xl font-bold mb-2">Welcome back, {user.name}</h1>
 <p className="text-blue-100">Here's your health overview for today</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Appointments</p>
 <p className="text-3xl font-bold text-gray-900">{appointments.length}</p>
 </div>
 <Calendar className="w-8 h-8 text-blue-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Medical Records</p>
 <p className="text-3xl font-bold text-gray-900">{records.length}</p>
 </div>
 <FileText className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Pending Bills</p>
 <p className="text-3xl font-bold text-gray-900">{pendingBills.length}</p>
 </div>
 <CreditCard className="w-8 h-8 text-orange-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Health Score</p>
 <p className="text-3xl font-bold text-gray-900">85%</p>
 </div>
 <CheckCircle className="w-8 h-8 text-teal-600" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Upcoming Appointments */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
 <button
 onClick={() => onPageChange('appointments')}
 className="text-blue-600 hover:text-blue-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {upcomingAppointments.length > 0 ? (
 <div className="space-y-4">
 {upcomingAppointments.map((appointment) => (
 <div key={appointment.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
 <div className={`p-2 rounded-full ${
 appointment.status === 'confirmed' ? 'bg-green-100 text-green-600' :
 appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
 'bg-gray-100 text-gray-600'
 }`}>
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
 <p className="text-xs text-gray-500 capitalize">{appointment.status}</p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
 )}
 </div>
 </div>

 {/* Recent Medical Records */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Recent Records</h2>
 <button
 onClick={() => onPageChange('records')}
 className="text-blue-600 hover:text-blue-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {recentRecords.length > 0 ? (
 <div className="space-y-4">
 {recentRecords.map((record) => (
 <div key={record.id} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
 <div className="p-2 bg-green-100 text-green-600 rounded-full">
 <FileText className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <p className="font-medium text-gray-900">{record.diagnosis}</p>
 <p className="text-sm text-gray-500">{record.prescription}</p>
 <p className="text-xs text-gray-500">
 {new Date(record.createdAt).toLocaleDateString()}
 </p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-8">No medical records</p>
 )}
 </div>
 </div>
 </div>

 {/* Pending Bills */}
 {pendingBills.length > 0 && (
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Pending Bills</h2>
 <button
 onClick={() => onPageChange('bills')}
 className="text-blue-600 hover:text-blue-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 {pendingBills.map((bill) => (
 <div key={bill.id} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
 <div className="flex items-center space-x-3">
 <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
 <AlertCircle className="w-4 h-4" />
 </div>
 <div>
 <p className="font-medium text-gray-900">Bill #{bill.id}</p>
 <p className="text-sm text-gray-500">
 {new Date(bill.createdAt).toLocaleDateString()}
 </p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-bold text-orange-600">${bill.amount}</p>
 <p className="text-xs text-gray-500 capitalize">{bill.status}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
};