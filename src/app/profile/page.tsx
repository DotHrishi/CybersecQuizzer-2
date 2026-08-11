import React from 'react';
import ProfileForm from '@/components/ProfileForm';

export const metadata = {
  title: 'My Profile | Cybersecurity Awareness & Digital Safety Programme',
  description: 'Manage full name, display nickname, and college/personal email credentials',
};

export default function ProfilePage() {
  return (
    <div className="py-8">
      <ProfileForm />
    </div>
  );
}
