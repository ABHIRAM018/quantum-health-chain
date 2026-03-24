import { useState, useEffect } from 'react';
import { LoginForm } from './components/Auth/LoginForm';
import { PatientPortal } from './components/Portals/PatientPortal';
import { DoctorPortal } from './components/Portals/DoctorPortal';
import { HospitalPortal } from './components/Portals/HospitalPortal';
import { InsurancePortal } from './components/Portals/InsurancePortal';
import { BankPortal } from './components/Portals/BankPortal';
import { AdminPortal } from './components/Portals/AdminPortal';
import { RegulatorPortal } from './components/Regulator/RegulatorDashboard';
import { authService } from './utils/auth';
import { User, Patient, Doctor, Hospital, Insurance, Bank, Admin, Regulator } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('App: useEffect restoring session...');
    authService.restoreSession()
      .then((u: any) => { 
        console.log('App: Session restored:', u);
        if (u) setUser(u); 
      })
      .catch((err: any) => {
        console.error('App: restoreSession error:', err);
      })
      .finally(() => {
        console.log('App: Setting loading to false');
        setLoading(false);
      });
  }, []);

  console.log('App: render state:', { loading, userRole: user?.role });

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f9fafb', flexDirection: 'column' }}>
      <div style={{ width:40, height:40, border:'3px solid #22c55e', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ marginTop: 20, color: '#6b7280' }}>Loading Healthcare System...</div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  console.log('App: rendering for role:', user?.role);

  if (!user) return <LoginForm onLogin={setUser} />;

  switch (user.role) {
    case 'patient':   return <PatientPortal   user={user as Patient}   onLogout={() => { authService.logout(); setUser(null); }} />;
    case 'doctor':    return <DoctorPortal    user={user as Doctor}    onLogout={() => { authService.logout(); setUser(null); }} />;
    case 'hospital':  return <HospitalPortal  user={user as Hospital}  onLogout={() => { authService.logout(); setUser(null); }} />;
    case 'insurance': return <InsurancePortal user={user as Insurance} onLogout={() => { authService.logout(); setUser(null); }} />;
    case 'bank':      return <BankPortal      user={user as Bank}      onLogout={() => { authService.logout(); setUser(null); }} />;
    case 'admin':     return <AdminPortal     user={user as Admin}     onLogout={() => { authService.logout(); setUser(null); }} />;
    case 'regulator': return <RegulatorPortal user={user as Regulator} onLogout={() => { authService.logout(); setUser(null); }} />;
    default:          return <LoginForm onLogin={setUser} />;
  }
}

export default App;