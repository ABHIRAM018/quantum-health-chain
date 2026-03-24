import React, { useState, useEffect } from 'react';
import { FileText, Search, Filter, Download, Eye, Calendar, Building2 } from 'lucide-react';
import { api } from '../../utils/api';
import { Doctor, MedicalRecord } from '../../types';

interface MedicalRecordsArchiveProps {
  user: Doctor;
  onBack: () => void;
  initialPatientId?: string;
  initialPatientName?: string;
}

export const MedicalRecordsArchive: React.FC<MedicalRecordsArchiveProps> = ({ user, onBack, initialPatientId, initialPatientName }) => {
 const [records, setRecords] = useState<MedicalRecord[]>([]);
 const [consentedRecords, setConsentedRecords] = useState<MedicalRecord[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterDoctor, setFilterDoctor] = useState('');
 const [filterDepartment, setFilterDepartment] = useState('');
 const [filterPatient, setFilterPatient] = useState(initialPatientId ?? '');
 const [filterPatientName, setFilterPatientName] = useState(initialPatientName ?? '');
 const [dateRange, setDateRange] = useState({ start: '', end: '' });
 const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
 const [activeTab, setActiveTab] = useState<'my'|'consented'>(initialPatientId ? 'consented' : 'my');
 const [consents, setConsents] = useState<any[]>([]);

 const authHdr = (): Record<string,string> => {
   const t = localStorage.getItem('auth_token');
   return t ? { Authorization: `Bearer ${t}` } : {};
 };

 const [userNames, setUserNames] = React.useState<Record<string,string>>({});

 // Load user names — fetch patients + doctors (both accessible to all auth users)
 React.useEffect(() => {
   const loadNames = async () => {
     const map: Record<string,string> = {};
     try {
       const [pRes, dRes] = await Promise.all([
         fetch('/api/users/role/patient', { headers: authHdr() }),
         fetch('/api/users/role/doctor',  { headers: authHdr() }),
       ]);
       const patients = pRes.ok ? await pRes.json() : [];
       const doctors  = dRes.ok ? await dRes.json() : [];
       [...patients, ...doctors].forEach((u: any) => {
         map[u.id] = u.name ?? u.email ?? u.id;
       });
       setUserNames(map);
     } catch { /* use IDs as fallback */ }
   };
   loadNames();
 }, []);

 const displayName = (id: string, prefix = '') => {
   const name = userNames[id];
   if (!name) return id.slice(0, 8) + '...';
   // Don't add prefix if name already contains it
   if (prefix && name.toLowerCase().startsWith(prefix.toLowerCase().trim())) return name;
   return `${prefix}${name}`;
 };

 useEffect(() => {
   loadAll();
 }, [user.id]);

 const loadAll = async () => {
   try {
     // Load own records
     const myData = await api.doctors.getMedicalRecords(user.id, user.role);
     setRecords(myData);

     // Load active consents granted to this doctor
     const cRes = await fetch('/api/consents/granted-to-me', { headers: authHdr() });
     if (cRes.ok) {
       const cData = await cRes.json();
       setConsents(cData.filter((c: any) => {
         const status = c.status;
         const validUntil = new Date(c.valid_until ?? c.validUntil);
         return status === 'active' && validUntil > new Date();
       }));

       // Load medical records for each consented patient
       const patientIds = [...new Set(cData
         .filter((c: any) => c.status === 'active' && new Date(c.valid_until ?? c.validUntil) > new Date())
         .map((c: any) => c.patient_id ?? c.patientId)
       )];

       const allConsentedRecords: any[] = [];
       for (const pid of patientIds) {
         try {
           const rRes = await fetch(`/api/medical-records?patientId=${pid}`, { headers: authHdr() });
           if (rRes.ok) {
             const rData = await rRes.json();
             allConsentedRecords.push(...rData.map((r: any) => ({
               id: r.id, patientId: r.patient_id ?? r.patientId,
               doctorId: r.doctor_id ?? r.doctorId, diagnosis: r.diagnosis ?? '',
               prescription: r.prescription ?? '', notes: r.notes ?? '',
               attachments: r.attachments ?? [], createdAt: new Date(r.created_at ?? r.createdAt),
             })));
           }
         } catch { /* skip failed patient */ }
       }
       setConsentedRecords(allConsentedRecords);
     }
   } catch (error) {
     console.error('Error loading medical records:', error);
   } finally {
     setLoading(false);
   }
 };

 const handleDownload = (record: MedicalRecord) => {
 const content = `
${user.name} - MEDICAL RECORD
===============================
Record ID: ${record.id}
Patient ID: ${record.patientId}
Doctor ID: ${record.doctorId}
Date: ${new Date(record.createdAt).toLocaleDateString()}

DIAGNOSIS: ${record.diagnosis}

PRESCRIPTION: ${record.prescription}

CLINICAL NOTES: ${record.notes}

ATTACHMENTS: ${record.attachments.join(', ')}

Hospital: ${user.name}
Generated on: ${new Date().toLocaleDateString()}
 `;
 
 const blob = new Blob([content], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `hospital-record-${record.id}.txt`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 };

 const sourceRecords = activeTab === 'my' ? records
   : filterPatient
     ? consentedRecords.filter(r => r.patientId === filterPatient)
     : consentedRecords;

 const filteredRecords = sourceRecords.filter(record => {
 const matchesSearch = record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
 record.prescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
 record.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
 record.patientId.toLowerCase().includes(searchTerm.toLowerCase());
 
 const matchesDoctor = !filterDoctor || record.doctorId === filterDoctor;
 
 const recordDate = new Date(record.createdAt);
 const matchesDateRange = (!dateRange.start || recordDate >= new Date(dateRange.start)) &&
 (!dateRange.end || recordDate <= new Date(dateRange.end));
 
 return matchesSearch && matchesDoctor && matchesDateRange;
 });

 const uniqueDoctors = [...new Set(records.map(r => r.doctorId))];
 const departments = ['Cardiology', 'Orthopedics', 'Pulmonology', 'Emergency', 'Surgery'];

 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
 </div>
 );
 }

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Medical Records Archive</h1>
 <p className="text-gray-500">{activeTab === 'my' ? 'Your patients\' records' : `Consented patient records${filterPatientName ? ` — ${filterPatientName}` : ''}`}</p>
 </div>
 <button onClick={onBack} className="text-purple-600 hover:text-purple-600 font-medium">Back to Dashboard</button>
 </div>

 {/* Tabs */}
 <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
 <button onClick={() => setActiveTab('my')}
   className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'my' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
   My Records ({records.length})
 </button>
 <button onClick={() => setActiveTab('consented')}
   className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'consented' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}>
   Consented Patients ({consentedRecords.length}) {consents.length > 0 && <span className="ml-1 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full">{consents.length} active</span>}
 </button>
 </div>

 {/* Search and Filters */}
 <div className="bg-white p-6 rounded-xl border border-gray-200 ">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
 
 <div className="relative">
 <Filter className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
 <select
 value={filterDoctor}
 onChange={(e) => setFilterDoctor(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 >
 <option value="">All Doctors</option>
 {uniqueDoctors.map(doctorId => (
 <option key={doctorId} value={doctorId}>Dr. {doctorId}</option>
 ))}
 </select>
 </div>
 
 <div>
 <select
 value={filterDepartment}
 onChange={(e) => setFilterDepartment(e.target.value)}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 >
 <option value="">All Departments</option>
 {departments.map(dept => (
 <option key={dept} value={dept}>{dept}</option>
 ))}
 </select>
 </div>
 
 <div>
 <input
 type="date"
 placeholder="Start Date"
 value={dateRange.start}
 onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <input
 type="date"
 placeholder="End Date"
 value={dateRange.end}
 onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Records List */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">
 Medical Records ({filteredRecords.length})
 </h2>
 </div>
 <div className="p-6 max-h-96 overflow-y-auto">
 {filteredRecords.length === 0 ? (
 <div className="text-center py-8">
 <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
 <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
 <p className="text-gray-500">No medical records match your search criteria.</p>
 </div>
 ) : (
 <div className="space-y-4">
 {filteredRecords.map((record) => (
 <div
 key={record.id}
 className={`p-4 rounded-lg cursor-pointer transition-colors ${
 selectedRecord?.id === record.id
 ? 'bg-purple-100 border-2 border-purple-500'
 : 'bg-gray-50 hover:bg-gray-100'
 }`}
 onClick={() => setSelectedRecord(record)}
 >
 <div className="flex items-start justify-between">
 <div className="flex items-start space-x-3">
 <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
 <FileText className="w-4 h-4" />
 </div>
 <div className="flex-1">
 <h3 className="font-medium text-gray-900">{record.diagnosis}</h3>
 <p className="text-sm text-gray-500">Patient: {displayName(record.patientId)}</p>
 <p className="text-sm text-gray-500">Doctor: {displayName(record.doctorId, "Dr. ")}</p>
 <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
 <div className="flex items-center space-x-1">
 <Calendar className="w-3 h-3" />
 <span>{new Date(record.createdAt).toLocaleDateString()}</span>
 </div>
 <div className="flex items-center space-x-1">
 <FileText className="w-3 h-3" />
 <span>{record.attachments.length} files</span>
 </div>
 </div>
 </div>
 </div>
 <div className="flex space-x-1">
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedRecord(record);
 }}
 className="text-purple-600 hover:text-purple-600 p-1"
 title="View Details"
 >
 <Eye className="w-4 h-4" />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDownload(record);
 }}
 className="text-blue-600 hover:text-blue-600 p-1"
 title="Download Record"
 >
 <Download className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Record Details */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Record Details</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 {selectedRecord ? (
 <div className="space-y-6">
 <div className="bg-purple-50 p-4 rounded-lg">
 <h3 className="font-medium text-purple-900 mb-2">Record Information</h3>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <p><strong>Record ID:</strong> {selectedRecord.id}</p>
 <p><strong>Patient:</strong> {displayName(selectedRecord.patientId)}</p>
 </div>
 <div>
 <p><strong>Doctor:</strong> {displayName(selectedRecord.doctorId, "Dr. ")}</p>
 <p><strong>Date:</strong> {new Date(selectedRecord.createdAt).toLocaleDateString()}</p>
 </div>
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 <Building2 className="w-4 h-4 inline mr-1" />
 Diagnosis
 </label>
 <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRecord.diagnosis}</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Treatment & Prescription
 </label>
 <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRecord.prescription}</p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Clinical Notes
 </label>
 <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRecord.notes}</p>
 </div>

 {selectedRecord.attachments.length > 0 && (
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Medical Documents
 </label>
 <div className="space-y-2">
 {selectedRecord.attachments.map((attachment, index) => (
 <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
 <div className="flex items-center space-x-2">
 <FileText className="w-4 h-4 text-gray-500" />
 <span className="text-sm text-gray-600">{attachment}</span>
 </div>
 <button onClick={() => { window.print(); }} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
 View
 </button>
 </div>
 ))}
 </div>
 </div>
 )}

 <div className="pt-4 space-y-2">
 <button
 onClick={() => handleDownload(selectedRecord)}
 className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
 >
 <Download className="w-4 h-4" />
 <span>Download Record</span>
 </button>
 <button onClick={() => { window.print(); }} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
 Share with Doctor
 </button>
 </div>
 </div>
 ) : (
 <div className="text-center py-8 text-gray-500">
 Select a record to view details
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Archive Statistics */}
 <div className="bg-white rounded-xl border border-gray-200 ">
 <div className="p-6 border-b border-gray-200">
 <h2 className="text-lg font-semibold text-gray-900">Archive Overview</h2>
 </div>
 <div className="p-6 bg-gray-50 min-h-full">
 <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
 <div className="text-center">
 <p className="text-2xl font-bold text-purple-600">{records.length}</p>
 <p className="text-sm text-gray-500">Total Records</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-blue-600">{new Set(records.map(r => r.patientId)).size}</p>
 <p className="text-sm text-gray-500">Patients</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-green-600">{uniqueDoctors.length}</p>
 <p className="text-sm text-gray-500">Doctors</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-orange-600">
 {records.reduce((sum, r) => sum + r.attachments.length, 0)}
 </p>
 <p className="text-sm text-gray-500">Documents</p>
 </div>
 <div className="text-center">
 <p className="text-2xl font-bold text-red-600">
 {records.filter(r => new Date(r.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
 </p>
 <p className="text-sm text-gray-500">Last 30 Days</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};