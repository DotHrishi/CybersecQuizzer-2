/**
 * Utility functions for college & department registration key handling,
 * grace period calculation, and student password policy validation.
 */

export const DUMMY_COLLEGE_NAME = 'Enter-your-college';
export const DUMMY_COLLEGE_IDENTIFIER = 'DUMMY';
export const UNASSIGNED_DEPARTMENT_NAME = 'Unassigned';
export const STUDENT_GRACE_PERIOD_DAYS = 5;

/**
 * Normalizes a registration key (trims leading/trailing whitespace).
 * Registration keys are NOT passwords; any characters are permitted.
 */
export function normalizeRegistrationKey(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim();
}

/**
 * Validates registration key presence.
 * There is NO password-style complexity check (letters, numbers, special characters, spaces allowed).
 */
export function validateRegistrationKeyFormat(key: string | null | undefined): { isValid: boolean; message?: string } {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    return { isValid: false, message: 'Registration key is required.' };
  }
  return { isValid: true };
}

/**
 * Normalizes a college name for backward compatibility and admin CRUD.
 */
export function normalizeCollegeName(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\.\,\;\-]+$/, '')
    .trim();
}

/**
 * Determines if two college names match after normalization.
 */
export function isCollegeNameMatch(a: string, b: string): boolean {
  const normA = normalizeCollegeName(a).toLowerCase();
  const normB = normalizeCollegeName(b).toLowerCase();
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Checks if a college name or identifier represents the dummy placeholder.
 */
export function isDummyCollege(nameOrIdentifier: string | null | undefined): boolean {
  if (!nameOrIdentifier) return true;
  const norm = normalizeCollegeName(nameOrIdentifier).toLowerCase();
  return (
    norm === DUMMY_COLLEGE_NAME.toLowerCase() ||
    norm === 'enter your college' ||
    norm === 'enter-your-college' ||
    norm === DUMMY_COLLEGE_IDENTIFIER.toLowerCase()
  );
}

/**
 * Calculates whether a student account is beyond the 5-day grace period.
 * Supports checking both collegeDepartmentId and passwordHash.
 */
export function getStudentGracePeriodStatus(
  input:
    | Date
    | string
    | {
        createdAt?: Date | string | null;
        collegeId?: number | null;
        collegeDepartmentId?: number | null;
        collegeDepartment?: any;
        college?: any;
        passwordHash?: string | null;
      }
    | null
    | undefined
): {
  isBeyondGracePeriod: boolean;
  isWithinGracePeriod: boolean;
  requiresCollegeSetup: boolean;
  requiresRegistrationKeySetup: boolean;
  daysRemaining: number;
  hoursRemaining: number;
} {
  let createdAt: Date | string | null | undefined;
  let hasValidDepartment = false;
  let hasPassword = false;

  if (input && typeof input === 'object' && !(input instanceof Date)) {
    createdAt = input.createdAt;
    hasValidDepartment = Boolean(input.collegeDepartmentId || input.collegeDepartment?.id);
    hasPassword = Boolean(input.passwordHash);
  } else {
    createdAt = input as Date | string;
  }

  if (!createdAt) {
    return {
      isBeyondGracePeriod: false,
      isWithinGracePeriod: true,
      requiresCollegeSetup: false,
      requiresRegistrationKeySetup: false,
      daysRemaining: STUDENT_GRACE_PERIOD_DAYS,
      hoursRemaining: STUDENT_GRACE_PERIOD_DAYS * 24,
    };
  }

  const createdTime = new Date(createdAt).getTime();
  const gracePeriodMs = STUDENT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const expiryTime = createdTime + gracePeriodMs;
  const now = Date.now();

  const isBeyond = now > expiryTime;
  const msRemaining = Math.max(0, expiryTime - now);
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  const requiresSetup = isBeyond && (!hasValidDepartment || !hasPassword);

  return {
    isBeyondGracePeriod: isBeyond,
    isWithinGracePeriod: !isBeyond,
    requiresCollegeSetup: requiresSetup,
    requiresRegistrationKeySetup: requiresSetup,
    daysRemaining,
    hoursRemaining,
  };
}

/**
 * Generates a random compliant strong password (8-12 chars with upper, lower, number, special).
 */
export function generateStrongPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const nums = '23456789';
  const special = '!@#$%&*';

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += nums[Math.floor(Math.random() * nums.length)];
  pwd += special[Math.floor(Math.random() * special.length)];

  const all = upper + lower + nums + special;
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
}

/**
 * Student Password Policy:
 * - Minimum 8 characters
 * - At least 1 uppercase letter ([A-Z])
 * - At least 1 lowercase letter ([a-z])
 * - At least 1 number ([0-9])
 */
export function validateStudentPassword(password: string): { isValid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required.' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number (0-9).' };
  }

  return { isValid: true };
}
