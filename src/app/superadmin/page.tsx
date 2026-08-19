import SuperAdminDashboard from '@/components/SuperAdminDashboard';

export const metadata = {
  title: 'Super Admin Portal | Cybersecurity Awareness & Digital Safety Programme',
  description: 'Manage admin accounts and question bank credentials',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperAdminPage() {
  return <SuperAdminDashboard />;
}
