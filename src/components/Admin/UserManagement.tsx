import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Filter, UserCheck, Edit } from 'lucide-react';
import { api } from '../../utils/api';
import { Admin, User, UserRole } from '../../types';

export const UserManagement: React.FC<{ user: Admin; onBack: () => void }> = ({ user, onBack }) => {
 const [users, setUsers] = useState<User[]>([]);
 const [loading, setLoading] = useState(true);
 const [showAddForm, setShowAddForm] = useState(false);
 const [editingUser, setEditingUser] = useState<User | null>(null);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterRole, setFilterRole] = useState('');

 const [formData, setFormData] = useState({
 name: '',
 email: '',
 password: 'password123',
 role: 'patient' as UserRole,
 // Additional fields based on role
 phone: '',
 address: '',
 specialization: '',
 licenseNumber: '',
 companyName: '',
 bankName: '',
 });

 const roles: UserRole[] = ['patient', 'doctor', 'hospital', 'insurance', 'bank', 'admin'];

 useEffect(() => {
 loadUsers();
 }, []);

 const loadUsers = async () => {
 try {
 const usersData = await api.admin.getAllUsers(user.role);
 setUsers(usersData as User[]);
 } catch (error) {
 console.error('Error loading users:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);

 try {
 if (editingUser) {
 await api.admin.updateUser(editingUser.id, formData, user.role);
 } else {
 await api.admin.createUser(formData, user.role);
 }
 
 await loadUsers();
 resetForm();
 } catch (error) {
 console.error('Error saving user:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (userId: string) => {
 if (window.confirm('Are you sure you want to delete this user?')) {
 try {
 await api.admin.deleteUser(userId, user.role);
 await loadUsers();
 } catch (error) {
 console.error('Error deleting user:', error);
 }
 }
 };

 const resetForm = () => {
 setFormData({
 name: '',
 email: '',
 password: 'password123',
 role: 'patient',
 phone: '',
 address: '',
 specialization: '',
 licenseNumber: '',
 companyName: '',
 bankName: '',
 });
 setShowAddForm(false);
 setEditingUser(null);
 };

 const startEdit = (userToEdit: User) => {
 setFormData({
 name: userToEdit.name,
 email: userToEdit.email,
 password: 'password123',
 role: userToEdit.role,
 phone: (userToEdit as any).phone || '',
 address: (userToEdit as any).address || '',
 specialization: (userToEdit as any).specialization || '',
 licenseNumber: (userToEdit as any).licenseNumber || '',
 companyName: (userToEdit as any).companyName || '',
 bankName: (userToEdit as any).bankName || '',
 });
 setEditingUser(userToEdit);
 setShowAddForm(true);
 };

 const filteredUsers = users.filter(member => {
 const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 member.email.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesRole = !filterRole || member.role === filterRole;
 return matchesSearch && matchesRole;
 });

 const getRoleColor = (role: UserRole) => {
 const colors: Record<string, string> = {
 patient: 'bg-blue-100 text-blue-300',
 doctor: 'bg-green-100 text-emerald-300',
 hospital: 'bg-purple-100 text-violet-300',
 insurance: 'bg-orange-100 text-orange-300',
 bank: 'bg-teal-100 text-teal-800',
 admin: 'bg-red-100 text-red-300',
 regulator: 'bg-indigo-100 text-indigo-800',
 };
 return colors[role] || 'bg-gray-100 text-gray-800';
 };

 if (loading && users.length === 0) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading users...</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
 <div className="flex space-x-2">
 <button
 onClick={onBack}
 className="text-red-600 hover:text-red-600 font-medium"
 >
 Back to Dashboard
 </button>
 <button
 onClick={() => setShowAddForm(true)}
 className="bg-red-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
 >
 <Plus className="w-4 h-4" />
 <span>Add User</span>
 </button>
 </div>
 </div>

 {/* Search and Filter */}
 <div className="bg-white p-4 rounded-xl border border-gray-200 ">
 <div className="flex flex-col md:flex-row gap-4">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
 <input
 type="text"
 placeholder="Search users by name or email..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 <div className="relative">
 <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
 <select
 value={filterRole}
 onChange={(e) => setFilterRole(e.target.value)}
 className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="">All Roles</option>
 {roles.map(role => (
 <option key={role} value={role} className="capitalize">{role}</option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* Add/Edit Form */}
 {showAddForm && (
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">
 {editingUser ? 'Edit User' : 'Add New User'}
 </h2>
 <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Name</label>
 <input
 type="text"
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
 <input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Role</label>
 <select
 value={formData.role}
 onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 required
 >
 {roles.map(role => (
 <option key={role} value={role} className="capitalize">{role}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Password</label>
 <input
 type="password"
 value={formData.password}
 onChange={(e) => setFormData({ ...formData, password: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 required
 />
 </div>

 {/* Role-specific fields */}
 {(formData.role === 'patient' || formData.role === 'hospital') && (
 <>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Phone</label>
 <input
 type="tel"
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Address</label>
 <input
 type="text"
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 </>
 )}

 {formData.role === 'doctor' && (
 <>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Specialization</label>
 <input
 type="text"
 value={formData.specialization}
 onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">License Number</label>
 <input
 type="text"
 value={formData.licenseNumber}
 onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 </>
 )}

 {formData.role === 'insurance' && (
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Company Name</label>
 <input
 type="text"
 value={formData.companyName}
 onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 )}

 {formData.role === 'bank' && (
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Bank Name</label>
 <input
 type="text"
 value={formData.bankName}
 onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 )}

 <div className="md:col-span-2 flex space-x-4">
 <button
 type="submit"
 disabled={loading}
 className="bg-red-600 text-gray-900 px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
 >
 {loading ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
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

 {/* Users Table */}
 <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">
 Users ({filteredUsers.length})
 </h2>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 User
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Role
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Created
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {filteredUsers.map((member) => (
 <tr key={member.id} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <div className="p-2 bg-red-100 text-red-600 rounded-full mr-3">
 <UserCheck className="w-4 h-4" />
 </div>
 <div>
 <div className="text-sm font-medium text-gray-900">{member.name}</div>
 <div className="text-sm text-gray-500">{member.email}</div>
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
 {member.role}
 </span>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
 {new Date(member.createdAt ?? (member as any).created_at).toLocaleDateString()}
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
 <div className="flex space-x-2">
 <button
 onClick={() => startEdit(member)}
 className="text-red-600 hover:text-red-200"
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(member.id)}
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
 {filteredUsers.length === 0 && (
 <div className="text-center py-8 text-gray-500">
 No users found matching your criteria
 </div>
 )}
 </div>
 </div>
 </div>
 );
};