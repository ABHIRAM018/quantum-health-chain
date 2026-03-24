import React, { useState } from 'react';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';
import { DoctorDashboard } from '../Dashboard/DoctorDashboard';
import { AppointmentManagement } from '../Doctor/AppointmentManagement';
import { PatientTreatment } from '../Doctor/PatientTreatment';
import { PrescriptionManagement } from '../Doctor/PrescriptionManagement';
import { MedicalRecordsArchive } from '../Doctor/MedicalRecordsArchive';
import { DoctorProfile } from '../Doctor/DoctorProfile';
import { PatientConsents } from '../Doctor/PatientConsents';
import { Doctor } from '../../types';

interface DoctorPortalProps {
  user: Doctor;
  onLogout: () => void;
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [consentPatientId, setConsentPatientId]     = useState<string | undefined>();
  const [consentPatientName, setConsentPatientName] = useState<string | undefined>();

  // Listen for notification navigation events
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.page) {
        if (detail.page === 'records' && detail.patientId) {
          setConsentPatientId(detail.patientId);
          setConsentPatientName(detail.patientName);
        }
        setCurrentPage(detail.page);
      }
    };
    window.addEventListener('qhc:navigate', handler);
    return () => window.removeEventListener('qhc:navigate', handler);
  }, []);

  const handleCreatePrescription = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setCurrentPage('prescriptions');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DoctorDashboard user={user} onPageChange={setCurrentPage} />;
      case 'appointments':
        return <AppointmentManagement user={user} onBack={() => setCurrentPage('dashboard')} onCreatePrescription={handleCreatePrescription} />;
      case 'treatment':
        return <PatientTreatment user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'prescriptions':
        return (
          <PrescriptionManagement 
            user={user} 
            onBack={() => {
              setCurrentPage('dashboard');
              setSelectedAppointmentId(null);
            }} 
            initialAppointmentId={selectedAppointmentId}
          />
        );
      case 'records':
        return <MedicalRecordsArchive user={user} onBack={() => { setConsentPatientId(undefined); setConsentPatientName(undefined); setCurrentPage('dashboard'); }}
          initialPatientId={consentPatientId} initialPatientName={consentPatientName} />;
      case 'consents':
        return <PatientConsents user={user} onBack={() => setCurrentPage('dashboard')}
          onViewPatientRecords={(pid, pname) => { setConsentPatientId(pid); setConsentPatientName(pname); setCurrentPage('records'); }} />;
      case 'profile':
        return <DoctorProfile user={user} onBack={() => setCurrentPage('dashboard')} />;
      default:
        return <DoctorDashboard user={user} onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="doctor" currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};