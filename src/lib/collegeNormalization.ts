/**
 * Utility functions for college name normalization, exact matching,
 * and student password policy validation.
 */

export const DUMMY_COLLEGE_NAME = 'Enter-your-college';
export const DUMMY_COLLEGE_IDENTIFIER = 'DUMMY';
export const STUDENT_GRACE_PERIOD_DAYS = 5;

/**
 * Normalizes a college name for comparison:
 * - Unicode NFKC normalization
 * - Trims leading and trailing whitespace
 * - Collapses consecutive spaces/tabs into a single space
 * - Strips harmless trailing punctuation (e.g. '.', ',', ';', '-')
 */
export function normalizeCollegeName(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple whitespace to single space
    .replace(/[\.\,\;\-]+$/, '') // Strip harmless trailing punctuation
    .trim();
}

/**
 * Determines if a student-entered college name matches a configured college name.
 * Uses exact match after safe normalization (case-insensitive).
 */
export function isCollegeNameMatch(enteredName: string, configuredName: string): boolean {
  const normEntered = normalizeCollegeName(enteredName).toLowerCase();
  const normConfigured = normalizeCollegeName(configuredName).toLowerCase();

  if (!normEntered || !normConfigured) return false;
  return normEntered === normConfigured;
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
 * Supports passing a Date, date string, or a student profile object.
 */
export function getStudentGracePeriodStatus(
  input: Date | string | { createdAt?: Date | string | null; collegeId?: number | null; college?: any; passwordHash?: string | null } | null | undefined
): {
  isBeyondGracePeriod: boolean;
  isWithinGracePeriod: boolean;
  requiresCollegeSetup: boolean;
  daysRemaining: number;
  hoursRemaining: number;
} {
  let createdAt: Date | string | null | undefined;
  let isDummy = false;
  let hasPassword = false;

  if (input && typeof input === 'object' && !(input instanceof Date)) {
    createdAt = input.createdAt;
    if (input.college?.identifier === DUMMY_COLLEGE_IDENTIFIER || isDummyCollege(input.college?.name)) {
      isDummy = true;
    }
    hasPassword = Boolean(input.passwordHash);
  } else {
    createdAt = input as Date | string;
  }

  if (!createdAt) {
    return {
      isBeyondGracePeriod: false,
      isWithinGracePeriod: true,
      requiresCollegeSetup: false,
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

  const requiresSetup = isBeyond && (isDummy || !hasPassword);

  return {
    isBeyondGracePeriod: isBeyond,
    isWithinGracePeriod: !isBeyond,
    requiresCollegeSetup: requiresSetup,
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
