import { getServerUser } from '@/lib/auth';
import UserSidebar from '@/components/UserSidebar';

export default async function PublicLayout({ children }) {
  const user = await getServerUser();
  return (
    <div className="app-shell">
      <UserSidebar user={user} />
      <main className="app-main" style={{ minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
