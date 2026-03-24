/**
 * auth.ts
 * Tries Express/PostgreSQL server first (via Vite proxy).
 * Falls back to mock data automatically if server is offline or DB unavailable.
 */
import { User, UserRole } from '../types';
import { users } from '../data/mockDatabase';
import { passwordHasher, jwtService, rbac, enforceHTTPS, dbEncryption, SENSITIVE_FIELDS, type Permission } from './security';

enforceHTTPS();

// Use empty string so Vite proxy handles /api/* → localhost:4000
// This avoids CORS and works whether server is on 4000 or any port
// const BASE = '';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// ── server ping cache ─────────────────────────────────────────
let _serverAvailable: boolean | null = null;
let _lastCheck = 0;

async function isServerAvailable(): Promise<boolean> {
  const now = Date.now();
  // Re-check every 30s
  if (_serverAvailable !== null && now - _lastCheck < 30000) {
    return _serverAvailable;
  }
  try {
    // Ping with a dedicated endpoint if possible, or just HEAD on login
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ __ping: true }),
      signal: AbortSignal.timeout(3000),
    });
    // If we get ANY response from the server, it's UP.
    // Even a 400/404 from our Express server counts as "Up" vs a network error.
    if (res) _serverAvailable = true;
    _lastCheck = now;
  } catch (e) {
    console.warn('AuthService: Server check failed (network error or timeout)', e);
    _serverAvailable = false;
    _lastCheck = now;
  }
  return _serverAvailable ?? false;
}

// ── attempt tracking (mock mode) ─────────────────────────────
const getAttempts = (email: string) => {
  try {
    const r = sessionStorage.getItem(`attempts_${email}`);
    return r ? JSON.parse(r) : { count: 0 };
  } catch { return { count: 0 }; }
};
const saveAttempts = (email: string, data: any) =>
  sessionStorage.setItem(`attempts_${email}`, JSON.stringify(data));
const resetAttempts = (email: string) =>
  sessionStorage.removeItem(`attempts_${email}`);

class AuthService {
  private _user: User | null = null;
  private _token: string | null = null;

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    console.log('AuthService: login attempt for', email);
    const serverUp = await isServerAvailable();
    console.log('AuthService: server available?', serverUp);

    // ── REAL SERVER MODE ─────────────────────────────────────
    if (serverUp) {
      try {
        console.log('AuthService: attempting server login...');
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: AbortSignal.timeout(8000),
        });

        console.log('AuthService: server response status', res.status);

        if (res.ok) {
          const { user: raw, token } = await res.json();
          console.log('AuthService: server login success');
          const user: User = {
            id: raw.id,
            email: raw.email,
            password: '',
            role: raw.role,
            name: raw.name,
            createdAt: new Date(raw.created_at ?? raw.createdAt),
            updatedAt: new Date(raw.updated_at ?? raw.updatedAt),
            // Common optional fields
            ...(raw.phone            && { phone: raw.phone }),
            ...(raw.address          && { address: raw.address }),
            // Insurance-specific
            companyName:  raw.companyName  ?? raw.name,
            policyTypes:  raw.policyTypes  ?? ['Basic', 'Premium', 'Family'],
            // Bank-specific
            bankName:     raw.bankName     ?? raw.name,
            routingNumber: raw.routingNumber ?? '',
            // Doctor-specific
            specialization: raw.specialization ?? '',
            licenseNumber:  raw.licenseNumber  ?? '',
            hospitalId:     raw.hospitalId     ?? raw.hospital_id ?? '',
            experience:     raw.experience     ?? 0,
            consultationFee: raw.consultationFee ?? raw.consultation_fee ?? 0,
            // Hospital-specific
            totalBeds:    raw.totalBeds    ?? 0,
            availableBeds: raw.availableBeds ?? 0,
            services:     raw.services     ?? [],
            // Admin-specific
            permissions:  raw.permissions  ?? [],
            // Patient-specific
            emergencyContact: raw.emergencyContact ?? '',
            dateOfBirth: raw.dateOfBirth ? new Date(raw.dateOfBirth) : undefined,
            insuranceId: raw.insuranceId ?? '',
            // Regulator-specific
            organization:  raw.organization  ?? '',
            jurisdiction:  raw.jurisdiction  ?? '',
          } as User;
          this._setSession(user, token);
          return { user, token };
        }

        // Server responded but login failed (wrong credentials)
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        console.warn('AuthService: server login failed', err);
        // Don't fall through to mock for auth errors — throw immediately
        throw new Error(err.error || 'Invalid credentials');

      } catch (e: any) {
        console.error('AuthService: server login error', e);
        // If it's an auth error from server, rethrow
        if (e.message && (
          e.message.includes('credentials') ||
          e.message.includes('locked') ||
          e.message.includes('attempt')
        )) throw e;

        // Network/DB failure → fall through to mock
        console.warn('⚠️  Server error, falling back to mock data:', e.message);
        _serverAvailable = false;
      }
    }

    // ── MOCK MODE ────────────────────────────────────────────
    console.info('ℹ️  Using mock data (server offline)');

    const attempts = getAttempts(email);
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const mins = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      throw new Error(`Account locked. Try again in ${mins} minute(s).`);
    }

    await new Promise(r => setTimeout(r, 300));

    const user = users.find(u => u.email === email);
    let valid = false;
    if (user) {
      valid = user.password.includes(':')
        ? await passwordHasher.verify(password, user.password)
        : user.password === password;
    }

    if (!user || !valid) {
      const updated = { count: (attempts.count || 0) + 1, lockedUntil: undefined as number | undefined };
      if (updated.count >= LOCKOUT_THRESHOLD) {
        updated.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
        saveAttempts(email, updated);
        throw new Error('Too many attempts. Account locked for 15 minutes.');
      }
      saveAttempts(email, updated);
      throw new Error(`Invalid credentials. ${LOCKOUT_THRESHOLD - updated.count} attempt(s) remaining.`);
    }

    resetAttempts(email);
    const permissions = rbac.getPermissions(user.role);
    const token = await jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, permissions }, 3600
    );
    this._setSession(user, token);
    return { user, token };
  }

  private _setSession(user: User, token: string) {
    this._user = user;
    this._token = token;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  logout(): void {
    const token = this._token || localStorage.getItem('auth_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    this._user = null;
    this._token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  async restoreSession(): Promise<User | null> {
    try {
      const token = localStorage.getItem('auth_token');
      const raw   = localStorage.getItem('user');
      if (!token || !raw) return null;
      
      // If server is up, we trust the token stored was from a server login
      // If server is down, we use jwtService.verify to check our own mock tokens
      const serverUp = await isServerAvailable();
      const payload = serverUp 
        ? jwtService.decode(token)
        : await jwtService.verify(token);

      if (!payload) { 
        console.warn('Session restoration failed: invalid or expired token');
        this.logout(); 
        return null; 
      }
      
      const user = JSON.parse(raw) as User;
      this._user  = user;
      this._token = token;
      return user;
    } catch (e) {
      console.error('Session restoration crashed:', e);
      this.logout();
      return null;
    }
  }

  getCurrentUser(): User | null {
    if (this._user) return this._user;
    const raw = localStorage.getItem('user');
    if (raw) {
      this._user  = JSON.parse(raw);
      this._token = localStorage.getItem('auth_token');
      return this._user;
    }
    return null;
  }

  getToken(): string | null {
    return this._token || localStorage.getItem('auth_token');
  }

  async isAuthenticated(): Promise<boolean> {
    return !!(await this.restoreSession());
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentUser()?.role === role;
  }

  can(permission: Permission): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    return rbac.hasPermission(user.role, permission);
  }

  require(permission: Permission): void {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    rbac.requirePermission(user.role, permission);
  }

  async hashPassword(password: string): Promise<string> {
    return passwordHasher.hash(password);
  }

  async encryptSensitiveData<T extends Record<string, unknown>>(
    record: T, type: keyof typeof SENSITIVE_FIELDS
  ): Promise<T> {
    return dbEncryption.encryptRecord(record, [...SENSITIVE_FIELDS[type]] as (keyof T)[]);
  }

  async decryptSensitiveData<T extends Record<string, unknown>>(
    record: T, type: keyof typeof SENSITIVE_FIELDS
  ): Promise<T> {
    return dbEncryption.decryptRecord(record, [...SENSITIVE_FIELDS[type]] as (keyof T)[]);
  }
}

export const authService = new AuthService();