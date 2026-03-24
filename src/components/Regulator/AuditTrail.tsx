import React, { useState, useEffect } from 'react';
import { FileText, Search, Download } from 'lucide-react';
import { Regulator } from '../../types';
import { api } from '../../utils/api';

interface AuditTrailProps { user: Regulator; onBack: () => void; }

export const AuditTrail: React.FC<AuditTrailProps> = ({ user, onBack }) => {
 const [search, setSearch] = useState('');
 const [roleFilter, setRoleFilter] = useState('all');
 const [systemLogs, setSystemLogs] = useState<any[]>([]);
 const [_loading, setLoading] = useState(true);
 const [page, setPage]           = useState(1);
 const PAGE_SIZE = 50;

 useEffect(() => {
   loadLogs();
 }, []);

 const loadLogs = async () => {
   try {
     const data = await api.admin.getSystemLogs(user.role);
     setSystemLogs(data);
   } catch (error) {
     console.error('Error loading logs:', error);
   } finally {
     setLoading(false);
   }
 };

 React.useEffect(() => { setPage(1); }, [search, roleFilter]);

 const filtered = systemLogs.filter(l => {
 if (roleFilter !== 'all' && l.userRole !== roleFilter) return false;
 if (search && !l.action.toLowerCase().includes(search.toLowerCase()) &&
 !l.details.toLowerCase().includes(search.toLowerCase())) return false;
 return true;
 });

 const exportAudit = () => {
 const content = filtered.map(l =>
 `[${new Date(l.timestamp).toISOString()}] [${l.userRole.toUpperCase()}] [${l.userId}] ${l.action}: ${l.details}`
 ).join('\n');
 const blob = new Blob([`QUANTUM HEALTH CHAIN — AUDIT TRAIL\nExported by: ${user.name}\nDate: ${new Date().toLocaleString()}\n\n${content}`], { type: 'text/plain' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = `qhc-audit-${Date.now()}.txt`;
 document.body.appendChild(a); a.click();
 document.body.removeChild(a); URL.revokeObjectURL(url);
 };

 const roleColors: Record<string, string> = {
 patient: 'text-blue-600 bg-blue-50 border border-blue-200',
 doctor: 'text-green-600 bg-green-50 border border-green-200',
 hospital: 'text-purple-600 bg-purple-50 border-purple-200',
 insurance: 'text-orange-600 bg-orange-50 border-orange-200',
 bank: 'text-teal-600 bg-teal-50 border-teal-200',
 admin: 'text-red-600 bg-red-50 border-red-200',
 };

 return (
 <div className="min-h-full bg-gray-50 p-6">
 <button onClick={onBack} className="text-gray-500 hover:text-gray-600 text-sm mb-4 transition-colors">&#8592; Back</button>
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
 <FileText className="w-5 h-5 text-gray-900" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-gray-900">Audit Trail</h1>
 <p className="text-gray-500 text-sm">{filtered.length} of {systemLogs.length} entries</p>
 </div>
 </div>
 <button onClick={exportAudit} className="flex items-center gap-2 bg-white border border-gray-300 text-gray-900 hover:bg-gray-700 text-gray-600 px-4 py-2 rounded-lg text-sm transition-colors">
 <Download className="w-4 h-4" /> Export
 </button>
 </div>

 <div className="flex gap-3 mb-4">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions or details..."
 className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
 </div>
 <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
 className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 text-sm focus:outline-none">
 <option value="all">All Roles</option>
 {['patient','doctor','hospital','insurance','bank','admin'].map(r => (
 <option key={r} value={r}>{r}</option>
 ))}
 </select>
 </div>

 <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="border-b border-gray-200">
 <tr>
 {['Timestamp','Role','User ID','Action','Details'].map(h => (
 <th key={h} className="text-left px-4 py-3 text-gray-500 text-xs font-medium uppercase tracking-wider">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {filtered.length === 0 && (
 <tr><td colSpan={5} className="text-center py-12 text-gray-500 text-sm">No log entries match your filters.</td></tr>
 )}
 {filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map(log => (
 <tr key={log.id} className="border-b border-gray-200/40 hover:bg-gray-50">
 <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
 <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${roleColors[log.userRole] || 'text-gray-500 bg-white border-gray-300'}`}>{log.userRole}</span></td>
 <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.userId}</td>
 <td className="px-4 py-3 text-gray-900 text-xs font-medium">{log.action}</td>
 <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{log.details}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 {filtered.length > PAGE_SIZE && (
 <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
 <span className="text-xs text-gray-500">
 Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
 </span>
 <div className="flex gap-2">
 <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
 className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">&larr; Prev</button>
 <span className="px-3 py-1 text-xs text-gray-500">Page {page} of {Math.ceil(filtered.length/PAGE_SIZE)}</span>
 <button onClick={() => setPage(p => Math.min(Math.ceil(filtered.length/PAGE_SIZE),p+1))} disabled={page===Math.ceil(filtered.length/PAGE_SIZE)}
 className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white">Next &rarr;</button>
 </div>
 </div>
 )}
 </div>
 </div>
 
 );
};