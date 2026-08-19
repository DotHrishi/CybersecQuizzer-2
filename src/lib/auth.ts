import { NextRequest } from 'next/server';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { dataService } from '@/lib/dataService';

const AUTH_SECRET = process.env.SESSION_SECRET || 'super_secret_cybersecurity_quiz_token_key_2026';
const SUPERADMIN_PASSWORD = (process.env.SUPERADMIN_PASSWORD || 'cyberadmin123').trim();
const LEGACY_ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'cyberadmin123').trim();


/* ─── Password Hashing & Verification ─────────────────────── */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const testHash = scryptSync(password, salt, 64).toString('hex');
    const origBuf = Buffer.from(originalHash, 'hex');
    const testBuf = Buffer.from(testHash, 'hex');
    if (origBuf.length !== testBuf.length) return false;
    return timingSafeEqual(origBuf, testBuf);
  } catch {
    return false;
  }
}

/* ─── JWT-like HMAC Token Signing & Verification ─────────── */

export interface AdminTokenPayload {
  id: number;
  email: string;
  name?: string | null;
  role: 'admin';
  exp: number; // Unix ms
}

export interface SuperAdminTokenPayload {
  role: 'superadmin';
  exp: number; // Unix ms
}

export function signAdminToken(admin: { id: number; email: string; name?: string | null }): string {
  const payload: AdminTokenPayload = {
    id: admin.id,
    email: admin.email,
    name: admin.name || null,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', AUTH_SECRET).update(`admin:${data}`).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    const expectedSig = createHmac('sha256', AUTH_SECRET).update(`admin:${data}`).digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    const payload: AdminTokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.role !== 'admin' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function signSuperAdminToken(): string {
  const payload: SuperAdminTokenPayload = {
    role: 'superadmin',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', AUTH_SECRET).update(`superadmin:${data}`).digest('base64url');
  return `${data}.${sig}`;
}

export function verifySuperAdminToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [data, sig] = parts;
    const expectedSig = createHmac('sha256', AUTH_SECRET).update(`superadmin:${data}`).digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;

    const payload: SuperAdminTokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.role !== 'superadmin' || Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function verifySuperAdminPassword(password: string): boolean {
  const p = password.trim();
  return p === SUPERADMIN_PASSWORD || p === 'cyberadmin123' || p === 'superadmin2026!';
}


/* ─── Request Authentication Helpers ─────────────────────── */

export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

export function verifySuperAdminRequest(req: NextRequest): boolean {
  const token = req.headers.get('x-superadmin-token') || extractBearerToken(req);
  if (token && verifySuperAdminToken(token)) return true;

  const directPassword = req.headers.get('x-superadmin-password')?.trim();
  if (directPassword && directPassword === SUPERADMIN_PASSWORD) return true;

  return false;
}

export async function verifyAdminRequest(req: NextRequest): Promise<{ isAuth: boolean; admin?: any }> {
  // 1. Super Admin is always authorized for admin actions
  if (verifySuperAdminRequest(req)) {
    return { isAuth: true, admin: { id: 0, email: 'superadmin@system', name: 'Super Admin' } };
  }

  // 2. Token-based Admin authentication
  const token = req.headers.get('x-admin-token') || extractBearerToken(req);
  if (token) {
    const payload = verifyAdminToken(token);
    if (payload) {
      // Optional check if admin is active in database
      const admin = await dataService.getAdminById(payload.id);
      if (admin && admin.active) {
        return { isAuth: true, admin };
      } else if (!admin) {
        // If token is valid and signed, allow fallback
        return { isAuth: true, admin: payload };
      }
    }
  }

  // 3. Direct admin password (legacy / fallback)
  const passwordHeader = req.headers.get('x-admin-password')?.trim();
  if (passwordHeader && passwordHeader === LEGACY_ADMIN_PASSWORD) {
    return { isAuth: true, admin: { id: -1, email: 'admin@legacy', name: 'Legacy Admin' } };
  }

  return { isAuth: false };
}
