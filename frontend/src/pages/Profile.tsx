import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const [formData, setFormData] = useState({ id: '', name: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Assuming you store the logged-in user object in localStorage during login
    const storedUserStr = localStorage.getItem('user');
    if (storedUserStr) {
      const storedUser = JSON.parse(storedUserStr);
      setFormData(prev => ({ ...prev, id: storedUser.id, name: storedUser.name, email: storedUser.email }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Updating profile...');

    // Only include the password if they typed a new one
    const payload: any = { name: formData.name, email: formData.email };
    if (formData.password.trim() !== '') {
      payload.password = formData.password;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${formData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();

      // Update the local storage with the new name/email so the UI updates
      localStorage.setItem('user', JSON.stringify(updatedUser));

      toast.success('Profile updated successfully!', { id: toastId });
      setFormData(prev => ({ ...prev, password: '' })); // Clear password field

      // Optional: Force a quick reload to update the initial in the Navbar
      setTimeout(() => window.location.reload(), 1000);

    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Update your personal information and security credentials.</p>
      </div>

      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Security</h3>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
              <p className="text-xs text-gray-500 mb-3">Leave this blank if you do not want to change your current password.</p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70"
            >
              <Save size={18} /> {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}