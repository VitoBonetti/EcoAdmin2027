import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // FastAPI expects x-www-form-urlencoded where email is mapped to 'username'
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!response.ok) throw new Error('Invalid credentials');

      const data = await response.json();
      localStorage.setItem('isAuthenticated', 'true');
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Theme Toggle Overlay */}
      <div className="absolute top-4 right-4 flex gap-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-800">
        <button onClick={() => setTheme('light')} className={`p-2 rounded-full ${theme === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-50 hover:opacity-100'}`}><Sun size={18} /></button>
        <button onClick={() => setTheme('dark')} className={`p-2 rounded-full ${theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-50 hover:opacity-100'}`}><Moon size={18} /></button>
        <button onClick={() => setTheme('system')} className={`p-2 rounded-full ${theme === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'opacity-50 hover:opacity-100'}`}><Monitor size={18} /></button>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Welcome back</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Enter your details to sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}