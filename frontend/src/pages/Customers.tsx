import { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Phone, Mail } from 'lucide-react';

// Matches CustomerModelResponse from schema.py
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  nation?: string;
  is_active: boolean;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/customers/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCustomers(data);
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your client database.</p>
        </div>
        <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={20} />
          New Customer
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <Search size={20} className="text-gray-400 ml-2" />
        <input
          type="text"
          placeholder="Search customers..."
          className="bg-transparent border-none outline-none w-full px-3 py-1 text-gray-700 dark:text-gray-200 placeholder-gray-400"
        />
      </div>

      {/* Data Table */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading customers...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No customers found.</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {customer.email && <div className="flex items-center gap-2"><Mail size={14} /> {customer.email}</div>}
                        {customer.phone && <div className="flex items-center gap-2"><Phone size={14} /> {customer.phone}</div>}
                        {!customer.email && !customer.phone && <span className="text-gray-400 italic">No contact info</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        {customer.city ? `${customer.city}${customer.nation ? `, ${customer.nation}` : ''}` : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${customer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}