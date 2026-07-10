import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';

export default async function UserLayout({ children }) {
  const user = await getServerUser();
  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');
  return (
    <div className="app-shell">
      <Navbar user={user} />
      <main className="app-main">{children}</main>
    </div>
  );
}
