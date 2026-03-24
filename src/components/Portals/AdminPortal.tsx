import React, { useState } from 'react';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';
import { AdminDashboard } from '../Dashboard/AdminDashboard';
import { UserManagement } from '../Admin/UserManagement';
import { SystemSettings } from '../Admin/SystemSettings';
import { SystemLogs } from '../Admin/SystemLogs';
import { SecurityDashboard } from '../Admin/SecurityDashboard';
import { SecurityAlerts } from '../Admin/SecurityAlerts';
import { AdminReports } from '../Admin/AdminReports';
import { AdminSettings } from '../Admin/AdminSettings';
import { AdminBlockchainIssues } from '../Admin/AdminBlockchainIssues';
import { Admin } from '../../types';

interface AdminPortalProps { user: Admin; onLogout: () => void; }

export const AdminPortal: React.FC<AdminPortalProps> = ({ user, onLogout }) => {
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
      case 'dashboard':          return <AdminDashboard onPageChange={setCurrentPage} />;
      case 'users':              return <UserManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'system':             return <SystemSettings onBack={() => setCurrentPage('dashboard')} />;
      case 'logs':               return <SystemLogs user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'security':           return <SecurityDashboard user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'alerts':             return <SecurityAlerts onBack={() => setCurrentPage('dashboard')} />;
      case 'reports':            return <AdminReports user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'settings':           return <AdminSettings user={user} onBack={() => setCurrentPage('dashboard')} />;
      case 'blockchain-issues':  return <AdminBlockchainIssues onBack={() => setCurrentPage('dashboard')} />;
      default:                   return <AdminDashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="admin" currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  );
};