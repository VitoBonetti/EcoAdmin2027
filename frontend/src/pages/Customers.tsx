import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/modals/ConfirmModal';
import CustomerViewModal from '../components/modals/CustomerViewModal';
import CustomerFormModal from '../components/modals/CustomerFormModal';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [viewCustomer, setViewCustomer] = useState<any | null>(null);
  const [formCustomer, setFormCustomer] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 1. Simplified fetch function (no more search queries sent to the backend)
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
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
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // 2. Real-time Frontend Filtering
  // This exactly mirrors your backend search fields, but happens instantly in the browser
  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(term) ||
      customer.city?.toLowerCase().includes(term) ||
      customer.nation?.toLowerCase().includes(term) ||
      customer.email?.toLowerCase().includes(term) ||
      customer.address?.toLowerCase().includes(term) ||
      customer.postcode?.toLowerCase().includes(term)
    );
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/customers/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Customer deleted');
        setCustomers(prev => prev.filter(c => c.id !== deleteId));
      } else {
        toast.error('Failed to delete customer');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your client database.</p>
        </div>
        <button
          onClick={() => { setFormCustomer(null); setIsFormOpen(true); }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={20} /> New Customer
        </button>
      </div>

      {/* 3. Changed from <form> to <div> since we don't need to submit anymore */}
      <div className="flex items-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-2 rounded-xl border border-white dark:border-gray-800 shadow-sm">
        <Search size={20} className="text-gray-400 ml-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // State updates instantly on keystroke
          placeholder="Search by name, city, nation, or email..."
          className="bg-transparent border-none outline-none w-full px-3 py-1 text-gray-700 dark:text-gray-200 placeholder-gray-400"
        />
      </div>

      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No customers found.</td></tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td
                      className="px-6 py-4 font-bold text-gray-900 dark:text-white cursor-pointer hover:text-green-600 dark:hover:text-green-400"
                      onClick={() => setViewCustomer(customer)}
                    >
                      {customer.name}
                    </td>
                    <td className="px-6 py-4">{customer.nation || '-'}</td>
                    <td className="px-6 py-4">{customer.email || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${customer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewCustomer(customer)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg"><Eye size={16} /></button>
                        <button onClick={() => { setFormCustomer(customer); setIsFormOpen(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-gray-800 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteId(customer.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals remain exactly the same */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
      <CustomerViewModal
        isOpen={!!viewCustomer}
        customer={viewCustomer}
        onClose={() => setViewCustomer(null)}
        onEdit={(c) => { setViewCustomer(null); setFormCustomer(c); setIsFormOpen(true); }}
      />
      <CustomerFormModal
        isOpen={isFormOpen}
        customer={formCustomer}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => fetchCustomers()}
      />
    </div>
  );
}