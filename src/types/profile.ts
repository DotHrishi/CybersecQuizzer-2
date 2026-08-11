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
