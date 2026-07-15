import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-green-100 via-white to-white dark:from-green-950/20 dark:via-gray-950 dark:to-gray-950">
      <main className="flex-1 h-full overflow-y-auto pr-28 relative">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      <Sidebar />
    </div>
  );
}