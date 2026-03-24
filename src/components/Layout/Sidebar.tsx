import React from 'react';
import {
 Home, Calendar, FileText, CreditCard, Shield,
 DollarSign, Users, Activity, Settings, Stethoscope,
 Building2, UserCheck, Banknote, Pill, RotateCcw,
 AlertTriangle, Lock, Scale, ShieldCheck
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
 role: UserRole;
 currentPage: string;
 onPageChange: (page: string) => void;
}

const menuItems: Record<string, { id: string; label: string; icon: any }[]> = {
 patient: [
 { id: 'dashboard', label: 'Dashboard', icon: Home },
 { id: 'appointments', label: 'Appointments', icon: Calendar },
 { id: 'records', label: 'Medical Records', icon: FileText },
 { id: 'bills', label: 'Bills & Claims', icon: CreditCard },
 { id: 'consent', label: 'Consent', icon: Shield },
 { id: 'health', label: 'Health Monitor', icon: Activity },
 { id: 'insurance', label: 'Insurance Plans', icon: Shield },
 { id: 'hospital-booking', label: 'Rooms & Services', icon: Building2 },
 { id: 'profile', label: 'Profile', icon: Settings },
 ],
 doctor: [
 { id: 'dashboard', label: 'Dashboard', icon: Home },
 { id: 'appointments', label: 'Appointments', icon: Calendar },
 { id: 'treatment', label: 'Treatment', icon: Activity },
 { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
 { id: 'records',  label: 'Medical Records', icon: FileText    },
 { id: 'consents', label: 'Patient Consents', icon: ShieldCheck },
 { id: 'profile',  label: 'Profile',          icon: Settings    },
 ],
 hospital: [
 { id: 'dashboard', label: 'Dashboard', icon: Home },
 { id: 'doctors', label: 'Doctors', icon: Stethoscope },
 { id: 'patients', label: 'Patients', icon: Users },
 { id: 'bills', label: 'Bills', icon: CreditCard },
 { id: 'records', label: 'Records', icon: FileText },
 { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'settings', label: 'Rooms & Services', icon: Settings },
 ],
 insurance: [
 { id: 'dashboard', label: 'Dashboard', icon: Home },
 { id: 'claims', label: 'Claims', icon: Shield },
 { id: 'policies', label: 'Policies', icon: FileText },
 { id: 'patients', label: 'Patients', icon: Users },
 { id: 'hospitals', label: 'Hospitals', icon: Building2 },
 { id: 'reports', label: 'Reports', icon: Activity },
 { id: 'settings', label: 'Settings', icon: Settings },
 ],
 bank: [
 { id: 'dashboard', label: 'Dashboard', icon: Home },
 { id: 'payments', label: 'Payments', icon: DollarSign },
 { id: 'transactions', label: 'Transactions', icon: Banknote },
 
 { id: 'refunds', label: 'Refunds', icon: RotateCcw },
 { id: 'accounts', label: 'Accounts', icon: UserCheck },
 { id: 'reports', label: 'Reports', icon: FileText },
 ],
 admin: [
 { id: 'dashboard', label: 'Dashboard', icon: Home },
 { id: 'users', label: 'Users', icon: Users },
 { id: 'system', label: 'System', icon: Activity },
 { id: 'logs', label: 'Logs', icon: FileText },
 { id: 'security', label: 'Security', icon: Lock },
 { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
 { id: 'reports', label: 'Reports', icon: Shield },
 { id: 'settings', label: 'Settings', icon: Settings },
 ],
 regulator: [
 { id: 'dashboard', label: 'Dashboard', icon: Home },
 { id: 'audit', label: 'Audit Trail', icon: FileText },
 { id: 'compliance', label: 'Compliance', icon: Scale },
 { id: 'blockchain', label: 'Blockchain', icon: Shield },
 { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
 ],
};

const roleGradients: Record<string, string> = {
 patient: 'from-blue-600 to-blue-700',
 doctor: 'from-emerald-600 to-emerald-700',
 hospital: 'from-violet-600 to-violet-700',
 insurance: 'from-orange-600 to-orange-700',
 bank: 'from-teal-600 to-teal-700',
 admin: 'from-red-600 to-red-700',
 regulator: 'from-indigo-600 to-indigo-700',
};

const roleActiveColor: Record<string, string> = {
 patient: 'bg-green-700 text-white border-green-600',
 doctor: 'bg-green-700 text-white border-green-600',
 hospital: 'bg-green-700 text-white border-green-600',
 insurance: 'bg-green-700 text-white border-green-600',
 bank: 'bg-green-700 text-white border-green-600',
 admin: 'bg-green-700 text-white border-green-600',
 regulator: 'bg-green-700 text-white border-green-600',
};

export const Sidebar: React.FC<SidebarProps> = ({ role, currentPage, onPageChange }) => {
 const items = menuItems[role] || [];

 return (
 <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
 {/* Logo */}
 <div className="p-5 border-b border-gray-800">
 <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleGradients[role] || 'from-gray-600 to-gray-700'} flex items-center justify-center mb-2`}>
 <Shield className="w-4 h-4 text-white" />
 </div>
 <p className="text-white font-semibold text-sm leading-tight">QHC</p>
 <p className="text-gray-500 text-xs capitalize">{role} Portal</p>
 </div>

 {/* Nav */}
 <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
 {items.map(item => {
 const Icon = item.icon;
 const isActive = currentPage === item.id;
 return (
 <button
 key={item.id}
 onClick={() => onPageChange(item.id)}
 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
 isActive
 ? `${roleActiveColor[role]} border`
 : 'text-gray-300 hover:text-white hover:bg-gray-700 border-transparent'
 }`}
 >
 <Icon className="w-4 h-4 shrink-0" />
 <span className="truncate">{item.label}</span>
 </button>
 );
 })}
 </nav>

 {/* Footer */}
 <div className="p-3 border-t border-gray-800">
 <p className="text-gray-400 text-xs text-center">Quantum Health Chain</p>
 <p className="text-gray-300 text-xs text-center">v2.0 · Secured</p>
 </div>
 </div>
 );
};