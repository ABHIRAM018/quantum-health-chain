import React, { useState } from 'react';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';
import { HospitalDashboard } from '../Dashboard/HospitalDashboard';
import { DoctorManagement } from '../Hospital/DoctorManagement';
import { RoomManagement } from '../Hospital/RoomManagement';
import { ServiceManagement } from '../Hospital/ServiceManagement';
import { PatientRecords } from '../Hospital/PatientRecords';
import { BillingManagement } from '../Hospital/BillingManagement';
import { HospitalMedicalRecordsArchive } from '../Hospital/MedicalRecordsArchive';
import { BookingManagement } from '../Hospital/BookingManagement';
import { Hospital } from '../../types';

// ── Hospital Settings (tabbed Room + Service management) ──────────────────
const HospitalSettings: React.FC<{ user: Hospital; onBack: () => void }> = ({ user, onBack }) => {
  const [tab, setTab] = React.useState<'rooms' | 'services'>('rooms');
  return (
    <div className="p-6 bg-gray-50 min-h-full space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage rooms and services</p>
        </div>
        <button onClick={onBack} className="text-violet-600 font-medium text-sm">&#8592; Back to Dashboard</button>
      </div>
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('rooms')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'rooms' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-900'
          }`}>Rooms</button>
        <button onClick={() => setTab('services')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'services' ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-900'
          }`}>Services</button>
      </div>
      {tab === 'rooms'    && <RoomManagement    user={user} />}
      {tab === 'services' && <ServiceManagement user={user} />}
    </div>
  );
};

interface HospitalPortalProps {
 user: Hospital;
 onLogout: () => void;
}

export const HospitalPortal: React.FC<HospitalPortalProps> = ({ user, onLogout }) => {
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
 case 'dashboard':
 return <HospitalDashboard user={user} onPageChange={setCurrentPage} />;
 case 'doctors':
 return <DoctorManagement user={user} />;
 case 'patients':
 return <PatientRecords user={user} />;
 case 'bills':
 return <BillingManagement user={user} />;
 case 'records':
 return <HospitalMedicalRecordsArchive user={user} onBack={() => setCurrentPage('dashboard')} />;
 case 'bookings':
        return <BookingManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
 case 'settings':
        return <HospitalSettings user={user} onBack={() => setCurrentPage('dashboard')} />;
 default:
 return <HospitalDashboard user={user} onPageChange={setCurrentPage} />;
 }
 };

 return (
 <div className="flex h-screen bg-gray-50">
 <Sidebar role="hospital" currentPage={currentPage} onPageChange={setCurrentPage} />
 <div className="flex-1 flex flex-col overflow-hidden">
 <Header user={user} onLogout={onLogout} />
 <main className="flex-1 overflow-y-auto">
 {renderPage()}
 </main>
 </div>
 </div>
 );
};