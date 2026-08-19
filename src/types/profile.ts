export interface CollegeDTO {
  id: number;
  name: string;
  identifier: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileDTO {
  id?: number;
  fullName: string;
  nickname: string;
  isNicknameSame: boolean;
  email: string;
  emailType: 'college' | 'personal';
  collegeId: number;
  college?: CollegeDTO;
  hasPassword?: boolean;
  isBeyondGracePeriod?: boolean;
  daysRemaining?: number;
  hoursRemaining?: number;
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
  collegeName: string;
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


