import React, { useState, useEffect } from 'react';
import { 
 Users, Bed, Stethoscope, DollarSign, 
 Activity, CheckCircle, AlertCircle 
} from 'lucide-react';
import { api } from '../../utils/api';
import { Hospital, HospitalRoom, HospitalService, PatientAdmission } from '../../types';

interface HospitalDashboardProps {
 user: Hospital;
 onPageChange: (page: string) => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({ user, onPageChange }) => {
 const [rooms, setRooms] = useState<HospitalRoom[]>([]);
 const [services, setServices] = useState<HospitalService[]>([]);
 const [admissions, setAdmissions] = useState<PatientAdmission[]>([]);
 const [doctors, setDoctors] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const loadData = async () => {
 try {
 const [roomsData, servicesData, admissionsData, doctorsData] = await Promise.all([
 api.hospitals.getRooms(user.id),
 api.hospitals.getServices(user.id),
 api.hospitals.getAdmissions(user.id),
 api.hospitals.getDoctors(user.id, user.role),
 ]);
 const mapRoom = (r: any) => ({
          ...r,
          roomNumber:    r.room_number    ?? r.roomNumber    ?? '',
          roomType:      r.room_type      ?? r.roomType      ?? 'general',
          totalBeds:     Number(r.total_beds     ?? r.totalBeds     ?? 0),
          availableBeds: Number(r.available_beds ?? r.availableBeds ?? 0),
          pricePerDay:   parseFloat(r.price_per_day ?? r.pricePerDay ?? 0),
          hospitalId:    r.hospital_id    ?? r.hospitalId,
          amenities:     Array.isArray(r.amenities) ? r.amenities : [],
        });
        const mapSvc = (s: any) => ({
          ...s,
          serviceName: s.service_name ?? s.serviceName ?? '',
          basePrice:   parseFloat(s.base_price ?? s.basePrice ?? 0),
          isActive:    s.is_active    ?? s.isActive    ?? true,
          hospitalId:  s.hospital_id  ?? s.hospitalId,
        });
        setRooms((roomsData as any[]).map(mapRoom));
        setServices((servicesData as any[]).map(mapSvc));
        setAdmissions(admissionsData as any[]);
        setDoctors(doctorsData);
 } catch (error) {
 console.error('Error loading hospital data:', error);
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

 const totalBeds = rooms.reduce((sum, room) => sum + room.totalBeds, 0);
 const availableBeds = rooms.reduce((sum, room) => sum + room.availableBeds, 0);
 const occupiedBeds = totalBeds - availableBeds;
 const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
 
 const activeAdmissions = admissions.filter(a => a.status === 'admitted');
 const activeServices = services.filter(s => s.isActive);

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-gray-900 rounded-lg p-6">
 <h1 className="text-2xl font-bold mb-2">{user.name}</h1>
 <p className="text-purple-100">Hospital Management Dashboard</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Doctors</p>
 <p className="text-3xl font-bold text-gray-900">{doctors.length}</p>
 </div>
 <Stethoscope className="w-8 h-8 text-purple-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Bed Occupancy</p>
 <p className="text-3xl font-bold text-gray-900">{occupancyRate}%</p>
 <p className="text-xs text-gray-500">{occupiedBeds}/{totalBeds} beds</p>
 </div>
 <Bed className="w-8 h-8 text-blue-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Active Patients</p>
 <p className="text-3xl font-bold text-gray-900">{activeAdmissions.length}</p>
 </div>
 <Users className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Active Services</p>
 <p className="text-3xl font-bold text-gray-900">{activeServices.length}</p>
 </div>
 <Activity className="w-8 h-8 text-orange-600" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Room Status */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Room Status</h2>
 <button
 onClick={() => onPageChange('rooms')}
 className="text-purple-600 hover:text-purple-600 text-sm font-medium"
 >
 Manage Rooms
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 {rooms.slice(0, 5).map((room) => (
 <div key={room.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
 <div className="flex items-center space-x-3">
 <div className={`p-2 rounded-full ${
 room.availableBeds > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
 }`}>
 <Bed className="w-4 h-4" />
 </div>
 <div>
 <p className="font-medium text-gray-900">Room {room.roomNumber}</p>
 <p className="text-sm text-gray-500 capitalize">{room.roomType}</p>
 <p className="text-xs text-gray-500">Floor {room.floor}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="font-medium text-gray-900">
 {room.availableBeds}/{room.totalBeds}
 </p>
 <p className="text-xs text-gray-500">Available</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Recent Admissions */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Recent Admissions</h2>
 <button
 onClick={() => onPageChange('patients')}
 className="text-purple-600 hover:text-purple-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {activeAdmissions.length > 0 ? (
 <div className="space-y-4">
 {activeAdmissions.slice(0, 5).map((admission) => (
 <div key={admission.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
 <div className={`p-2 rounded-full ${
 admission.status === 'admitted' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
 }`}>
 <Users className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <p className="font-medium text-gray-900">Patient {admission.patientId}</p>
 <p className="text-sm text-gray-500">{admission.reason}</p>
 <p className="text-xs text-gray-500">
 Admitted: {new Date(admission.admissionDate).toLocaleDateString()}
 </p>
 </div>
 <div className="text-right">
 <p className="text-xs text-gray-500 capitalize">{admission.status}</p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-8">No active admissions</p>
 )}
 </div>
 </div>
 </div>

 {/* Services Overview */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Hospital Services</h2>
 <button
 onClick={() => onPageChange('settings')}
 className="text-purple-600 hover:text-purple-600 text-sm font-medium"
 >
 Manage Services
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {activeServices.slice(0, 6).map((service) => (
 <div key={service.id} className="p-4 bg-orange-50 rounded-lg">
 <div className="flex items-start justify-between">
 <div className="flex-1">
 <h3 className="font-medium text-gray-900">{service.serviceName}</h3>
 <p className="text-sm text-gray-500 mt-1">{service.department}</p>
 <p className="text-xs text-gray-500 mt-2">{service.duration} minutes</p>
 </div>
 <div className="text-right">
 <p className="font-bold text-orange-600">${service.basePrice}</p>
 <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
 service.isActive ? 'bg-green-100 text-emerald-300' : 'bg-red-100 text-red-300'
 }`}>
 {service.isActive ? (
 <>
 <CheckCircle className="w-3 h-3 mr-1" />
 Active
 </>
 ) : (
 <>
 <AlertCircle className="w-3 h-3 mr-1" />
 Inactive
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <button
 onClick={() => onPageChange('doctors')}
 className="p-4 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-center"
 >
 <Stethoscope className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Manage Doctors</span>
 </button>
 <button
 onClick={() => onPageChange('settings')}
 className="p-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-900 transition-colors text-center"
 >
 <Bed className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Room Management</span>
 </button>
 <button
 onClick={() => onPageChange('patients')}
 className="p-4 bg-green-50 text-green-600 rounded-lg hover:bg-emerald-900 transition-colors text-center"
 >
 <Users className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Patient Records</span>
 </button>
 <button
 onClick={() => onPageChange('bills')}
 className="p-4 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-center"
 >
 <DollarSign className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Billing</span>
 </button>
 </div>
 </div>
 </div>
 );
};