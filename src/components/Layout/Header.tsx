import React from 'react';
import { User, LogOut } from 'lucide-react';
import { User as UserType } from '../../types';
import { NotificationCenter } from '../Shared/NotificationCenter';

interface HeaderProps {
 user: UserType;
 onLogout: () => void;
}

const roleColors: Record<string, string> = {
 patient: 'from-blue-600 to-blue-700',
 doctor: 'from-emerald-600 to-emerald-700',
 hospital: 'from-violet-600 to-violet-700',
 insurance: 'from-orange-600 to-orange-700',
 bank: 'from-teal-600 to-teal-700',
 admin: 'from-red-600 to-red-700',
 regulator: 'from-indigo-600 to-indigo-700',
};

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
 return (
 <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${roleColors[user.role] || 'from-gray-500 to-gray-600'}`} />
 <h1 className="text-gray-900 font-semibold text-base">Quantum Health Chain</h1>
 <span className="text-gray-500 text-xs capitalize">/ {user.role} Portal</span>
 </div>
 <div className="flex items-center gap-2">
 <NotificationCenter userId={user.id} />
 <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
 <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[user.role] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
 <User className="w-4 h-4 text-white" />
 </div>
 <div>
 <p className="text-gray-900 text-sm font-medium leading-tight">{user.name}</p>
 <p className="text-gray-500 text-xs capitalize">{user.role}</p>
 </div>
 <button onClick={onLogout} className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="Logout">
 <LogOut className="w-4 h-4" />
 </button>
 </div>
 </div>
 </header>
 );
};