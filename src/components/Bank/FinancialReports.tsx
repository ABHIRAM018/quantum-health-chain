import React, { useState, useEffect } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import { api } from '../../utils/api';
import { Bank, Payment } from '../../types';

interface FinancialReportsProps {
 user: Bank;
 onBack: () => void;
}

interface FinancialData {
 totalRevenue: number;
 totalTransactions: number;
 averageTransaction: number;
 pendingAmount: number;
 completedAmount: number;
 payments: Payment[];
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({ user, onBack }) => {
 const [financialData, setFinancialData] = useState<FinancialData | null>(null);
 const [loading, setLoading] = useState(true);
 const [dateRange] = useState({ start: '', end: '' });

 useEffect(() => {
   loadFinancialData();
 }, [user.id, dateRange]);

 const loadFinancialData = async () => {
   try {
     const payments = await api.bank.getPayments(user.id, user.role);
     const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
     const completed = payments.filter(p => p.status === 'completed');
     const pending = payments.filter(p => p.status === 'pending');
     
     setFinancialData({
       totalRevenue,
       totalTransactions: payments.length,
       averageTransaction: payments.length > 0 ? totalRevenue / payments.length : 0,
       pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
       completedAmount: completed.reduce((sum, p) => sum + p.amount, 0),
       payments
     });
   } catch (error) {
     console.error('Error loading financial data:', error);
   } finally {
     setLoading(false);
   }
 };

 const handleDownloadReport = () => {
   if (!financialData) return;

   const content = `FINANCIAL REPORT - ${user.bankName}\nGenerated: ${new Date().toLocaleString()}\n\n` +
     `Total Volume: $${financialData.totalRevenue.toLocaleString()}\n` +
     `Total Transactions: ${financialData.totalTransactions}\n` +
     `Completed: $${financialData.completedAmount.toLocaleString()}\n` +
     `Pending: $${financialData.pendingAmount.toLocaleString()}\n\n` +
     `TRANSACTIONS:\n` +
     financialData.payments.map(p => `${new Date(p.createdAt).toLocaleDateString()} | $${p.amount} | ${p.status}`).join('\n');

   const blob = new Blob([content], { type: 'text/plain' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = `financial-report-${user.id}.txt`;
   a.click();
   URL.revokeObjectURL(url);
 };

 if (loading || !financialData) {
   return (
     <div className="flex items-center justify-center h-64">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
     </div>
   );
 }

 return (
   <div className="p-6 space-y-6">
     <div className="flex items-center justify-between">
       <div>
         <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
         <p className="text-gray-600">Analyze transaction volume and financial performance</p>
       </div>
       <div className="flex space-x-2">
         <button
           onClick={handleDownloadReport}
           className="bg-white text-gray-700 px-4 py-2 rounded-lg border hover:bg-gray-50 flex items-center space-x-2 shadow-sm transition-colors"
         >
           <Download className="w-4 h-4" />
           <span>Export PDF</span>
         </button>
         <button
           onClick={onBack}
           className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
         >
           Back to Dashboard
         </button>
       </div>
     </div>

     {/* Summary Stats */}
     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
       <div className="bg-white p-6 rounded-lg shadow-sm border">
         <p className="text-sm text-gray-500 font-medium">Total Volume</p>
         <p className="text-2xl font-bold text-gray-900">${financialData.totalRevenue.toLocaleString()}</p>
         <div className="mt-2 flex items-center text-sm text-emerald-600">
           <TrendingUp className="w-4 h-4 mr-1" />
           <span>12% from last month</span>
         </div>
       </div>
       <div className="bg-white p-6 rounded-lg shadow-sm border">
         <p className="text-sm text-gray-500 font-medium">Completed</p>
         <p className="text-2xl font-bold text-emerald-600">${financialData.completedAmount.toLocaleString()}</p>
       </div>
       <div className="bg-white p-6 rounded-lg shadow-sm border">
         <p className="text-sm text-gray-500 font-medium">Pending</p>
         <p className="text-2xl font-bold text-amber-600">${financialData.pendingAmount.toLocaleString()}</p>
       </div>
       <div className="bg-white p-6 rounded-lg shadow-sm border">
         <p className="text-sm text-gray-500 font-medium">Avg Transaction</p>
         <p className="text-2xl font-bold text-blue-600">${financialData.averageTransaction.toLocaleString()}</p>
       </div>
     </div>

     {/* Charts placeholder or simplified visualization */}
     <div className="bg-white p-6 rounded-lg shadow-sm border">
       <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Volume</h2>
       <div className="h-64 bg-gray-50 rounded-lg flex items-end justify-around p-4">
         {/* Simplified bar chart based on actual data */}
         {financialData.payments.slice(0, 10).map((p, i) => (
           <div key={i} className="flex flex-col items-center">
             <div 
               className="bg-teal-500 rounded-t w-8 transition-all" 
               style={{ height: `${(p.amount / (financialData.totalRevenue || 1)) * 200 + 20}px` }}
             ></div>
             <span className="text-[10px] text-gray-400 mt-2">#{p.id.slice(-4)}</span>
           </div>
         ))}
       </div>
     </div>
   </div>
 );
};