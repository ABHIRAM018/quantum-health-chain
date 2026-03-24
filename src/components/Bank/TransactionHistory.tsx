import React, { useState, useEffect } from 'react';
import { Search, Download, TrendingUp, ArrowUpRight, Clock } from 'lucide-react';
import { api } from '../../utils/api';
import { Bank, Payment } from '../../types';

interface TransactionHistoryProps {
 user: Bank;
 onBack: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ user, onBack }) => {
 const [payments, setPayments] = useState<Payment[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterStatus, setFilterStatus] = useState('');
 const [dateRange, setDateRange] = useState({ start: '', end: '' });

 useEffect(() => {
  loadPayments();
 }, [user.id]);

 const loadPayments = async () => {
  try {
   const data = await api.bank.getPayments(user.id, user.role);
   setPayments(data);
  } catch (error) {
   console.error('Error loading payments:', error);
  } finally {
   setLoading(false);
  }
 };

 const filteredPayments = payments.filter(p => {
  const matchesSearch = !searchTerm || 
   p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
   p.claimId.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = !filterStatus || p.status === filterStatus;
  
  return matchesSearch && matchesStatus;
 });

 const handleDownload = () => {
  const content = `TRANSACTION HISTORY\nGenerated: ${new Date().toLocaleString()}\n\n` +
   payments.map(p => `ID: ${p.id} | Claim: ${p.claimId} | Amount: $${p.amount} | Status: ${p.status} | Date: ${new Date(p.createdAt).toLocaleDateString()}`).join('\n');
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${user.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
 };

 const getTransactionIcon = (status: string) => {
  switch (status) {
   case 'completed': return <ArrowUpRight className="w-5 h-5 text-emerald-600" />;
   case 'processed': return <ArrowUpRight className="w-5 h-5 text-blue-600" />;
   case 'pending': return <Clock className="w-5 h-5 text-amber-600" />;
   default: return <ArrowUpRight className="w-5 h-5 text-gray-600" />;
  }
 };

 if (loading) {
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
     <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
     <p className="text-gray-600">View and manage all payment transactions</p>
    </div>
    <div className="flex space-x-2">
     <button
      onClick={handleDownload}
      className="bg-white text-gray-700 px-4 py-2 rounded-lg border hover:bg-gray-50 flex items-center space-x-2 shadow-sm transition-colors"
     >
      <Download className="w-4 h-4" />
      <span>Export History</span>
     </button>
     <button
      onClick={onBack}
      className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center space-x-2 shadow-sm transition-colors"
     >
      <span>Back to Dashboard</span>
     </button>
    </div>
   </div>

   {/* Filters */}
   <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
     <div className="relative">
      <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
       type="text"
       placeholder="Search transactions..."
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
      />
     </div>
     
     <select
      value={filterStatus}
      onChange={(e) => setFilterStatus(e.target.value)}
      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
     >
      <option value="">All Statuses</option>
      <option value="pending">Pending</option>
      <option value="processed">Processed</option>
      <option value="completed">Completed</option>
      <option value="failed">Failed</option>
     </select>

     <input
      type="date"
      value={dateRange.start}
      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
     />
     <input
      type="date"
      value={dateRange.end}
      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
     />
    </div>
   </div>

   {/* Transaction List */}
   <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
    <div className="overflow-x-auto">
     <table className="w-full text-left">
      <thead className="bg-gray-50 border-b">
       <tr>
        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction Details</th>
        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Reference</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
       {filteredPayments.map((p) => (
        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
         <td className="px-6 py-4">
          <div className="flex items-center">
           <div className={`p-2 rounded-lg mr-4 ${
            p.status === 'completed' ? 'bg-emerald-100' :
            p.status === 'processed' ? 'bg-blue-100' :
            'bg-amber-100'
           }`}>
            {getTransactionIcon(p.status)}
           </div>
           <div>
            <p className="font-medium text-gray-900">Claim Payment</p>
            <p className="text-xs text-gray-500">Claim ID: {p.claimId}</p>
           </div>
          </div>
         </td>
         <td className="px-6 py-4">
          <span className="font-bold text-gray-900">${p.amount.toLocaleString()}</span>
         </td>
         <td className="px-6 py-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
           p.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
           p.status === 'processed' ? 'bg-blue-100 text-blue-800' :
           'bg-amber-100 text-amber-800'
          }`}>
           {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
          </span>
         </td>
         <td className="px-6 py-4 text-sm text-gray-500">
          {new Date(p.createdAt).toLocaleDateString()}
         </td>
         <td className="px-6 py-4 text-right text-xs font-mono text-gray-400">
          {p.id}
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
    {filteredPayments.length === 0 && (
     <div className="p-12 text-center">
      <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500">No transactions found matching your criteria</p>
     </div>
    )}
   </div>
  </div>
 );
};