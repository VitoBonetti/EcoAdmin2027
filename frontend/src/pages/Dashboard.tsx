import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

// src/pages/Dashboard.tsx
export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back. Here is what's happening today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/70 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white dark:border-white/10 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-white shadow-inner mb-4"></div>
            <div className="h-4 bg-gray-900/20 dark:bg-white/20 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-900/10 dark:bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    </div>
  );
}