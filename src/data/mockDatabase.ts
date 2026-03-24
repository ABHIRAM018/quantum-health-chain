import { User, Patient, Doctor, Hospital, Insurance, Bank, Admin, Appointment, MedicalRecord, Bill, InsuranceClaim, Payment, SystemLog } from '../types';

// Mock Users Database
export const users: User[] = [
  // Patients
  {
    id: 'patient-1',
    email: 'john.doe@email.com',
    password: 'password123',
    role: 'patient',
    name: 'John Doe',
    phone: '+1-555-0123',
    dateOfBirth: new Date('1990-05-15'),
    address: '123 Main St, City, State 12345',
    emergencyContact: '+1-555-0124',
    insuranceId: 'insurance-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Patient,
  {
    id: 'patient-2',
    email: 'jane.smith@email.com',
    password: 'password123',
    role: 'patient',
    name: 'Jane Smith',
    phone: '+1-555-0125',
    dateOfBirth: new Date('1985-08-22'),
    address: '456 Oak Ave, City, State 12345',
    emergencyContact: '+1-555-0126',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  } as Patient,
  
  // Doctors
  {
    id: 'doctor-1',
    email: 'dr.wilson@hospital.com',
    password: 'password123',
    role: 'doctor',
    name: 'Dr. Sarah Wilson',
    specialization: 'Cardiology',
    licenseNumber: 'MD-12345',
    hospitalId: 'hospital-1',
    experience: 10,
    consultationFee: 200,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Doctor,
  {
    id: 'doctor-2',
    email: 'dr.johnson@hospital.com',
    password: 'password123',
    role: 'doctor',
    name: 'Dr. Michael Johnson',
    specialization: 'Orthopedics',
    licenseNumber: 'MD-12346',
    hospitalId: 'hospital-1',
    experience: 15,
    consultationFee: 250,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Doctor,

  // Hospitals
  {
    id: 'hospital-1',
    email: 'admin@cityhospital.com',
    password: 'password123',
    role: 'hospital',
    name: 'City General Hospital',
    address: '789 Hospital Blvd, City, State 12345',
    phone: '+1-555-0200',
    totalBeds: 500,
    availableBeds: 45,
    services: ['Emergency', 'Surgery', 'Cardiology', 'Orthopedics', 'Radiology'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Hospital,

  // Insurance
  {
    id: 'insurance-1',
    email: 'claims@healthinsure.com',
    password: 'password123',
    role: 'insurance',
    name: 'HealthInsure Corp',
    companyName: 'HealthInsure Corp',
    policyTypes: ['Basic', 'Premium', 'Family'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Insurance,

  // Bank
  {
    id: 'bank-1',
    email: 'payments@nationalbank.com',
    password: 'password123',
    role: 'bank',
    name: 'National Bank',
    bankName: 'National Bank',
    routingNumber: '021000021',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Bank,

  // Admin
  {
    id: 'admin-1',
    email: 'admin@healthcare.com',
    password: 'password123',
    role: 'admin',
    name: 'System Administrator',
    permissions: ['full_access'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as Admin,
];

// Mock Hospital Rooms Database
export const hospitalRooms: any[] = [
  {
    id: 'room-1',
    hospitalId: 'hospital-1',
    roomNumber: '101',
    roomType: 'general',
    totalBeds: 2,
    availableBeds: 1,
    floor: 1,
    status: 'active',
    amenities: ['TV', 'WiFi', 'Private Bathroom'],
    pricePerDay: 150,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'room-2',
    hospitalId: 'hospital-1',
    roomNumber: '201',
    roomType: 'private',
    totalBeds: 1,
    availableBeds: 1,
    floor: 2,
    status: 'active',
    amenities: ['TV', 'WiFi', 'Private Bathroom', 'Refrigerator', 'Sofa'],
    pricePerDay: 300,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'room-3',
    hospitalId: 'hospital-1',
    roomNumber: 'ICU-1',
    roomType: 'icu',
    totalBeds: 1,
    availableBeds: 0,
    floor: 3,
    status: 'active',
    amenities: ['Ventilator', 'Cardiac Monitor', 'Emergency Equipment'],
    pricePerDay: 800,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock Hospital Services Database
export const hospitalServices: any[] = [
  {
    id: 'service-1',
    hospitalId: 'hospital-1',
    serviceName: 'Emergency Care',
    description: '24/7 emergency medical services',
    department: 'Emergency',
    basePrice: 500,
    isActive: true,
    requirements: ['Valid ID', 'Insurance Card'],
    duration: 60,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'service-2',
    hospitalId: 'hospital-1',
    serviceName: 'Cardiac Surgery',
    description: 'Advanced cardiac surgical procedures',
    department: 'Cardiology',
    basePrice: 15000,
    isActive: true,
    requirements: ['Pre-operative Tests', 'Cardiologist Consultation', 'Insurance Pre-approval'],
    duration: 240,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'service-3',
    hospitalId: 'hospital-1',
    serviceName: 'MRI Scan',
    description: 'Magnetic Resonance Imaging',
    department: 'Radiology',
    basePrice: 1200,
    isActive: true,
    requirements: ['Doctor Referral', 'No Metal Implants'],
    duration: 45,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'service-4',
    hospitalId: 'hospital-1',
    serviceName: 'Blood Test',
    description: 'Comprehensive blood analysis',
    department: 'Laboratory',
    basePrice: 80,
    isActive: true,
    requirements: ['Fasting (if required)', 'Doctor Order'],
    duration: 15,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock Patient Admissions Database
export const patientAdmissions: any[] = [
  {
    id: 'admission-1',
    patientId: 'patient-1',
    hospitalId: 'hospital-1',
    doctorId: 'doctor-1',
    roomId: 'room-3',
    admissionDate: new Date('2024-02-14'),
    reason: 'Chest pain and cardiac monitoring',
    status: 'admitted',
    emergencyContact: '+1-555-0124',
    insuranceInfo: 'HealthInsure Corp - Policy #12345',
    notes: 'Patient stable, monitoring cardiac rhythm',
    createdAt: new Date('2024-02-14'),
    updatedAt: new Date('2024-02-14'),
  },
];

// Mock Lab Reports Database
export const labReports: any[] = [
  {
    id: 'lab-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    hospitalId: 'hospital-1',
    testType: 'Complete Blood Count',
    testDate: new Date('2024-02-15'),
    results: 'WBC: 7.2, RBC: 4.5, Hemoglobin: 14.2, Platelets: 250',
    normalRange: 'WBC: 4.5-11.0, RBC: 4.2-5.4, Hemoglobin: 12.0-15.5, Platelets: 150-450',
    status: 'completed',
    notes: 'All values within normal range',
    createdAt: new Date('2024-02-15'),
  },
  {
    id: 'lab-2',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    hospitalId: 'hospital-1',
    testType: 'Cardiac Enzymes',
    testDate: new Date('2024-02-15'),
    results: 'Troponin I: 0.02, CK-MB: 3.2, LDH: 180',
    normalRange: 'Troponin I: <0.04, CK-MB: 0-6.3, LDH: 140-280',
    status: 'reviewed',
    notes: 'Cardiac enzymes normal, no evidence of myocardial infarction',
    createdAt: new Date('2024-02-15'),
  },
];

// Mock Appointments Database
export const appointments: Appointment[] = [
  {
    id: 'appointment-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    hospitalId: 'hospital-1',
    dateTime: new Date('2024-02-15T10:00:00'),
    status: 'completed',
    reason: 'Chest pain and shortness of breath',
    diagnosis: 'Mild arrhythmia',
    prescription: 'Metoprolol 25mg twice daily',
    createdAt: new Date('2024-02-10'),
  },
  {
    id: 'appointment-2',
    patientId: 'patient-1',
    doctorId: 'doctor-2',
    hospitalId: 'hospital-1',
    dateTime: new Date('2024-02-20T14:00:00'),
    status: 'confirmed',
    reason: 'Knee pain',
    createdAt: new Date('2024-02-18'),
  },
  {
    id: 'appointment-3',
    patientId: 'patient-2',
    doctorId: 'doctor-1',
    hospitalId: 'hospital-1',
    dateTime: new Date('2024-02-22T09:00:00'),
    status: 'pending',
    reason: 'Regular checkup',
    createdAt: new Date('2024-02-20'),
  },
];

// Mock Medical Records Database
export const medicalRecords: MedicalRecord[] = [
  {
    id: 'record-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    appointmentId: 'appointment-1',
    diagnosis: 'Mild arrhythmia',
    prescription: 'Metoprolol 25mg twice daily',
    notes: 'Patient responded well to treatment. Follow-up in 3 months.',
    attachments: ['ecg-report.pdf', 'blood-test.pdf'],
    createdAt: new Date('2024-02-15'),
  },
];

// Mock Bills Database
export const bills: Bill[] = [
  {
    id: 'bill-1',
    patientId: 'patient-1',
    hospitalId: 'hospital-1',
    appointmentId: 'appointment-1',
    amount: 450,
    items: [
      { id: 'item-1', description: 'Consultation', quantity: 1, unitPrice: 200, total: 200 },
      { id: 'item-2', description: 'ECG Test', quantity: 1, unitPrice: 150, total: 150 },
      { id: 'item-3', description: 'Blood Test', quantity: 1, unitPrice: 100, total: 100 },
    ],
    status: 'approved',
    createdAt: new Date('2024-02-15'),
  },
];

// Mock Insurance Claims Database
export const insuranceClaims: InsuranceClaim[] = [
  {
    id: 'claim-1',
    patientId: 'patient-1',
    billId: 'bill-1',
    insuranceId: 'insurance-1',
    amount: 450,
    status: 'approved',
    approvalLetter: 'Claim approved for $450. Payment will be processed within 5 business days.',
    createdAt: new Date('2024-02-16'),
  },
];

// Mock Payments Database
export const payments: Payment[] = [
  {
    id: 'payment-1',
    claimId: 'claim-1',
    bankId: 'bank-1',
    hospitalId: 'hospital-1',
    amount: 450,
    status: 'completed',
    transactionId: 'TXN-123456789',
    receipt: 'Payment of $450 completed successfully',
    createdAt: new Date('2024-02-18'),
  },
];

// Mock System Logs Database
export const systemLogs: SystemLog[] = [
  {
    id: 'log-1',
    userId: 'patient-1',
    userRole: 'patient',
    action: 'LOGIN',
    details: 'User logged in successfully',
    timestamp: new Date('2024-02-20T08:00:00'),
  },
  {
    id: 'log-2',
    userId: 'doctor-1',
    userRole: 'doctor',
    action: 'APPOINTMENT_COMPLETED',
    details: 'Completed appointment with patient John Doe',
    timestamp: new Date('2024-02-15T10:30:00'),
  },
  {
    id: 'log-3',
    userId: 'insurance-1',
    userRole: 'insurance',
    action: 'CLAIM_APPROVED',
    details: 'Approved insurance claim for $450',
    timestamp: new Date('2024-02-16T14:15:00'),
  },
];
import { ConsentRecord, Prescription, SecurityAlert, Notification, MedicalLoan, InsurancePolicy, Refund } from '../types';

// ─── Consent Records ──────────────────────────────────────────────────
export const consentRecords: ConsentRecord[] = [
  {
    id: 'consent-1',
    patientId: 'patient-1',
    grantedTo: 'doctor-1',
    grantedToRole: 'doctor',
    accessType: 'medical',
    status: 'active',
    validUntil: new Date('2025-12-31'),
    reason: 'Ongoing cardiac treatment',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'consent-2',
    patientId: 'patient-1',
    grantedTo: 'insurance-1',
    grantedToRole: 'insurance',
    accessType: 'financial',
    status: 'active',
    validUntil: new Date('2025-06-30'),
    reason: 'Insurance claim processing',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// ─── Prescriptions ────────────────────────────────────────────────────
export const prescriptions: Prescription[] = [
  {
    id: 'rx-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    appointmentId: 'appointment-1',
    medicines: [
      { id: 'med-1', medicineName: 'Metoprolol', dosage: '25mg', frequency: 'Twice daily', duration: '90 days', instructions: 'Take with food' },
      { id: 'med-2', medicineName: 'Aspirin', dosage: '81mg', frequency: 'Once daily', duration: '90 days', instructions: 'Take in the morning' },
    ],
    notes: 'Monitor blood pressure weekly. Return if chest pain recurs.',
    status: 'active',
    refillsAllowed: 3,
    refillsUsed: 1,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15'),
  },
];

// ─── Security Alerts ─────────────────────────────────────────────────
export const securityAlerts: SecurityAlert[] = [
  {
    id: 'alert-1',
    userId: 'unknown',
    userRole: 'patient',
    alertType: 'failed_login',
    alertMessage: 'Multiple failed login attempts from IP 192.168.1.45 for john.doe@email.com',
    severity: 'medium',
    status: 'resolved',
    ipAddress: '192.168.1.45',
    createdAt: new Date('2024-02-18T09:23:00'),
    resolvedAt: new Date('2024-02-18T10:00:00'),
  },
  {
    id: 'alert-2',
    userId: 'doctor-2',
    userRole: 'doctor',
    alertType: 'unauthorized_access',
    alertMessage: 'Doctor attempted to access patient records without active consent',
    severity: 'high',
    status: 'investigating',
    createdAt: new Date('2024-02-19T14:45:00'),
  },
  {
    id: 'alert-3',
    userId: 'bank-1',
    userRole: 'bank',
    alertType: 'suspicious_activity',
    alertMessage: 'Unusual payment pattern detected: 12 transactions in 5 minutes',
    severity: 'critical',
    status: 'open',
    createdAt: new Date('2024-02-20T16:10:00'),
  },
];

// ─── Notifications ────────────────────────────────────────────────────
export const notifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'patient-1',
    title: 'Appointment Confirmed',
    message: 'Your appointment with Dr. Michael Johnson on Feb 20 at 2:00 PM is confirmed.',
    type: 'appointment',
    read: false,
    createdAt: new Date('2024-02-18T10:00:00'),
  },
  {
    id: 'notif-2',
    userId: 'patient-1',
    title: 'Insurance Claim Approved',
    message: 'Your claim of $450 has been approved. Payment will be processed within 5 days.',
    type: 'claim',
    read: true,
    createdAt: new Date('2024-02-16T14:00:00'),
  },
  {
    id: 'notif-3',
    userId: 'patient-1',
    title: 'New Prescription',
    message: 'Dr. Sarah Wilson has issued a new prescription for you. Please review.',
    type: 'prescription',
    read: false,
    createdAt: new Date('2024-02-15T11:30:00'),
  },
  {
    id: 'notif-4',
    userId: 'doctor-1',
    title: 'New Appointment Request',
    message: 'Jane Smith has requested an appointment on Feb 22 at 9:00 AM.',
    type: 'appointment',
    read: false,
    createdAt: new Date('2024-02-20T08:00:00'),
  },
];

// ─── Medical Loans ────────────────────────────────────────────────────
export const medicalLoans: MedicalLoan[] = [
  {
    id: 'loan-1',
    patientId: 'patient-1',
    bankId: 'bank-1',
    amount: 5000,
    purpose: 'Cardiac surgery post-care and medications',
    interestRate: 8.5,
    durationMonths: 24,
    status: 'approved',
    monthlyEmi: 227,
    amountPaid: 454,
    appliedOn: new Date('2024-02-01'),
    approvedOn: new Date('2024-02-05'),
    notes: 'Approved with standard terms',
  },
];

// ─── Insurance Policies ───────────────────────────────────────────────
export const insurancePolicies: InsurancePolicy[] = [
  {
    id: 'policy-1',
    insuranceId: 'insurance-1',
    policyName: 'Basic Health Cover',
    policyType: 'basic',
    coverageAmount: 50000,
    premiumMonthly: 150,
    deductible: 500,
    coveredServices: ['Emergency Care', 'Blood Test', 'X-Ray', 'General Consultation'],
    networkHospitals: ['hospital-1'],
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'policy-2',
    insuranceId: 'insurance-1',
    policyName: 'Premium Family Shield',
    policyType: 'family',
    coverageAmount: 200000,
    premiumMonthly: 450,
    deductible: 250,
    coveredServices: ['Emergency Care', 'Surgery', 'MRI Scan', 'Cardiac Care', 'Maternity', 'Dental', 'Vision'],
    networkHospitals: ['hospital-1'],
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ─── Refunds ──────────────────────────────────────────────────────────
export const refunds: Refund[] = [
  {
    id: 'refund-1',
    paymentId: 'payment-1',
    patientId: 'patient-1',
    bankId: 'bank-1',
    amount: 50,
    reason: 'Duplicate charge for blood test',
    type: 'partial',
    status: 'completed',
    transactionId: 'REF-001',
    createdAt: new Date('2024-02-20'),
    processedAt: new Date('2024-02-21'),
  },
];

// ─── Regulator User ───────────────────────────────────────────────────
import { Regulator } from '../types';

export const regulatorUser: Regulator = {
  id: 'regulator-1',
  email: 'regulator@healthgov.in',
  password: 'password123',
  role: 'regulator',
  name: 'Dr. Priya Nair',
  organization: 'National Health Regulatory Authority',
  jurisdiction: 'Karnataka, India',
  licenseNumber: 'REG-NHRA-2024-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};
// Push into users array so auth works
users.push(regulatorUser as any);