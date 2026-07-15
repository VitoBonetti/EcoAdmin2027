import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Eye, ArrowUpDown, Check, Download, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

import ConfirmModal from '../components/modals/ConfirmModal';
import CustomerViewModal from '../components/modals/CustomerViewModal';
import CustomerFormModal from '../components/modals/CustomerFormModal';

const ITEMS_PER_PAGE = 20;

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // URL-backed State (Persists on Back/Forward navigation)
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'active'; // 'active' | 'inactive'
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortCol = searchParams.get('sort') || 'name';
  const sortDir = searchParams.get('dir') || 'asc';

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal States
  const [viewCustomer, setViewCustomer] = useState<any | null>(null);
  const [formCustomer, setFormCustomer] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]); // Array for bulk delete

  // 1. Fetch Customers
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

  // 2. URL State Updater Helper
  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => params.set(key, value));
    setSearchParams(params);
  };

  // 3. Filtering logic (Search + Tabs)
  const filteredCustomers = customers.filter(customer => {
    // Tab Filter
    if (activeTab === 'active' && !customer.is_active) return false;
    if (activeTab === 'inactive' && customer.is_active) return false;

    // Search Filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(term) ||
      customer.city?.toLowerCase().includes(term) ||
      customer.nation?.toLowerCase().includes(term) ||
      customer.email?.toLowerCase().includes(term)
    );
  });

  // 4. Sorting Logic
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let valA = a[sortCol] || '';
    let valB = b[sortCol] || '';

    // Handle booleans (status)
    if (sortCol === 'is_active') {
      valA = a.is_active ? 1 : 0;
      valB = b.is_active ? 1 : 0;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // 5. Pagination Logic
  const totalPages = Math.max(1, Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE));

  // Safety check: if searching pushes us past the available pages, drop to page 1
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) updateParams({ page: '1' });
  }, [sortedCustomers.length, currentPage, totalPages]);

  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 6. Actions
  const handleSort = (col: string) => {
    if (sortCol === col) {
      updateParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      updateParams({ sort: col, dir: 'asc' });
    }
  };

  const handleBulkDelete = async () => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading('Deleting customers...');
    try {
      // Loop deletes (since backend doesn't have a bulk delete endpoint)
      await Promise.all(deleteIds.map(id =>
        fetch(`${import.meta.env.VITE_API_URL}/customers/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ));
      toast.success(`${deleteIds.length} customer(s) deleted`, { id: toastId });
      setCustomers(prev => prev.filter(c => !deleteIds.includes(c.id)));
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete some customers', { id: toastId });
    } finally {
      setDeleteIds([]);
    }
  };

  const handleBulkExport = () => {
    const dataToExport = customers
      .filter(c => selectedIds.includes(c.id))
      .map(c => ({
        Name: c.name,
        Email: c.email || '',
        Phone: c.phone || '',
        Address: c.address || '',
        City: c.city || '',
        Nation: c.nation || '',
        Status: c.is_active ? 'Active' : 'Inactive'
      }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${selectedIds.length} customer(s) exported!`);
    setSelectedIds([]); // Clear selection after export
  };

  // 7. UI Sub-components
  const SortableHeader = ({ label, col }: { label: string, col: string }) => (
    <th
      className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors group select-none"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={14} className={`${sortCol === col ? 'text-green-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-all`} />
      </div>
    </th>
  );

  const SexyCheckbox = ({ checked, onChange }: { checked: boolean, onChange: (e: any) => void }) => (
    <label className="relative flex items-center cursor-pointer">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center peer-checked:bg-green-500 peer-checked:border-green-500 transition-all">
        <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
      </div>
    </label>
  );

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedCustomers.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your client database.</p>
        </div>
        <button onClick={() => { setFormCustomer(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={20} /> New Customer
        </button>
      </div>

      {/* Toolbar & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-2 rounded-xl border border-white dark:border-gray-800 shadow-sm">
        <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-lg">
          <button
            onClick={() => updateParams({ tab: 'active', page: '1' })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Active
          </button>
          <button
            onClick={() => updateParams({ tab: 'inactive', page: '1' })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'inactive' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Inactive
          </button>
        </div>

        <div className="flex items-center w-full md:w-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1.5 flex-1 max-w-md border border-gray-200 dark:border-gray-700">
          <Search size={18} className="text-gray-400" />
          <input
            type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); updateParams({ page: '1' }); }}
            placeholder="Search current tab..."
            className="bg-transparent border-none outline-none w-full px-2 text-sm text-gray-700 dark:text-gray-200"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 w-12">
                  <SexyCheckbox
                    checked={paginatedCustomers.length > 0 && selectedIds.length === paginatedCustomers.length}
                    onChange={toggleAll}
                  />
                </th>
                <SortableHeader label="Name" col="name" />
                <SortableHeader label="Location" col="nation" />
                <SortableHeader label="Email" col="email" />
                <SortableHeader label="Status" col="is_active" />
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No customers found.</td></tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id} className={`hover:bg-white/50 dark:hover:bg-gray-800/30 transition-colors group ${selectedIds.includes(customer.id) ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                    <td className="px-6 py-4">
                      <SexyCheckbox checked={selectedIds.includes(customer.id)} onChange={() => toggleOne(customer.id)} />
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white cursor-pointer hover:text-green-600 dark:hover:text-green-400" onClick={() => setViewCustomer(customer)}>
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
                        <button onClick={() => setDeleteIds([customer.id])} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedCustomers.length)} of {sortedCustomers.length} results
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => updateParams({ page: (currentPage - 1).toString() })}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => updateParams({ page: (currentPage + 1).toString() })}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-gray-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-fade-in z-40">
          <span className="font-semibold text-sm">{selectedIds.length} selected</span>
          <div className="h-5 w-px bg-gray-700 dark:bg-gray-300"></div>
          <div className="flex gap-2">
            <button onClick={handleBulkExport} className="flex items-center gap-2 text-sm font-medium hover:text-green-400 dark:hover:text-green-600 transition-colors px-2 py-1">
              <Download size={16} /> Export
            </button>
            <button onClick={() => toast("Share feature coming soon!", { icon: '🚧' })} className="flex items-center gap-2 text-sm font-medium hover:text-blue-400 dark:hover:text-blue-600 transition-colors px-2 py-1">
              <Share2 size={16} /> Share
            </button>
            <button onClick={() => setDeleteIds(selectedIds)} className="flex items-center gap-2 text-sm font-medium hover:text-red-400 dark:hover:text-red-600 transition-colors px-2 py-1">
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={deleteIds.length > 0}
        title={deleteIds.length > 1 ? "Bulk Delete" : "Delete Customer"}
        message={`Are you sure you want to delete ${deleteIds.length} customer(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onClose={() => setDeleteIds([])}
      />
      <CustomerViewModal isOpen={!!viewCustomer} customer={viewCustomer} onClose={() => setViewCustomer(null)} onEdit={(c) => { setViewCustomer(null); setFormCustomer(c); setIsFormOpen(true); }} />
      <CustomerFormModal isOpen={isFormOpen} customer={formCustomer} onClose={() => setIsFormOpen(false)} onSuccess={() => fetchCustomers()} />
    </div>
  );
}