export interface CollegeDTO {
  id: number;
  name: string;
  identifier: string;
  createdAt?: string;
  updatedAt?: string;
  departmentCount?: number;
  studentCount?: number;
  adminCount?: number;
}

export interface DepartmentDTO {
  id: number;
  collegeId: number;
  departmentName: string;
  registrationKey: string;
  college?: CollegeDTO;
  createdAt?: string;
  updatedAt?: string;
  studentCount?: number;
  adminCount?: number;
}

export interface UserProfileDTO {
  id?: number;
  fullName: string;
  nickname: string;
  isNicknameSame: boolean;
  email: string;
  emailType: 'college' | 'personal';
  collegeId?: number | null;
  college?: CollegeDTO | null;
  collegeDepartmentId?: number | null;
  collegeDepartment?: DepartmentDTO | null;
  collegeName?: string | null;
  departmentName?: string | null;
  registrationKey?: string | null;
  hasPassword?: boolean;
  isBeyondGracePeriod?: boolean;
  daysRemaining?: number;
  hoursRemaining?: number;
  requiresRegistrationKey?: boolean;
  requiresCollegeUpdate?: boolean;
  requiresPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileFormValues {
  fullName: string;
  nickname: string;
  isNicknameSame: boolean;
  email: string;
  emailType: 'college' | 'personal';
  registrationKey?: string;
  collegeName?: string;
  password?: string;
}

export interface UserBadgeInfo {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  requiredQuestions: number;
  currentCount: number;
  isUnlocked: boolean;
  category?: string;
  badgeType?: 'milestone' | 'topic';
}
