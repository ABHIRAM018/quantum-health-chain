import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { api } from '../../utils/api';
import { Bank, Payment } from '../../types';

interface BankDashboardProps {
 user: Bank;
 onPageChange: (page: string) => void;
}

export const BankDashboard: React.FC<BankDashboardProps> = ({ user, onPageChange }) => {
 const [payments, setPayments] = useState<Payment[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const loadData = async () => {
 try {
 const paymentsData = await api.bank.getPayments(user.id, user.role);
 setPayments(paymentsData);
 } catch (error) {
 console.error('Error loading bank data:', error);
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

 const pendingPayments = payments.filter(p => p.status === 'pending');
 const processedPayments = payments.filter(p => p.status === 'processed');
 const completedPayments = payments.filter(p => p.status === 'completed');
 const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-gray-900 rounded-lg p-6">
 <h1 className="text-2xl font-bold mb-2">Welcome to {(user as any).bankName || user.name}</h1>
 <p className="text-teal-100">Payment Processing Dashboard</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Payments</p>
 <p className="text-3xl font-bold text-gray-900">{payments.length}</p>
 </div>
 <DollarSign className="w-8 h-8 text-teal-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Pending</p>
 <p className="text-3xl font-bold text-yellow-600">{pendingPayments.length}</p>
 </div>
 <Clock className="w-8 h-8 text-yellow-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Processed</p>
 <p className="text-3xl font-bold text-blue-600">{processedPayments.length}</p>
 </div>
 <CreditCard className="w-8 h-8 text-blue-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Completed</p>
 <p className="text-3xl font-bold text-green-600">{completedPayments.length}</p>
 </div>
 <CheckCircle className="w-8 h-8 text-green-600" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Recent Payments */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
 <button
 onClick={() => onPageChange('payments')}
 className="text-teal-600 hover:text-teal-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {payments.length === 0 ? (
 <p className="text-gray-500 text-center py-4">No recent payments</p>
 ) : (
 <div className="space-y-4">
 {payments.slice(0, 5).map((payment) => (
 <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
 <div className="flex items-center space-x-4">
 <div className={`p-2 rounded-full ${
 payment.status === 'completed' ? 'bg-green-100 text-green-600' :
 payment.status === 'processed' ? 'bg-blue-100 text-blue-600' :
 'bg-yellow-100 text-yellow-600'
 }`}>
 <DollarSign className="w-5 h-5" />
 </div>
 <div>
 <p className="font-medium text-gray-900">${payment.amount}</p>
 <p className="text-sm text-gray-500">{payment.id}</p>
 </div>
 </div>
 <span className={`px-3 py-1 rounded-full text-xs font-medium ${
 payment.status === 'completed' ? 'bg-green-100 text-emerald-300' :
 payment.status === 'processed' ? 'bg-blue-100 text-blue-300' :
 'bg-yellow-100 text-amber-300'
 }`}>
 {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Financial Overview */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-6">
 <div>
 <div className="flex justify-between mb-2">
 <span className="text-gray-500">Total Transaction Value</span>
 <span className="font-bold text-gray-900">${totalAmount.toLocaleString()}</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div className="bg-teal-600 h-2 rounded-full" style={{ width: '100%' }}></div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="p-4 bg-gray-50 rounded-lg">
 <p className="text-sm text-gray-500 mb-1">Average Payment</p>
 <p className="text-xl font-bold text-gray-900">
 ${payments.length > 0 ? (totalAmount / payments.length).toFixed(2) : '0.00'}
 </p>
 </div>
 <div className="p-4 bg-gray-50 rounded-lg">
 <p className="text-sm text-gray-500 mb-1">Success Rate</p>
 <p className="text-xl font-bold text-gray-900">
 {payments.length > 0 ? ((completedPayments.length / payments.length) * 100).toFixed(1) : '0'}%
 </p>
 </div>
 </div>

 <div className="p-4 border border-teal-100 bg-teal-50 rounded-lg flex items-start space-x-3">
 <TrendingUp className="w-5 h-5 text-teal-600 mt-0.5" />
 <div>
 <p className="text-sm font-medium text-teal-900">Financial Growth</p>
 <p className="text-xs text-teal-600">Transaction volume has increased by 12% compared to last month.</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Quick Actions */}
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <button
 onClick={() => onPageChange('payments')}
 className="p-4 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors text-center"
 >
 <DollarSign className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Process Payments</span>
 </button>
 <button
 onClick={() => onPageChange('transactions')}
 className="p-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-900 transition-colors text-center"
 >
 <CreditCard className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">View Transactions</span>
 </button>
 <button
 onClick={() => onPageChange('accounts')}
 className="p-4 bg-green-50 text-green-600 rounded-lg hover:bg-emerald-900 transition-colors text-center"
 >
 <CheckCircle className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Account Management</span>
 </button>
 <button
 onClick={() => onPageChange('reports')}
 className="p-4 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-center"
 >
 <TrendingUp className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Financial Reports</span>
 </button>
 </div>
 </div>
 </div>
 );
};