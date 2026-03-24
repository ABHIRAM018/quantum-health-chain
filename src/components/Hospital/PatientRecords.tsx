import React, { useState, useEffect } from 'react';
import { 
 FileText, Upload, Send, Search,
 Bed
} from 'lucide-react';
import { api } from '../../utils/api';
import { Hospital, PatientAdmission, LabReport, Bill } from '../../types';

interface PatientRecordsProps {
 user: Hospital;
}

export const PatientRecords: React.FC<PatientRecordsProps> = ({ user }) => {
 const [admissions, setAdmissions] = useState<PatientAdmission[]>([]);
 const [labReports, setLabReports] = useState<LabReport[]>([]);
 const [bills, setBills] = useState<Bill[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState('admissions');
 const [searchTerm, setSearchTerm] = useState('');

 useEffect(() => {
 loadData();
 }, [user.id]);

 const loadData = async () => {
 try {
 const [admissionsData, labReportsData, billsData] = await Promise.all([
        api.hospitals.getAdmissions(user.id),
        api.hospitals.getLabReports(user.id),
        api.hospitals.getBills(user.id, user.role),
      ]);
      setAdmissions(admissionsData as any[]);
      setLabReports(labReportsData as any[]);
      setBills(billsData as any[]);
 } catch (error) {
 console.error('Error loading patient data:', error);
 } finally {
 setLoading(false);
 }
 };

 const handleForwardClaim = async (billId: string) => {
 try {
 await api.hospitals.forwardClaim(billId, user.id, user.role);
 await loadData();
 alert('Claim forwarded to insurance successfully!');
 } catch (error) {
 console.error('Error forwarding claim:', error);
 alert('Error forwarding claim');
 }
 };

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-gray-500">Loading patient records...</div>
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Patient Records</h1>
 <p className="text-gray-500">Manage patient admissions, lab reports, and billing</p>
 </div>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8 px-6">
 {[
 { id: 'admissions', label: 'Admissions', count: admissions.length },
 { id: 'labs', label: 'Lab Reports', count: labReports.length },
 { id: 'bills', label: 'Bills', count: bills.length },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`py-4 px-1 border-b-2 font-medium text-sm ${
 activeTab === tab.id
 ? 'border-purple-500 text-purple-600'
 : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300'
 }`}
 >
 {tab.label} ({tab.count})
 </button>
 ))}
 </nav>
 </div>

 {/* Search */}
 <div className="p-4 border-b border-gray-200">
 <div className="relative">
 <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
 <input
 type="text"
 placeholder="Search records..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 />
 </div>
 </div>

 {/* Content */}
 <div className="p-6 bg-gray-50 min-h-full">
 {activeTab === 'admissions' && (
 <div className="space-y-4">
 {admissions.map((admission) => (
 <div key={admission.id} className="p-4 bg-blue-50 rounded-lg">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3">
 <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
 <Bed className="w-4 h-4" />
 </div>
 <div>
 <h3 className="font-medium text-gray-900">Patient {admission.patientId}</h3>
 <p className="text-sm text-gray-500">{admission.reason}</p>
 <p className="text-xs text-gray-500">
 Admitted: {new Date(admission.admissionDate).toLocaleDateString()}
 </p>
 <p className="text-xs text-gray-500">Room: {admission.roomId}</p>
 </div>
 </div>
 <div className="flex flex-col items-end space-y-2">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 admission.status === 'admitted' ? 'bg-green-100 text-green-800' :
 admission.status === 'discharged' ? 'bg-gray-100 text-gray-800' :
 'bg-yellow-100 text-yellow-800'
 }`}>
 {admission.status}
 </span>
 {admission.status === 'admitted' && (
 <button
 onClick={async () => {
   try {
     await api.hospitals.dischargePatient(admission.id, user.id, user.role);
     await loadData();
     alert('Patient discharged successfully!');
   } catch (error) {
     console.error('Error discharging patient:', error);
     alert('Error discharging patient');
   }
 }}
 className="bg-red-600 text-gray-900 px-3 py-1 rounded text-xs hover:bg-red-700"
 >
 Discharge
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {activeTab === 'labs' && (
 <div className="space-y-4">
 {labReports.map((report) => (
 <div key={report.id} className="p-4 bg-green-50 rounded-lg">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3">
 <div className="p-2 bg-green-100 text-green-600 rounded-full">
 <FileText className="w-4 h-4" />
 </div>
 <div>
 <h3 className="font-medium text-gray-900">{report.testType}</h3>
 <p className="text-sm text-gray-500">Patient: {report.patientId}</p>
 <p className="text-sm text-gray-500">Results: {report.results}</p>
 <p className="text-xs text-gray-500">
 Date: {new Date(report.testDate).toLocaleDateString()}
 </p>
 </div>
 </div>
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 report.status === 'completed' ? 'bg-green-100 text-green-800' :
 report.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
 'bg-yellow-100 text-yellow-800'
 }`}>
 {report.status}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}

 {activeTab === 'bills' && (
 <div className="space-y-4">
 {bills.map((bill) => (
 <div key={bill.id} className="p-4 bg-orange-50 rounded-lg">
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3">
 <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
 <Upload className="w-4 h-4" />
 </div>
 <div>
 <h3 className="font-medium text-gray-900">Bill #{bill.id}</h3>
 <p className="text-sm text-gray-500">Patient: {bill.patientId}</p>
 <p className="text-sm text-gray-500">Amount: ${bill.amount}</p>
 <p className="text-xs text-gray-500">
 Date: {new Date(bill.createdAt).toLocaleDateString()}
 </p>
 </div>
 </div>
 <div className="flex items-center space-x-2">
 <span className={`px-2 py-1 rounded-full text-xs font-medium ${
 bill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
 bill.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
 bill.status === 'approved' ? 'bg-green-100 text-green-800' :
 'bg-gray-100 text-gray-800'
 }`}>
 {bill.status}
 </span>
 {bill.status === 'pending' && (
 <button
 onClick={() => handleForwardClaim(bill.id)}
 className="bg-purple-600 text-gray-900 px-3 py-1 rounded text-xs hover:bg-purple-700 flex items-center space-x-1"
 >
 <Send className="w-3 h-3" />
 <span>Forward Claim</span>
 </button>
 )}
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Forms would go here - abbreviated for space */}
 {/* Admit Patient Form, Lab Report Form, and Bill Form modals */}
 </div>
 );
};