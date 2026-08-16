export interface UserProfileDTO {
  id?: number;
  fullName: string;
  nickname: string;
  isNicknameSame: boolean;
  email: string;
  emailType: 'college' | 'personal';
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileFormValues {
  fullName: string;
  nickname: string;
  isNicknameSame: boolean;
  email: string;
  emailType: 'college' | 'personal';
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

