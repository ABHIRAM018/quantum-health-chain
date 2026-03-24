import React, { useState } from 'react';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';
import { ClaimManagement } from '../Insurance/ClaimManagement';
import { InsuranceDashboard } from '../Dashboard/InsuranceDashboard';
import { ReportsAnalytics } from '../Insurance/ReportsAnalytics';
import { PolicyManagement } from '../Insurance/PolicyManagement';
import { PatientManagement } from '../Insurance/PatientManagement';
import { HospitalNetwork } from '../Insurance/HospitalNetwork';
import { InsuranceSettings } from '../Insurance/InsuranceSettings';
import { EnrollmentManagement } from '../Insurance/EnrollmentManagement';
import { Insurance } from '../../types';

interface InsurancePortalProps { user: Insurance; onLogout: () => void; }

export const InsurancePortal: React.FC<InsurancePortalProps> = ({ user, onLogout }) => {
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
      case 'dashboard':  return <InsuranceDashboard user={user} onPageChange={setCurrentPage} />;
      case 'claims':     return <ClaimManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'policies':   return <PolicyManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'reports':    return <ReportsAnalytics user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'patients':   return <PatientManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'hospitals':  return <HospitalNetwork user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'enrollments': return <EnrollmentManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'settings':   return <InsuranceSettings user={user} onBack={() => setCurrentPage('dashboard')} />;
      default:           return <InsuranceDashboard user={user} onPageChange={setCurrentPage} />;
    }
  };
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="insurance" currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
};