import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({ children }) {
  const user = await getServerUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin' && user.role !== 'super-admin') redirect('/dashboard');
  return (
    <div className="app-shell">
      <AdminSidebar user={user} />
      <main className="app-main" style={{ minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}