import React, { useState } from 'react';
import { Header } from '../Layout/Header';
import { Sidebar } from '../Layout/Sidebar';
import { PaymentProcessing } from '../Bank/PaymentProcessing';
import { BankDashboard } from '../Dashboard/BankDashboard';
import { TransactionHistory } from '../Bank/TransactionHistory';
import { AccountManagement } from '../Bank/AccountManagement';
import { FinancialReports } from '../Bank/FinancialReports';
import { MedicalLoansManagement } from '../Bank/MedicalLoans';
import { RefundHandling } from '../Bank/RefundHandling';
import { Bank } from '../../types';

interface BankPortalProps { user: Bank; onLogout: () => void; }

export const BankPortal: React.FC<BankPortalProps> = ({ user, onLogout }) => {
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
 case 'dashboard': return <BankDashboard user={user} onPageChange={setCurrentPage} />;
 case 'payments': return <PaymentProcessing user={user} onBack={() => setCurrentPage('dashboard')} />;
 case 'transactions': return <TransactionHistory user={user} onBack={() => setCurrentPage('dashboard')} />;
 case 'loans': return <MedicalLoansManagement user={user} onBack={() => setCurrentPage('dashboard')} />;
 case 'refunds': return <RefundHandling user={user} onBack={() => setCurrentPage('dashboard')} />;
 case 'accounts': return <AccountManagement onBack={() => setCurrentPage('dashboard')} />;
 case 'reports': return <FinancialReports user={user} onBack={() => setCurrentPage('dashboard')} />;
 default: return <BankDashboard user={user} onPageChange={setCurrentPage} />;
 }
 };
 return (
 <div className="flex h-screen bg-gray-50">
 <Sidebar role="bank" currentPage={currentPage} onPageChange={setCurrentPage} />
 <div className="flex-1 flex flex-col overflow-hidden">
 <Header user={user} onLogout={onLogout} />
 <main className="flex-1 overflow-y-auto">{renderPage()}</main>
 </div>
 </div>
 );
};