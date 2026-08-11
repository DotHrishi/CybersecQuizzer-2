import AdminDashboard from '@/components/AdminDashboard';

export const metadata = {
  title: 'Admin Panel | Cybersecurity Awareness & Digital Safety Programme',
  description: 'Manage question bank, edit questions, import/export, and reset leaderboards',
};

export default function AdminPage() {
  return <AdminDashboard />;
}
