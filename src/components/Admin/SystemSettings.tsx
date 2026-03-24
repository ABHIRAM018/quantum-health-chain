import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Shield, Database, Bell, Globe } from 'lucide-react';
import { api } from '../../utils/api';

interface SystemSettingsProps {
 onBack: () => void;
}

interface SystemConfig {
 general: {
 systemName: string;
 timezone: string;
 dateFormat: string;
 currency: string;
 language: string;
 };
 security: {
 sessionTimeout: number;
 passwordPolicy: {
 minLength: number;
 requireUppercase: boolean;
 requireNumbers: boolean;
 requireSpecialChars: boolean;
 };
 twoFactorAuth: boolean;
 loginAttempts: number;
 };
 notifications: {
 emailNotifications: boolean;
 smsNotifications: boolean;
 pushNotifications: boolean;
 appointmentReminders: boolean;
 paymentAlerts: boolean;
 };
 database: {
 backupFrequency: string;
 retentionPeriod: number;
 autoCleanup: boolean;
 };
 integrations: {
 emailService: string;
 paymentGateway: string;
 smsProvider: string;
 };
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ onBack }) => {
 const [config, setConfig] = useState<SystemConfig>({
 general: {
 systemName: 'Healthcare Management System',
 timezone: 'America/New_York',
 dateFormat: 'MM/DD/YYYY',
 currency: 'USD',
 language: 'en',
 },
 security: {
 sessionTimeout: 30,
 passwordPolicy: {
 minLength: 8,
 requireUppercase: true,
 requireNumbers: true,
 requireSpecialChars: true,
 },
 twoFactorAuth: false,
 loginAttempts: 3,
 },
 notifications: {
 emailNotifications: true,
 smsNotifications: false,
 pushNotifications: true,
 appointmentReminders: true,
 paymentAlerts: true,
 },
 database: {
 backupFrequency: 'daily',
 retentionPeriod: 90,
 autoCleanup: true,
 },
 integrations: {
 emailService: 'sendgrid',
 paymentGateway: 'stripe',
 smsProvider: 'twilio',
 },
 });

 const [activeTab, setActiveTab] = useState('general');
 const [saving, setSaving] = useState(false);

 useEffect(() => {
   const loadSettings = async () => {
     try {
       const settings = await api.admin.getSettings();
       // Only apply if server returned a valid complete config object
       if (settings && typeof settings === 'object' && (settings as any).general) {
         setConfig(settings as any);
       }
       // Otherwise keep the defaults (first time settings haven't been saved yet)
     } catch (error) {
       console.error('Error loading settings:', error);
     }
   };
   loadSettings();
 }, []);

 const handleSave = async () => {
 setSaving(true);
 try {
   await api.admin.updateSettings(config);
   alert('Settings saved successfully!');
 } catch (error: any) {
   console.error('Error saving settings:', error);
   alert('Error saving settings: ' + (error?.message || 'Unknown error'));
 } finally {
   setSaving(false);
 }
 };

 const handleReset = () => {
 if (window.confirm('Are you sure you want to reset all settings to default values?')) {
 // Reset to default values
 setConfig({
 general: {
 systemName: 'Healthcare Management System',
 timezone: 'America/New_York',
 dateFormat: 'MM/DD/YYYY',
 currency: 'USD',
 language: 'en',
 },
 security: {
 sessionTimeout: 30,
 passwordPolicy: {
 minLength: 8,
 requireUppercase: true,
 requireNumbers: true,
 requireSpecialChars: true,
 },
 twoFactorAuth: false,
 loginAttempts: 3,
 },
 notifications: {
 emailNotifications: true,
 smsNotifications: false,
 pushNotifications: true,
 appointmentReminders: true,
 paymentAlerts: true,
 },
 database: {
 backupFrequency: 'daily',
 retentionPeriod: 90,
 autoCleanup: true,
 },
 integrations: {
 emailService: 'sendgrid',
 paymentGateway: 'stripe',
 smsProvider: 'twilio',
 },
 });
 }
 };

 const tabs = [
 { id: 'general', label: 'General', icon: Settings },
 { id: 'security', label: 'Security', icon: Shield },
 { id: 'notifications', label: 'Notifications', icon: Bell },
 { id: 'database', label: 'Database', icon: Database },
 { id: 'integrations', label: 'Integrations', icon: Globe },
 ];

 return (
 <div className="p-6 space-y-6 bg-gray-50 min-h-full">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
 <p className="text-gray-500">Configure system-wide settings and preferences</p>
 </div>
 <div className="flex space-x-2">
 <button
 onClick={onBack}
 className="text-red-600 hover:text-red-600 font-medium"
 >
 Back to Dashboard
 </button>
 <button
 onClick={handleReset}
 className="bg-gray-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
 >
 <RefreshCw className="w-4 h-4" />
 <span>Reset</span>
 </button>
 <button
 onClick={handleSave}
 disabled={saving}
 className="bg-red-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
 >
 <Save className="w-4 h-4" />
 <span>{saving ? 'Saving...' : 'Save Changes'}</span>
 </button>
 </div>
 </div>

 <div className="bg-white rounded-xl border border-gray-200 ">
 {/* Tabs */}
 <div className="border-b border-gray-200">
 <nav className="flex space-x-8 px-6">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
 activeTab === tab.id
 ? 'border-red-500 text-red-600'
 : 'border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300'
 }`}
 >
 <Icon className="w-4 h-4" />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </nav>
 </div>

 <div className="p-6 bg-gray-50 min-h-full">
 {/* General Settings */}
 {activeTab === 'general' && (
 <div className="space-y-6">
 <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 System Name
 </label>
 <input
 type="text"
 value={config.general.systemName}
 onChange={(e) => setConfig({
 ...config,
 general: { ...config.general, systemName: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Timezone
 </label>
 <select
 value={config.general.timezone}
 onChange={(e) => setConfig({
 ...config,
 general: { ...config.general, timezone: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="America/New_York">Eastern Time</option>
 <option value="America/Chicago">Central Time</option>
 <option value="America/Denver">Mountain Time</option>
 <option value="America/Los_Angeles">Pacific Time</option>
 <option value="UTC">UTC</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Date Format
 </label>
 <select
 value={config.general.dateFormat}
 onChange={(e) => setConfig({
 ...config,
 general: { ...config.general, dateFormat: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="MM/DD/YYYY">MM/DD/YYYY</option>
 <option value="DD/MM/YYYY">DD/MM/YYYY</option>
 <option value="YYYY-MM-DD">YYYY-MM-DD</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Currency
 </label>
 <select
 value={config.general.currency}
 onChange={(e) => setConfig({
 ...config,
 general: { ...config.general, currency: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="USD">USD - US Dollar</option>
 <option value="EUR">EUR - Euro</option>
 <option value="GBP">GBP - British Pound</option>
 <option value="CAD">CAD - Canadian Dollar</option>
 </select>
 </div>
 </div>
 </div>
 )}

 {/* Security Settings */}
 {activeTab === 'security' && (
 <div className="space-y-6">
 <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Session Timeout (minutes)
 </label>
 <input
 type="number"
 value={config.security.sessionTimeout}
 onChange={(e) => setConfig({
 ...config,
 security: { ...config.security, sessionTimeout: parseInt(e.target.value) }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 min="5"
 max="120"
 />
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Max Login Attempts
 </label>
 <input
 type="number"
 value={config.security.loginAttempts}
 onChange={(e) => setConfig({
 ...config,
 security: { ...config.security, loginAttempts: parseInt(e.target.value) }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 min="1"
 max="10"
 />
 </div>
 </div>
 
 <div>
 <h3 className="text-md font-medium text-gray-900 mb-4">Password Policy</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Minimum Length
 </label>
 <input
 type="number"
 value={config.security.passwordPolicy.minLength}
 onChange={(e) => setConfig({
 ...config,
 security: {
 ...config.security,
 passwordPolicy: {
 ...config.security.passwordPolicy,
 minLength: parseInt(e.target.value)
 }
 }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 min="6"
 max="20"
 />
 </div>
 </div>
 
 <div className="mt-4 space-y-3">
 <label className="flex items-center space-x-2">
 <input
 type="checkbox"
 checked={config.security.passwordPolicy.requireUppercase}
 onChange={(e) => setConfig({
 ...config,
 security: {
 ...config.security,
 passwordPolicy: {
 ...config.security.passwordPolicy,
 requireUppercase: e.target.checked
 }
 }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <span className="text-sm text-gray-600">Require uppercase letters</span>
 </label>
 
 <label className="flex items-center space-x-2">
 <input
 type="checkbox"
 checked={config.security.passwordPolicy.requireNumbers}
 onChange={(e) => setConfig({
 ...config,
 security: {
 ...config.security,
 passwordPolicy: {
 ...config.security.passwordPolicy,
 requireNumbers: e.target.checked
 }
 }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <span className="text-sm text-gray-600">Require numbers</span>
 </label>
 
 <label className="flex items-center space-x-2">
 <input
 type="checkbox"
 checked={config.security.passwordPolicy.requireSpecialChars}
 onChange={(e) => setConfig({
 ...config,
 security: {
 ...config.security,
 passwordPolicy: {
 ...config.security.passwordPolicy,
 requireSpecialChars: e.target.checked
 }
 }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <span className="text-sm text-gray-600">Require special characters</span>
 </label>
 
 <label className="flex items-center space-x-2">
 <input
 type="checkbox"
 checked={config.security.twoFactorAuth}
 onChange={(e) => setConfig({
 ...config,
 security: { ...config.security, twoFactorAuth: e.target.checked }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <span className="text-sm text-gray-600">Enable two-factor authentication</span>
 </label>
 </div>
 </div>
 </div>
 )}

 {/* Notifications Settings */}
 {activeTab === 'notifications' && (
 <div className="space-y-6">
 <h2 className="text-lg font-semibold text-gray-900">Notification Settings</h2>
 <div className="space-y-4">
 <label className="flex items-center space-x-3">
 <input
 type="checkbox"
 checked={config.notifications.emailNotifications}
 onChange={(e) => setConfig({
 ...config,
 notifications: { ...config.notifications, emailNotifications: e.target.checked }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <div>
 <span className="text-sm font-medium text-gray-600">Email Notifications</span>
 <p className="text-xs text-gray-500">Send notifications via email</p>
 </div>
 </label>
 
 <label className="flex items-center space-x-3">
 <input
 type="checkbox"
 checked={config.notifications.smsNotifications}
 onChange={(e) => setConfig({
 ...config,
 notifications: { ...config.notifications, smsNotifications: e.target.checked }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <div>
 <span className="text-sm font-medium text-gray-600">SMS Notifications</span>
 <p className="text-xs text-gray-500">Send notifications via SMS</p>
 </div>
 </label>
 
 <label className="flex items-center space-x-3">
 <input
 type="checkbox"
 checked={config.notifications.pushNotifications}
 onChange={(e) => setConfig({
 ...config,
 notifications: { ...config.notifications, pushNotifications: e.target.checked }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <div>
 <span className="text-sm font-medium text-gray-600">Push Notifications</span>
 <p className="text-xs text-gray-500">Send browser push notifications</p>
 </div>
 </label>
 
 <label className="flex items-center space-x-3">
 <input
 type="checkbox"
 checked={config.notifications.appointmentReminders}
 onChange={(e) => setConfig({
 ...config,
 notifications: { ...config.notifications, appointmentReminders: e.target.checked }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <div>
 <span className="text-sm font-medium text-gray-600">Appointment Reminders</span>
 <p className="text-xs text-gray-500">Automatic appointment reminders</p>
 </div>
 </label>
 
 <label className="flex items-center space-x-3">
 <input
 type="checkbox"
 checked={config.notifications.paymentAlerts}
 onChange={(e) => setConfig({
 ...config,
 notifications: { ...config.notifications, paymentAlerts: e.target.checked }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <div>
 <span className="text-sm font-medium text-gray-600">Payment Alerts</span>
 <p className="text-xs text-gray-500">Notifications for payment events</p>
 </div>
 </label>
 </div>
 </div>
 )}

 {/* Database Settings */}
 {activeTab === 'database' && (
 <div className="space-y-6">
 <h2 className="text-lg font-semibold text-gray-900">Database Settings</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Backup Frequency
 </label>
 <select
 value={config.database.backupFrequency}
 onChange={(e) => setConfig({
 ...config,
 database: { ...config.database, backupFrequency: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="hourly">Hourly</option>
 <option value="daily">Daily</option>
 <option value="weekly">Weekly</option>
 <option value="monthly">Monthly</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Retention Period (days)
 </label>
 <input
 type="number"
 value={config.database.retentionPeriod}
 onChange={(e) => setConfig({
 ...config,
 database: { ...config.database, retentionPeriod: parseInt(e.target.value) }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 min="7"
 max="365"
 />
 </div>
 </div>
 
 <div>
 <label className="flex items-center space-x-2">
 <input
 type="checkbox"
 checked={config.database.autoCleanup}
 onChange={(e) => setConfig({
 ...config,
 database: { ...config.database, autoCleanup: e.target.checked }
 })}
 className="rounded border-gray-300 text-red-600 focus:ring-red-500"
 />
 <span className="text-sm text-gray-600">Enable automatic cleanup of old data</span>
 </label>
 </div>
 </div>
 )}

 {/* Integrations Settings */}
 {activeTab === 'integrations' && (
 <div className="space-y-6">
 <h2 className="text-lg font-semibold text-gray-900">Integration Settings</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Email Service Provider
 </label>
 <select
 value={config.integrations.emailService}
 onChange={(e) => setConfig({
 ...config,
 integrations: { ...config.integrations, emailService: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="sendgrid">SendGrid</option>
 <option value="mailgun">Mailgun</option>
 <option value="ses">Amazon SES</option>
 <option value="smtp">Custom SMTP</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 Payment Gateway
 </label>
 <select
 value={config.integrations.paymentGateway}
 onChange={(e) => setConfig({
 ...config,
 integrations: { ...config.integrations, paymentGateway: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="stripe">Stripe</option>
 <option value="paypal">PayPal</option>
 <option value="square">Square</option>
 <option value="authorize">Authorize.Net</option>
 </select>
 </div>
 
 <div>
 <label className="block text-sm font-medium text-gray-600 mb-2">
 SMS Provider
 </label>
 <select
 value={config.integrations.smsProvider}
 onChange={(e) => setConfig({
 ...config,
 integrations: { ...config.integrations, smsProvider: e.target.value }
 })}
 className="bg-gray-100 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
 >
 <option value="twilio">Twilio</option>
 <option value="nexmo">Nexmo</option>
 <option value="aws-sns">AWS SNS</option>
 <option value="messagebird">MessageBird</option>
 </select>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};