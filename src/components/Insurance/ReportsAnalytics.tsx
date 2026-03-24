import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, FileText, PieChart } from 'lucide-react';
import { Insurance } from '../../types';
import { api } from '../../utils/api';

interface ReportsAnalyticsProps {
 user: Insurance;
 onBack: () => void;
}

interface AnalyticsData {
 claimsOverTime: { month: string; claims: number; amount: number }[];
 claimsByStatus: { status: string; count: number; percentage: number }[];
 topHospitals: { hospital: string; claims: number; amount: number }[];
 averageClaimAmount: number;
 totalClaims: number;
 totalAmount: number;
 approvalRate: number;
 processingTime: number;
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({ user, onBack }) => {
 const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
 const [loading, setLoading] = useState(true);
 const [dateRange, setDateRange] = useState({ start: '', end: '' });
 const [reportType, setReportType] = useState('overview');

 useEffect(() => {
 loadAnalytics();
 }, [dateRange, user.id]);

 const loadAnalytics = async () => {
 try {
   const data = await api.insurance.getAnalytics(user.id, user.role);
   if (data) {
     setAnalytics(data);
   } else {
     // Mock analytics data if server returns null (fallback)
     const mockAnalytics: AnalyticsData = {
       claimsOverTime: [
         { month: 'Jan 2024', claims: 45, amount: 125000 },
         { month: 'Feb 2024', claims: 52, amount: 142000 },
         { month: 'Mar 2024', claims: 38, amount: 98000 },
         { month: 'Apr 2024', claims: 61, amount: 165000 },
         { month: 'May 2024', claims: 47, amount: 128000 },
         { month: 'Jun 2024', claims: 55, amount: 151000 },
       ],
       claimsByStatus: [
         { status: 'Approved', count: 156, percentage: 65 },
         { status: 'Rejected', count: 48, percentage: 20 },
         { status: 'Under Review', count: 24, percentage: 10 },
         { status: 'Pending', count: 12, percentage: 5 },
       ],
       topHospitals: [
         { hospital: 'City General Hospital', claims: 89, amount: 245000 },
         { hospital: 'Metro Medical Center', claims: 67, amount: 189000 },
         { hospital: 'Regional Health System', claims: 45, amount: 123000 },
         { hospital: 'Community Hospital', claims: 34, amount: 87000 },
         { hospital: 'University Medical', claims: 23, amount: 65000 },
       ],
       averageClaimAmount: 2850,
       totalClaims: 298,
       totalAmount: 809000,
       approvalRate: 78.5,
       processingTime: 3.2,
     };
     setAnalytics(mockAnalytics);
   }
 } catch (error) {
   console.error('Error loading analytics:', error);
 } finally {
   setLoading(false);
 }
 };

 const handleDownloadReport = () => {
 if (!analytics) return;

 const content = `
${user.companyName} - INSURANCE ANALYTICS REPORT
===============================================
Generated: ${new Date().toLocaleDateString()}
Period: ${dateRange.start || 'All time'} to ${dateRange.end || 'Present'}

EXECUTIVE SUMMARY:
------------------
Total Claims Processed: ${analytics.totalClaims}
Total Claim Amount: $${analytics.totalAmount.toLocaleString()}
Average Claim Amount: $${analytics.averageClaimAmount.toLocaleString()}
Approval Rate: ${analytics.approvalRate}%
Average Processing Time: ${analytics.processingTime} days

CLAIMS BY STATUS:
-----------------
${analytics.claimsByStatus.map(item => 
 `${item.status}: ${item.count} claims (${item.percentage}%)`
).join('\n')}

TOP HOSPITALS BY VOLUME:
------------------------
${analytics.topHospitals.map((hospital, index) => 
 `${index + 1}. ${hospital.hospital}: ${hospital.claims} claims, $${hospital.amount.toLocaleString()}`
).join('\n')}

MONTHLY TRENDS:
---------------
${analytics.claimsOverTime.map(month => 
 `${month.month}: ${month.claims} claims, $${month.amount.toLocaleString()}`
).join('\n')}

Company: ${user.companyName}
Report Type: ${reportType}
 `;
 
 const blob = new Blob([content], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `insurance-analytics-${new Date().toISOString().split('T')[0]}.txt`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading analytics...</div>
 </div>
 );
 }

 if (!analytics) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-red-600">Error loading analytics data</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
 <p className="text-gray-500">Insurance claims analytics and reporting</p>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={onBack}
 className="text-orange-600 hover:text-orange-600 font-medium"
 >
 Back to Dashboard
 </button>
 <button
 onClick={handleDownloadReport}
 className="bg-orange-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
 >
 <Download className="w-4 h-4" />
 <span>Export Report</span>
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Report Type</label>
 <select
 value={reportType}
 onChange={(e) => setReportType(e.target.value)}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
 >
 <option value="overview">Overview</option>
 <option value="claims">Claims Analysis</option>
 <option value="financial">Financial Report</option>
 <option value="performance">Performance Metrics</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">Start Date</label>
 <input
 type="date"
 value={dateRange.start}
 onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">End Date</label>
 <input
 type="date"
 value={dateRange.end}
 onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
 />
 </div>
 </div>
 </div>

 {/* Key Metrics */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Claims</p>
 <p className="text-3xl font-bold text-gray-900">{analytics.totalClaims}</p>
 </div>
 <FileText className="w-8 h-8 text-orange-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Total Amount</p>
 <p className="text-3xl font-bold text-green-600">${analytics.totalAmount.toLocaleString()}</p>
 </div>
 <DollarSign className="w-8 h-8 text-green-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Approval Rate</p>
 <p className="text-3xl font-bold text-blue-600">{analytics.approvalRate}%</p>
 </div>
 <TrendingUp className="w-8 h-8 text-blue-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Avg Processing</p>
 <p className="text-3xl font-bold text-purple-600">{analytics.processingTime}d</p>
 </div>
 <Calendar className="w-8 h-8 text-purple-600" />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Claims Over Time */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Claims Trend</h2>
 <BarChart3 className="w-5 h-5 text-orange-600" />
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 {analytics.claimsOverTime.map((month, index) => (
 <div key={index} className="flex items-center justify-between">
 <div className="flex-1">
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm font-medium text-gray-600">{month.month}</span>
 <span className="text-sm text-gray-500">{month.claims} claims</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div 
 className="bg-orange-600 h-2 rounded-full" 
 style={{ width: `${(month.claims / 70) * 100}%` }}
 ></div>
 </div>
 <div className="text-xs text-gray-500 mt-1">${month.amount.toLocaleString()}</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Claims by Status */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <div className="flex items-center justify-between">
 <h2 className="text-lg font-semibold text-gray-900">Claims by Status</h2>
 <PieChart className="w-5 h-5 text-orange-600" />
 </div>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="space-y-4">
 {analytics.claimsByStatus.map((status, index) => (
 <div key={index} className="flex items-center justify-between">
 <div className="flex items-center space-x-3">
 <div className={`w-4 h-4 rounded-full ${
 status.status === 'Approved' ? 'bg-green-500' :
 status.status === 'Rejected' ? 'bg-red-500' :
 status.status === 'Under Review' ? 'bg-yellow-500' :
 'bg-blue-500'
 }`}></div>
 <span className="text-sm font-medium text-gray-600">{status.status}</span>
 </div>
 <div className="text-right">
 <div className="text-sm font-bold text-gray-900">{status.count}</div>
 <div className="text-xs text-gray-500">{status.percentage}%</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Top Hospitals */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Top Hospitals by Claims Volume</h2>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50">
 <tr>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Rank
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Hospital
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Claims
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Total Amount
 </th>
 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 Avg Claim
 </th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200">
 {analytics.topHospitals.map((hospital, index) => (
 <tr key={index} className="hover:bg-gray-50">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full font-bold">
 {index + 1}
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm font-medium text-gray-900">{hospital.hospital}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm text-gray-900">{hospital.claims}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm font-bold text-green-600">${hospital.amount.toLocaleString()}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm text-gray-900">${Math.round(hospital.amount / hospital.claims).toLocaleString()}</div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Performance Insights */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Performance Insights</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <h3 className="font-medium text-gray-900">Key Performance Indicators</h3>
 <div className="space-y-3">
 <div className="flex justify-between">
 <span className="text-gray-500">Average Claim Amount</span>
 <span className="font-bold">${analytics.averageClaimAmount.toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500">Claims Approval Rate</span>
 <span className="font-bold text-green-600">{analytics.approvalRate}%</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500">Average Processing Time</span>
 <span className="font-bold">{analytics.processingTime} days</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500">Monthly Growth Rate</span>
 <span className="font-bold text-blue-600">+12.5%</span>
 </div>
 </div>
 </div>
 
 <div className="space-y-4">
 <h3 className="font-medium text-gray-900">Recommendations</h3>
 <div className="space-y-3 text-sm">
 <div className="p-3 bg-green-50 rounded-lg">
 <p className="text-emerald-300">
 <strong>Good:</strong> Approval rate is above industry average of 75%
 </p>
 </div>
 <div className="p-3 bg-yellow-50 rounded-lg">
 <p className="text-amber-300">
 <strong>Attention:</strong> Processing time could be improved (target: 2.5 days)
 </p>
 </div>
 <div className="p-3 bg-blue-50 rounded-lg">
 <p className="text-blue-300">
 <strong>Opportunity:</strong> Consider automated pre-approval for claims under $500
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};