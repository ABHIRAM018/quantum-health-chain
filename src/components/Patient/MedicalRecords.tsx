import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Stethoscope, Pill, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { api } from '../../utils/api';
import { Patient, MedicalRecord, Prescription } from '../../types';

interface MedicalRecordsProps {
  user: Patient;
  onBack: () => void;
}

export const MedicalRecords: React.FC<MedicalRecordsProps> = ({ user, onBack }) => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'prescriptions'>('records');

  useEffect(() => {
    loadAll();
  }, [user.id]);

  const loadAll = async () => {
    try {
      const [recordsData, rxData] = await Promise.all([
        api.patients.getMedicalRecords(user.id, user.role),
        api.patients.getPrescriptions(user.id, user.role),
      ]);
      setRecords(recordsData);
      setPrescriptions(rxData);
    } catch (error) {
      console.error('Error loading medical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (record: MedicalRecord) => {
    const content = `Medical Record\n==============\nPatient: ${user.name}\nDate: ${new Date(record.createdAt).toLocaleDateString()}\nDoctor: ${record.doctorId}\n\nDiagnosis: ${record.diagnosis}\nPrescription: ${record.prescription}\nNotes: ${record.notes}\n\nAttachments: ${record.attachments.join(', ')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-record-${record.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPrescription = (rx: Prescription) => {
    const lines = [
      'Prescription', '============',
      `Patient: ${user.name}`,
      `Date: ${new Date(rx.createdAt).toLocaleDateString()}`,
      `Doctor: ${rx.doctorId}`,
      `Status: ${rx.status}`,
      `Refills: ${rx.refillsUsed} used / ${rx.refillsAllowed} allowed`,
      '', 'Medicines:',
      ...rx.medicines.map(m => `  - ${m.medicineName} ${m.dosage} | ${m.frequency} | ${m.duration}\n    Instructions: ${m.instructions}`),
      '', `Notes: ${rx.notes}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${rx.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusColor = (status: Prescription['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'completed') return 'bg-gray-100 text-gray-600';
    return 'bg-red-100 text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading medical data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
        <button onClick={onBack} className="text-blue-600 hover:text-blue-800 font-medium">
          Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'records' as const, label: 'Medical Records', count: records.length },
              { id: 'prescriptions' as const, label: 'Prescriptions', count: prescriptions.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedRecord(null); }}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* MEDICAL RECORDS TAB */}
        {activeTab === 'records' && (
          <div className="p-6">
            {records.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Medical Records</h3>
                <p className="text-gray-500">Your records will appear here after doctor visits.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {records.map(record => (
                    <div
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                        selectedRecord?.id === record.id
                          ? 'border-green-400 ring-2 ring-green-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-green-100 text-green-600 rounded-full">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{record.diagnosis}</h3>
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{record.prescription}</p>
                            <div className="flex items-center space-x-3 mt-2 text-xs text-gray-400">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Stethoscope className="w-3 h-3" />
                                <span>Dr. {record.doctorId}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDownload(record); }}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-200 min-h-[200px]">
                  {selectedRecord ? (
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Record Details</h2>
                        <button
                          onClick={() => handleDownload(selectedRecord)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date</p>
                          <p className="text-gray-900">{new Date(selectedRecord.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Doctor</p>
                          <p className="text-gray-900">Dr. {selectedRecord.doctorId}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Diagnosis</p>
                          <p className="text-gray-900">{selectedRecord.diagnosis}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center space-x-1">
                            <Pill className="w-3 h-3" /><span>Prescription</span>
                          </p>
                          <p className="text-gray-900">{selectedRecord.prescription}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-gray-900">{selectedRecord.notes}</p>
                        </div>
                        {selectedRecord.attachments.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attachments</p>
                            <div className="space-y-1">
                              {selectedRecord.attachments.map((att, i) => (
                                <div key={i} className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-200 text-sm text-gray-600">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <span>{att}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 flex items-center justify-center h-full text-gray-400 text-sm">
                      Select a record to view details
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRESCRIPTIONS TAB */}
        {activeTab === 'prescriptions' && (
          <div className="p-6">
            {prescriptions.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Prescriptions</h3>
                <p className="text-gray-500">Prescriptions from your doctor will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Prescription #{rx.id}</p>
                          <div className="flex items-center space-x-3 text-xs text-gray-400 mt-0.5">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(rx.createdAt).toLocaleDateString()}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Stethoscope className="w-3 h-3" />
                              <span>Dr. {rx.doctorId}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColor(rx.status)}`}>
                          {rx.status}
                        </span>
                        <button
                          onClick={() => handleDownloadPrescription(rx)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    {/* Medicines */}
                    <div className="px-5 py-4 space-y-3">
                      {rx.medicines.map(med => (
                        <div key={med.id} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="w-8 h-8 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                            Rx
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                              {med.medicineName}{' '}
                              <span className="font-normal text-gray-600">{med.dosage}</span>
                            </p>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{med.frequency}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{med.duration}</span>
                              </span>
                            </div>
                            {med.instructions && (
                              <p className="text-xs text-gray-400 mt-1 italic">{med.instructions}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    {(rx.notes || rx.refillsAllowed > 0) && (
                      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        {rx.notes && (
                          <p className="text-xs text-gray-500 italic">{rx.notes}</p>
                        )}
                        <div className="flex items-center space-x-1 text-xs text-gray-500 ml-auto">
                          <RefreshCw className="w-3 h-3" />
                          <span>Refills: {rx.refillsUsed} / {rx.refillsAllowed} used</span>
                          {rx.refillsUsed < rx.refillsAllowed && (
                            <CheckCircle className="w-3 h-3 text-green-500 ml-1" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};