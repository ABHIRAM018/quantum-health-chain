import React, { useState } from 'react';
import { Save, CheckCircle, Bell, Shield, DollarSign, Building2, RefreshCw, Globe } from 'lucide-react';
import { Insurance } from '../../types';

interface InsuranceSettingsProps { user: Insurance; onBack: () => void; }

const SETTINGS_KEY = 'qhc_insurance_settings';

export const InsuranceSettings: React.FC<InsuranceSettingsProps> = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('company');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Deep-merge saved settings with defaults ──────────────
  const getInitial = () => {
    const defaults = {
      company: {
        companyName: (user as any).companyName || user.name || '',
        contactEmail: user.email || '',
        contactPhone: (user as any).phone || '',
        address: (user as any).address || '',
        licenseNumber: '',
        website: '',
      },
      claims: {
        autoApproveBelow: 500,
        maxClaimAmount: 100000,
        processingDays: 3,
        requireDocuments: true,
        allowResubmission: true,
        notifyPatientOnUpdate: true,
      },
      notifications: {
        emailOnNewClaim: true,
        emailOnApproval: true,
        emailOnRejection: true,
        smsAlerts: false,
        dailyDigest: true,
        weeklyReport: true,
      },
      payments: {
        paymentTermDays: 7,
        requireSecondApprovalAbove: 50000,
        autoSendToBankOnApproval: false,
      },
    };

    try {
      const raw = localStorage.getItem(`${SETTINGS_KEY}_${user.id}`);
      if (raw) {
        const saved = JSON.parse(raw);
        // Deep merge each section
        return {
          company:       { ...defaults.company,       ...(saved.company       || {}) },
          claims:        { ...defaults.claims,        ...(saved.claims        || {}) },
          notifications: { ...defaults.notifications, ...(saved.notifications || {}) },
          payments:      { ...defaults.payments,      ...(saved.payments      || {}) },
        };
      }
    } catch { /* ignore parse errors */ }
    return defaults;
  };

  const [settings, setSettings] = useState(getInitial);

  const update = (section: keyof typeof settings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    try {
      // Save settings
      localStorage.setItem(`${SETTINGS_KEY}_${user.id}`, JSON.stringify(settings));

      // Update the user session in localStorage so header/App re-renders
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const updated = {
          ...parsed,
          name: settings.company.companyName || parsed.name,
          companyName: settings.company.companyName || parsed.companyName,
          phone: settings.company.contactPhone || parsed.phone,
          address: settings.company.address || parsed.address,
          email: settings.company.contactEmail || parsed.email,
        };
        localStorage.setItem('user', JSON.stringify(updated));
        // Notify App.tsx to sync header immediately (same-tab)
        window.dispatchEvent(new Event('qhc:user-updated'));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      localStorage.removeItem(`${SETTINGS_KEY}_${user.id}`);
      setSettings(getInitial());
    }
  };

  const tabs = [
    { id: 'company',       label: 'Company',       icon: Building2 },
    { id: 'claims',        label: 'Claims',         icon: Shield },
    { id: 'notifications', label: 'Notifications',  icon: Bell },
    { id: 'payments',      label: 'Payments',        icon: DollarSign },
  ];

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-gray-900";

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button type="button" onClick={onChange}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none ${checked ? 'bg-orange-500' : 'bg-gray-300'}`}>
      <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );

  const Row = ({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: () => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">

      {/* Success toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-green-200 rounded-xl shadow-lg px-5 py-3 text-sm text-green-700 flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4" /> Settings saved!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Configure your insurance operations and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
          <button onClick={onBack} className="text-orange-600 font-medium text-sm">← Back</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tab bar */}
        <div className="border-b border-gray-200">
          <nav className="flex px-4 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-4 px-4 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                <t.icon className="w-4 h-4" /> {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 max-w-2xl">

          {/* ── COMPANY ─────────────────────────────────────── */}
          {activeTab === 'company' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                  <input value={settings.company.companyName}
                    onChange={e => update('company', 'companyName', e.target.value)}
                    className={inputCls} placeholder="HealthInsure Corp" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">License Number</label>
                  <input value={settings.company.licenseNumber}
                    onChange={e => update('company', 'licenseNumber', e.target.value)}
                    className={inputCls} placeholder="INS-2024-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
                  <input type="email" value={settings.company.contactEmail}
                    onChange={e => update('company', 'contactEmail', e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact Phone</label>
                  <input type="tel" value={settings.company.contactPhone}
                    onChange={e => update('company', 'contactPhone', e.target.value)}
                    className={inputCls} placeholder="+1-555-0400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input value={settings.company.website}
                      onChange={e => update('company', 'website', e.target.value)}
                      className={inputCls + ' pl-8'} placeholder="https://example.com" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <textarea rows={2} value={settings.company.address}
                    onChange={e => update('company', 'address', e.target.value)}
                    className={inputCls} placeholder="123 Insurance Ave, City, State" />
                </div>
              </div>
            </div>
          )}

          {/* ── CLAIMS ──────────────────────────────────────── */}
          {activeTab === 'claims' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900">Claims Processing Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Auto-approve below ($)</label>
                  <input type="number" min="0" value={settings.claims.autoApproveBelow}
                    onChange={e => update('claims', 'autoApproveBelow', Number(e.target.value))}
                    className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1">Claims under this amount auto-approve</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Maximum claim amount ($)</label>
                  <input type="number" min="0" value={settings.claims.maxClaimAmount}
                    onChange={e => update('claims', 'maxClaimAmount', Number(e.target.value))}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Target processing days</label>
                  <input type="number" min="1" max="30" value={settings.claims.processingDays}
                    onChange={e => update('claims', 'processingDays', Number(e.target.value))}
                    className={inputCls} />
                </div>
              </div>
              <div className="space-y-0">
                <Row label="Require supporting documents" sub="Patients must upload proof with claim"
                  checked={settings.claims.requireDocuments}
                  onChange={() => update('claims', 'requireDocuments', !settings.claims.requireDocuments)} />
                <Row label="Allow claim resubmission" sub="Patients can resubmit rejected claims"
                  checked={settings.claims.allowResubmission}
                  onChange={() => update('claims', 'allowResubmission', !settings.claims.allowResubmission)} />
                <Row label="Notify patient on status update"
                  checked={settings.claims.notifyPatientOnUpdate}
                  onChange={() => update('claims', 'notifyPatientOnUpdate', !settings.claims.notifyPatientOnUpdate)} />
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ───────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900">Notification Preferences</h3>
              <div className="space-y-0">
                <Row label="Email on new claim submitted"
                  checked={settings.notifications.emailOnNewClaim}
                  onChange={() => update('notifications', 'emailOnNewClaim', !settings.notifications.emailOnNewClaim)} />
                <Row label="Email on claim approval"
                  checked={settings.notifications.emailOnApproval}
                  onChange={() => update('notifications', 'emailOnApproval', !settings.notifications.emailOnApproval)} />
                <Row label="Email on claim rejection"
                  checked={settings.notifications.emailOnRejection}
                  onChange={() => update('notifications', 'emailOnRejection', !settings.notifications.emailOnRejection)} />
                <Row label="SMS alerts" sub="Requires SMS provider configured"
                  checked={settings.notifications.smsAlerts}
                  onChange={() => update('notifications', 'smsAlerts', !settings.notifications.smsAlerts)} />
                <Row label="Daily activity digest" sub="Summary email each morning"
                  checked={settings.notifications.dailyDigest}
                  onChange={() => update('notifications', 'dailyDigest', !settings.notifications.dailyDigest)} />
                <Row label="Weekly performance report" sub="Sent every Monday"
                  checked={settings.notifications.weeklyReport}
                  onChange={() => update('notifications', 'weeklyReport', !settings.notifications.weeklyReport)} />
              </div>
            </div>
          )}

          {/* ── PAYMENTS ────────────────────────────────────── */}
          {activeTab === 'payments' && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-900">Payment Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment term (days)</label>
                  <input type="number" min="1" max="90" value={settings.payments.paymentTermDays}
                    onChange={e => update('payments', 'paymentTermDays', Number(e.target.value))}
                    className={inputCls} />
                  <p className="text-xs text-gray-400 mt-1">Days to complete payment after approval</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Second approval required above ($)</label>
                  <input type="number" min="0" value={settings.payments.requireSecondApprovalAbove}
                    onChange={e => update('payments', 'requireSecondApprovalAbove', Number(e.target.value))}
                    className={inputCls} />
                </div>
              </div>
              <div className="space-y-0">
                <Row label="Auto-send to bank on approval"
                  sub="Automatically initiate bank transfer when claim is approved"
                  checked={settings.payments.autoSendToBankOnApproval}
                  onChange={() => update('payments', 'autoSendToBankOnApproval', !settings.payments.autoSendToBankOnApproval)} />
              </div>
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-sm">
                <p className="font-medium text-orange-800 mb-1">Payment flow summary</p>
                <p className="text-orange-600 text-xs">
                  New Claim → Review ({settings.claims.processingDays}d) → Approval → Bank Transfer ({settings.payments.paymentTermDays}d) → Hospital
                </p>
                {settings.payments.autoSendToBankOnApproval && (
                  <p className="text-green-600 text-xs mt-1">✓ Auto bank transfer is enabled</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};