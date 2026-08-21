import SuperAdminDashboard from '@/components/SuperAdminDashboard';

export const metadata = {
  title: 'System Admin Portal | Cybersecurity Awareness & Digital Safety Programme',
  description: 'Manage admin accounts and institution credentials',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SuperAdminPage() {
  return <SuperAdminDashboard />;
}
