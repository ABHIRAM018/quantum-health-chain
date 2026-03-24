import React, { useState } from 'react';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';
import { PatientDashboard } from '../Dashboard/PatientDashboard';
import { AppointmentBooking } from '../Patient/AppointmentBooking';
import { MedicalRecords } from '../Patient/MedicalRecords';
import { BillsAndClaims } from '../Patient/BillsAndClaims';
import { ProfileManagement } from '../Patient/ProfileManagement';
import { HealthMonitoring } from '../Patient/HealthMonitoring';
import { ConsentManagement } from '../Patient/ConsentManagement';
import { InsurancePlans } from '../Patient/InsurancePlans';
import { HospitalBooking } from '../Patient/HospitalBooking';
import { Patient } from '../../types';

interface PatientPortalProps { user: Patient; onLogout: () => void; }

export const PatientPortal: React.FC<PatientPortalProps> = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  React.useEffect(() => {
    const handler = (e: Event) => {
      const page = (e as CustomEvent).detail?.page;
      if (page) setCurrentPage(page);
    };
    window.addEventListener('qhc:navigate', handler);
    return () => window.removeEventListener('qhc:navigate', handler);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':    return <PatientDashboard user={user} onPageChange={setCurrentPage} />;
      case 'appointments': return <AppointmentBooking user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'records':      return <MedicalRecords user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'bills':        return <BillsAndClaims user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'consent':      return <ConsentManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'health':       return <HealthMonitoring user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'insurance':    return <InsurancePlans user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'hospital-booking': return <HospitalBooking user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'profile':      return <ProfileManagement user={user} onBack={() => setCurrentPage('dashboard')} onPageChange={setCurrentPage} />;
      default:             return <PatientDashboard user={user} onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="patient" currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
};