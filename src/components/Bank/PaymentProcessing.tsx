import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { api } from '../../utils/api';
import { Bank, Payment } from '../../types';

interface PaymentProcessingProps {
 user: Bank;
 onBack: () => void;
}

export const PaymentProcessing: React.FC<PaymentProcessingProps> = ({ user, onBack }) => {
 const [payments, setPayments] = useState<Payment[]>([]);
 const [loading, setLoading] = useState(true);
 const [processing, setProcessing] = useState<string | null>(null);

 useEffect(() => {
 loadPayments();
 }, [user.id]);

 const loadPayments = async () => {
 try {
 const paymentsData = await api.bank.getPayments(user.id, user.role);
 setPayments(paymentsData);
 } catch (error) {
 console.error('Error loading payments:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleProcessPayment = async (paymentId: string) => {
 setProcessing(paymentId);
 try {
 await api.bank.processPayment(paymentId, user.id, user.role);
 await loadPayments();
 alert('Payment processed successfully!');
 } catch (error) {
 console.error('Error processing payment:', error);
 alert('Error processing payment');
 } finally {
 setProcessing(null);
 }
 };

 const handleCompletePayment = async (paymentId: string) => {
 setProcessing(paymentId);
 try {
 await api.bank.completePayment(paymentId, user.id, user.role);
 await loadPayments();
 alert('Payment completed successfully!');
 } catch (error) {
 console.error('Error completing payment:', error);
 alert('Error completing payment');
 } finally {
 setProcessing(null);
 }
 };

 const handleDownloadReceipt = (payment: Payment) => {
 const content = `
PAYMENT RECEIPT
---------------
Payment ID: ${payment.id}
Claim ID: ${payment.claimId}
Hospital ID: ${payment.hospitalId}
Amount: $${payment.amount}
Status: ${payment.status.toUpperCase()}
Date: ${new Date(payment.createdAt).toLocaleDateString()}
---------------
Quantum Health Chain — Secure Payment Verification
 `;
 
 const blob = new Blob([content], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `payment-receipt-${payment.id}.txt`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading payments...</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <h1 className="text-2xl font-bold text-gray-900">Payment Processing</h1>
 <button
 onClick={onBack}
 className="text-teal-600 hover:text-teal-600 font-medium"
 >
 Back to Dashboard
 </button>
 </div>

 {/* Payment Stats */}
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
 <p className="text-3xl font-bold text-yellow-600">
 {payments.filter(p => p.status === 'pending').length}
 </p>
 </div>
 <Clock className="w-8 h-8 text-yellow-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Processed</p>
 <p className="text-3xl font-bold text-blue-600">
 {payments.filter(p => p.status === 'processed').length}
 </p>
 </div>
 <CreditCard className="w-8 h-8 text-blue-600" />
 </div>
 </div>

 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">Completed</p>
 <p className="text-3xl font-bold text-green-600">
 {payments.filter(p => p.status === 'completed').length}
 </p>
 </div>
 <CheckCircle className="w-8 h-8 text-green-600" />
 </div>
 </div>
 </div>

 {/* Payments List */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Payment Requests</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {payments.length === 0 ? (
 <div className="text-center py-8">
 <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments</h3>
 <p className="text-gray-500">No payment requests found.</p>
 </div>
 ) : (
 <div className="space-y-4">
 {payments.map((payment) => (
 <div key={payment.id} className="bg-gray-50 rounded-lg p-4">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3">
 <div className={`p-2 rounded-full ${
 payment.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
 payment.status === 'processed' ? 'bg-blue-100 text-blue-600' :
 payment.status === 'completed' ? 'bg-green-100 text-green-600' :
 'bg-red-100 text-red-600'
 }`}>
 {payment.status === 'completed' ? <CheckCircle className="w-4 h-4" /> :
 payment.status === 'failed' ? <XCircle className="w-4 h-4" /> :
 payment.status === 'processed' ? <CreditCard className="w-4 h-4" /> :
 <Clock className="w-4 h-4" />}
 </div>
 <div className="flex-1">
 <h3 className="font-medium text-gray-900">Payment #{payment.id}</h3>
 <p className="text-sm text-gray-500">Claim: {payment.claimId}</p>
 <p className="text-sm text-gray-500">Hospital: {payment.hospitalId}</p>
 <p className="text-lg font-bold text-teal-600">${payment.amount}</p>
 {payment.transactionId && (
 <p className="text-xs text-gray-500">TXN: {payment.transactionId}</p>
 )}
 <p className="text-xs text-gray-500">
 Created: {new Date(payment.createdAt).toLocaleDateString()}
 </p>
 </div>
 </div>
 
 <div className="flex flex-col items-end space-y-2">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 payment.status === 'pending' ? 'bg-yellow-100 text-amber-300' :
 payment.status === 'processed' ? 'bg-blue-100 text-blue-300' :
 payment.status === 'completed' ? 'bg-green-100 text-emerald-300' :
 'bg-red-100 text-red-300'
 }`}>
 {payment.status}
 </span>
 
 <div className="flex space-x-2">
 {payment.status === 'pending' && (
 <button
 onClick={() => handleProcessPayment(payment.id)}
 disabled={processing === payment.id}
 className="bg-blue-600 text-gray-900 px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
 >
 {processing === payment.id ? 'Processing...' : 'Process'}
 </button>
 )}
 
 {payment.status === 'processed' && (
 <button
 onClick={() => handleCompletePayment(payment.id)}
 disabled={processing === payment.id}
 className="bg-green-600 text-gray-900 px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
 >
 {processing === payment.id ? 'Completing...' : 'Complete'}
 </button>
 )}
 
 {payment.status === 'completed' && (
 <button
 onClick={() => handleDownloadReceipt(payment)}
 className="bg-teal-600 text-gray-900 px-3 py-1 rounded text-xs hover:bg-teal-700 flex items-center space-x-1"
 >
 <Download className="w-3 h-3" />
 <span>Receipt</span>
 </button>
 )}
 </div>
 </div>
 </div>
 
 {payment.receipt && (
 <div className="mt-3 p-2 bg-green-50 rounded text-sm text-emerald-300">
 {payment.receipt}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
};