import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Stethoscope, Search, Filter, Edit } from 'lucide-react';
import { api } from '../../utils/api';
import { Hospital, Doctor } from '../../types';

interface DoctorManagementProps {
 user: Hospital;
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({ user }) => {
 const [doctors, setDoctors] = useState<Doctor[]>([]);
 const [loading, setLoading] = useState(true);
 const [showAddForm, setShowAddForm] = useState(false);
 const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterSpecialization, setFilterSpecialization] = useState('');

 const [formData, setFormData] = useState({
 name: '',
 email: '',
 password: 'password123',
 specialization: '',
 licenseNumber: '',
 experience: 0,
 consultationFee: 0,
 });

 useEffect(() => {
 loadDoctors();
 }, [user.id]);

 const loadDoctors = async () => {
 try {
 const doctorsData = await api.hospitals.getDoctors(user.id, user.role);
 setDoctors(doctorsData as unknown as Doctor[]);
 } catch (error) {
 console.error('Error loading doctors:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 if (editingDoctor) {
 await api.hospitals.updateDoctor(editingDoctor.id, formData, user.id, user.role);
 } else {
 await api.hospitals.createDoctor(formData, user.id, user.role);
 }
 
 await loadDoctors();
 resetForm();
 } catch (error) {
 console.error('Error saving doctor:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (doctorId: string) => {
 if (window.confirm('Are you sure you want to delete this doctor?')) {
 try {
 await api.hospitals.deleteDoctor(doctorId, user.id, user.role);
 await loadDoctors();
 } catch (error) {
 console.error('Error deleting doctor:', error);
 }
 }
 };

 const resetForm = () => {
 setFormData({
 name: '',
 email: '',
 password: 'password123',
 specialization: '',
 licenseNumber: '',
 experience: 0,
 consultationFee: 0,
 });
 setShowAddForm(false);
 setEditingDoctor(null);
 };

 const startEdit = (doctor: Doctor) => {
 setFormData({
 name: doctor.name,
 email: doctor.email,
 password: 'password123',
 specialization: doctor.specialization,
 licenseNumber: doctor.licenseNumber,
 experience: doctor.experience,
 consultationFee: doctor.consultationFee,
 });
 setEditingDoctor(doctor);
 setShowAddForm(true);
 };

 const filteredDoctors = doctors.filter(doctor => {
 const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
 doctor.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesSpecialization = !filterSpecialization || doctor.specialization === filterSpecialization;
 return matchesSearch && matchesSpecialization;
 });

 const specializations = [...new Set(doctors.map(d => d.specialization))];

 if (loading && doctors.length === 0) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading doctors...</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
 <p className="text-gray-500">Manage hospital doctors and their information</p>
 </div>
 <button
 onClick={() => setShowAddForm(true)}
 className="bg-purple-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
 >
 <Plus className="w-4 h-4" />
 <span>Add Doctor</span>
 </button>
 </div>

 {/* Search and Filter */}
 <div className="bg-white p-4 rounded-xl border border-gray-200 ">
 <div className="flex flex-col md:flex-row gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
 <input
 type="text"
 placeholder="Search doctors by name, email, or license number..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 />
 </div>
 <div className="relative">
 <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
 <select
 value={filterSpecialization}
 onChange={(e) => setFilterSpecialization(e.target.value)}
 className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 >
 <option value="">All Specializations</option>
 {specializations.map(spec => (
 <option key={spec} value={spec}>{spec}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* Add/Edit Form */}
 {showAddForm && (
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">
 {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
 </h2>
 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Full Name
 </label>
 <input
 type="text"
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Email
 </label>
 <input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Specialization
 </label>
 <input
 type="text"
 value={formData.specialization}
 onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 License Number
 </label>
 <input
 type="text"
 value={formData.licenseNumber}
 onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Experience (Years)
 </label>
 <input
 type="number"
 value={formData.experience}
 onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 required
 min="0"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Consultation Fee ($)
 </label>
 <input
 type="number"
 value={formData.consultationFee}
 onChange={(e) => setFormData({ ...formData, consultationFee: parseInt(e.target.value) })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 required
 min="0"
 />
 </div>
 <div className="md:col-span-2 flex space-x-4">
 <button
 type="submit"
 disabled={loading}
 className="bg-purple-600 text-gray-900 px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
 >
 {loading ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Add Doctor'}
 </button>
 <button
 type="button"
 onClick={resetForm}
 className="bg-gray-300 text-gray-600 px-6 py-2 rounded-lg hover:bg-gray-300"
 >
 Cancel
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Doctors List */}
 <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">
 Doctors ({filteredDoctors.length})
 </h2>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Doctor
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Specialization
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 License
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Experience
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Fee
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {filteredDoctors.map((doctor) => (
 <tr key={doctor.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <div className="p-2 bg-purple-100 text-purple-600 rounded-full mr-3">
 <Stethoscope className="w-4 h-4" />
 </div>
 <div>
 <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
 <div className="text-sm text-gray-500">{doctor.email}</div>
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {doctor.specialization}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {doctor.licenseNumber}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {doctor.experience} years
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 ${doctor.consultationFee}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => startEdit(doctor)}
 className="text-purple-600 hover:text-purple-900"
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(doctor.id)}
 className="text-red-600 hover:text-red-200"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 {filteredDoctors.length === 0 && (
 <div className="text-center py-8 text-gray-500">
 No doctors found matching your criteria
 </div>
 )}
 </div>
 </div>
 </div>
 );
};