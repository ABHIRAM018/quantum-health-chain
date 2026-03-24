import React, { useState, useEffect } from 'react';
import { Shield, FileText, CheckCircle, XCircle, Clock, Users, TrendingUp } from 'lucide-react';
import { api } from '../../utils/api';
import { Insurance, InsuranceClaim } from '../../types';

interface InsuranceDashboardProps {
 user: Insurance;
 onPageChange: (page: string) => void;
}

export const InsuranceDashboard: React.FC<InsuranceDashboardProps> = ({ user, onPageChange }) => {
 const [claims, setClaims] = useState<InsuranceClaim[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const loadData = async () => {
 try {
 const claimsData = await api.insurance.getClaims(user.id, user.role);
 setClaims(claimsData);
 } catch (error) {
 console.error('Error loading insurance data:', error);
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

 const pendingClaims = claims.filter(c => c.status === 'submitted');
 const underReviewClaims = claims.filter(c => c.status === 'under_review');
 const approvedClaims = claims.filter(c => c.status === 'approved');
 const rejectedClaims = claims.filter(c => c.status === 'rejected');
 const totalClaimAmount = claims.reduce((sum, c) => sum + c.amount, 0);
 const approvedAmount = approvedClaims.reduce((sum, c) => sum + c.amount, 0);

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-gray-900 rounded-lg p-6">
 <h1 className="text-2xl font-bold mb-2">{(user as any).companyName || user.name}</h1>
 <p className="text-orange-100">Insurance Claims Management Dashboard</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Claims</p>
 <p className="text-3xl font-bold text-gray-900">{claims.length}</p>
 </div>
 <Shield className="w-8 h-8 text-orange-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Pending Review</p>
 <p className="text-3xl font-bold text-yellow-600">{pendingClaims.length + underReviewClaims.length}</p>
 </div>
 <Clock className="w-8 h-8 text-yellow-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Approved</p>
 <p className="text-3xl font-bold text-green-600">{approvedClaims.length}</p>
 </div>
 <CheckCircle className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Rejected</p>
 <p className="text-3xl font-bold text-red-600">{rejectedClaims.length}</p>
 </div>
 <XCircle className="w-8 h-8 text-red-600" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Recent Claims */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Recent Claims</h2>
 <button
 onClick={() => onPageChange('claims')}
 className="text-orange-600 hover:text-orange-600 text-sm font-medium"
 >
 View All
 </button>
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {claims.length > 0 ? (
 <div className="space-y-4">
 {claims.slice(0, 5).map((claim) => (
 <div key={claim.id} className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
 <div className={`p-2 rounded-full ${
 claim.status === 'approved' ? 'bg-green-100 text-green-600' :
 claim.status === 'rejected' ? 'bg-red-100 text-red-600' :
 claim.status === 'under_review' ? 'bg-yellow-100 text-yellow-600' :
 'bg-blue-100 text-blue-600'
 }`}>
 {claim.status === 'approved' ? <CheckCircle className="w-4 h-4" /> :
 claim.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
 <Clock className="w-4 h-4" />}
 </div>
 <div className="flex-1">
 <p className="font-medium text-gray-900">Claim #{claim.id}</p>
 <p className="text-sm text-gray-500">Patient: {claim.patientId}</p>
 <p className="text-lg font-bold text-orange-600">${claim.amount}</p>
 </div>
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 claim.status === 'submitted' ? 'bg-blue-100 text-blue-300' :
 claim.status === 'under_review' ? 'bg-yellow-100 text-amber-300' :
 claim.status === 'approved' ? 'bg-green-100 text-emerald-300' :
 'bg-red-100 text-red-300'
 }`}>
 {claim.status.replace('_', ' ')}
 </span>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-gray-500 text-center py-8">No claims found</p>
 )}
 </div>
 </div>

 {/* Claims Statistics */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Claims Statistics</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Total Claim Value</span>
 <span className="font-bold text-orange-600">${totalClaimAmount.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Approved Amount</span>
 <span className="font-bold text-green-600">${approvedAmount.toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Approval Rate</span>
 <span className="font-bold text-green-600">
 {claims.length > 0 ? Math.round((approvedClaims.length / claims.length) * 100) : 0}%
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Average Claim</span>
 <span className="font-bold text-gray-900">
 ${claims.length > 0 ? Math.round(totalClaimAmount / claims.length) : 0}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-gray-500">Policy Types</span>
 <span className="font-medium text-gray-900">{((user as any).policyTypes || []).length}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Policy Types */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Available Policy Types</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {((user as any).policyTypes || ['Basic', 'Premium']).map((policyType: string, index: number) => (
 <div key={index} className="p-4 bg-orange-50 rounded-lg text-center">
 <Shield className="w-8 h-8 text-orange-600 mx-auto mb-2" />
 <h3 className="font-medium text-gray-900">{policyType}</h3>
 <p className="text-sm text-gray-500 mt-1">Coverage Plan</p>
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
 onClick={() => onPageChange('claims')}
 className="p-4 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-center"
 >
 <Shield className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Review Claims</span>
 </button>
 <button
 onClick={() => onPageChange('patients')}
 className="p-4 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-900 transition-colors text-center"
 >
 <Users className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Patient Management</span>
 </button>
 <button
 onClick={() => onPageChange('hospitals')}
 className="p-4 bg-green-50 text-green-600 rounded-lg hover:bg-emerald-900 transition-colors text-center"
 >
 <FileText className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Hospital Network</span>
 </button>
 <button
 onClick={() => onPageChange('reports')}
 className="p-4 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors text-center"
 >
 <TrendingUp className="w-6 h-6 mx-auto mb-2" />
 <span className="text-sm font-medium">Analytics</span>
 </button>
 </div>
 </div>
 </div>
 );
};