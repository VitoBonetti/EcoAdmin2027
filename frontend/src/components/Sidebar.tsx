import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Wallet,
  FileText,
  Users,
  Truck,
  Building2,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  User,
  LogOut,
  Settings
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Sidebar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/users/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Logout failed", err);
      }
    }
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const NavItem = ({ icon: Icon, to, tooltip }: { icon: any, to: string, tooltip: string }) => (
    <div className="relative group w-full flex justify-center">
      <NavLink
        to={to}
        onClick={() => setOpenMenu(null)}
        className={({ isActive }) =>
          `p-3 rounded-xl transition-all duration-200 ${
            isActive
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
          }`
        }
      >
        <Icon size={22} strokeWidth={1.5} />
      </NavLink>
      {/* Tooltip */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap dark:bg-gray-700 z-50">
        {tooltip}
      </div>
    </div>
  );

  return (
    <aside
      ref={sidebarRef}
      className="fixed right-0 top-0 h-screen w-16 flex flex-col justify-between py-4 bg-white/40 dark:bg-black/30 backdrop-blur-3xl border-l-2 border-white/80 dark:border-white/10 shadow-[-15px_0_30px_-5px_rgba(0,0,0,0.15)] z-40 shrink-0"
    >
      {/* TOP NAVIGATION */}
      <nav className="flex flex-col items-center gap-4 w-full">
        <NavItem icon={Home} to="/dashboard" tooltip="Dashboard" />

        {/* Costs with Submenu */}
        <div className="relative group w-full flex justify-center">
          <button
            onClick={() => toggleMenu('costs')}
            className={`p-3 rounded-xl transition-all duration-200 ${
              openMenu === 'costs'
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
            }`}
          >
            <Wallet size={22} strokeWidth={1.5} />
          </button>

          {openMenu === 'costs' && (
            <div className="absolute right-full mr-2 top-0 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-2 z-50 overflow-hidden">
              <div className="px-3 pb-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">Costs Menu</div>
              <NavLink to="/costs" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">All Costs</NavLink>
              <NavLink to="/costs/categories" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">Categories</NavLink>
              <NavLink to="/costs/descriptions" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400">Descriptions</NavLink>
            </div>
          )}
        </div>

        <NavItem icon={FileText} to="/entries" tooltip="Entries" />
        <NavItem icon={Users} to="/customers" tooltip="Customers" />
        <NavItem icon={Truck} to="/suppliers" tooltip="Suppliers" />
        <NavItem icon={Building2} to="/company" tooltip="My Company" />
        <NavItem icon={ShieldCheck} to="/users" tooltip="Users" />
      </nav>

      {/* BOTTOM NAVIGATION */}
      <div className="flex flex-col items-center gap-4 w-full relative">
        <div className="w-8 h-px bg-gray-200 dark:bg-gray-800 my-1"></div>

        {/* Theme Toggle Submenu */}
        <div className="relative w-full flex justify-center">
          <button
            onClick={() => toggleMenu('theme')}
            className={`p-3 rounded-xl transition-all duration-200 ${openMenu === 'theme' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
          >
            {theme === 'light' ? <Sun size={20} strokeWidth={1.5}/> : theme === 'dark' ? <Moon size={20} strokeWidth={1.5}/> : <Monitor size={20} strokeWidth={1.5}/>}
          </button>

          {openMenu === 'theme' && (
            <div className="absolute right-full mr-2 bottom-0 w-36 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg py-2 z-50">
              <button onClick={() => {setTheme('light'); setOpenMenu(null);}} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${theme === 'light' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'} hover:bg-gray-50 dark:hover:bg-gray-800`}>
                <Sun size={16} /> Light
              </button>
              <button onClick={() => {setTheme('dark'); setOpenMenu(null);}} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${theme === 'dark' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'} hover:bg-gray-50 dark:hover:bg-gray-800`}>
                <Moon size={16} /> Dark
              </button>
              <button onClick={() => {setTheme('system'); setOpenMenu(null);}} className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${theme === 'system' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'} hover:bg-gray-50 dark:hover:bg-gray-800`}>
                <Monitor size={16} /> System
              </button>
            </div>
          )}
        </div>

        {/* User Info Submenu */}
        <div className="relative w-full flex justify-center">
          <button
            onClick={() => toggleMenu('user')}
            className={`p-2 rounded-xl transition-all duration-200 ${openMenu === 'user' ? 'ring-2 ring-blue-500/50' : 'hover:ring-2 hover:ring-gray-200 dark:hover:ring-gray-700'}`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white font-semibold shadow-sm">
              AD {/* Placeholder for Initials */}
            </div>
          </button>

          {openMenu === 'user' && (
            <div className="absolute right-full mr-2 bottom-0 w-64 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <p className="font-semibold text-gray-900 dark:text-white truncate">Admin User</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@example.com</p>
              </div>
              <div className="p-2">
                <button onClick={() => { navigate('/profile'); setOpenMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 rounded-lg transition-colors">
                  <Settings size={16} /> Edit Profile
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}