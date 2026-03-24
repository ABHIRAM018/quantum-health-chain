import React, { useState, useEffect } from 'react';
import { Users, Activity, FileText, TrendingUp } from 'lucide-react';
import { api } from '../../utils/api';
import { SystemLog } from '../../types';

interface AdminDashboardProps {
 onPageChange: (page: string) => void;
}

interface SystemStats {
 totalUsers: number;
 totalPatients: number;
 totalDoctors: number;
 totalAppointments: number;
 totalBills: number;
 totalClaims: number;
 totalPayments: number;
 recentActivity: SystemLog[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onPageChange }) => {
 const [stats, setStats] = useState<SystemStats | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const loadData = async () => {
 try {
 const statsData = await api.admin.getSystemStats();
 setStats(statsData as SystemStats);
 } catch (error) {
 console.error('Error loading admin data:', error);
 } finally {
 setLoading(false);
 }
 };

 loadData();
 }, []);

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading dashboard...</div>
 </div>
 );
 }

 if (!stats) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-red-600">Error loading system statistics</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="bg-gradient-to-r from-red-600 to-red-700 text-gray-900 rounded-lg p-6">
 <h1 className="text-2xl font-bold mb-2">System Administration</h1>
 <p className="text-red-100">Healthcare Management System Overview</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Users</p>
 <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
 </div>
 <Users className="w-8 h-8 text-blue-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Active Appointments</p>
 <p className="text-3xl font-bold text-gray-900">{stats.totalAppointments}</p>
 </div>
 <Activity className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Bills</p>
 <p className="text-3xl font-bold text-gray-900">{stats.totalBills}</p>
 </div>
 <FileText className="w-8 h-8 text-orange-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Payments Processed</p>
 <p className="text-3xl font-bold text-gray-900">{stats.totalPayments}</p>
 </div>
 <TrendingUp className="w-8 h-8 text-teal-600" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* User Distribution */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">User Distribution</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Patients</span>
 <span className="font-medium">{stats.totalPatients}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Doctors</span>
 <span className="font-medium">{stats.totalDoctors}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Hospitals</span>
 <span className="font-medium">1</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Insurance Companies</span>
 <span className="font-medium">1</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Banks</span>
 <span className="font-medium">1</span>
 </div>
 </div>
 </div>
 </div>

 {/* System Health */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-500">API Status</span>
 <span className="flex items-center text-green-600">
 <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
 Online
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Database</span>
 <span className="flex items-center text-green-600">
 <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
 Connected
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Authentication</span>
 <span className="flex items-center text-green-600">
 <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
 Active
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Payment Gateway</span>
 <span className="flex items-center text-green-600">
 <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
 Operational
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-3">
 <button
 onClick={() => onPageChange('users')}
 className="w-full text-left p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-900 transition-colors"
 >
 Manage Users
 </button>
 <button
 onClick={() => onPageChange('system')}
 className="w-full text-left p-3 bg-green-50 text-green-600 rounded-lg hover:bg-emerald-900 transition-colors"
 >
 System Settings
 </button>
 <button
 onClick={() => onPageChange('logs')}
 className="w-full text-left p-3 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
 >
 View System Logs
 </button>
 <button
 onClick={() => onPageChange('reports')}
 className="w-full text-left p-3 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
 >
 Generate Reports
 </button>
 </div>
 </div>
 </div>
 </div>

 {/* Recent Activity */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Recent System Activity</h2>
 <button
 onClick={() => onPageChange('logs')}
 className="text-red-600 hover:text-red-600 text-sm font-medium"
 >
 View All Logs
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {stats.recentActivity.length > 0 ? (
 <div className="space-y-4">
 {stats.recentActivity.map((log) => (
 <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
 <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
 <Activity className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <p className="font-medium text-gray-900">{log.action}</p>
 <p className="text-sm text-gray-500">{log.details}</p>
 <div className="flex items-center space-x-4 mt-1">
 <p className="text-xs text-gray-500">
 User: {log.userId} ({log.userRole})
 </p>
 <p className="text-xs text-gray-500">
 {new Date(log.timestamp).toLocaleString()}
 </p>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-8">No recent activity</p>
 )}
 </div>
 </div>
 </div>
 );
};