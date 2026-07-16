import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ArrowUpDown, Check, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

import ConfirmModal from '../../components/modals/ConfirmModal';
import CostFormModal from '../../components/modals/CostFormModal';

const ITEMS_PER_PAGE = 20;

// Helper to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value || 0);
};

export default function Costs() {
  const [costs, setCosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [descriptions, setDescriptions] = useState<any[]>([]);
  const [totals, setTotals] = useState({ debit_sum: 0, credit_sum: 0, balance_sum: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all'; // 'all', 'debit', 'credit'
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortCol = searchParams.get('sort') || 'date';
  const sortDir = searchParams.get('dir') || 'desc'; // Default newest first

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formCost, setFormCost] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  // 1. Fetch EVERYTHING simultaneously for maximum speed
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [costsRes, archivedRes, totalsRes, catRes, descRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/costs/`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/costs/archived/`, { headers }), // <-- NEW: Fetch your archived endpoint!
        fetch(`${import.meta.env.VITE_API_URL}/costs/totals/`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/costs/categories/`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/costs/descriptions/`, { headers })
      ]);

      // Combine active and archived costs into one array for the frontend to filter
      let combinedCosts: any[] = [];
      if (costsRes.ok) combinedCosts = [...combinedCosts, ...(await costsRes.json())];
      if (archivedRes.ok) combinedCosts = [...combinedCosts, ...(await archivedRes.json())];

      setCosts(combinedCosts);

      if (totalsRes.ok) setTotals(await totalsRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (descRes.ok) setDescriptions(await descRes.json());

    } catch (error) {
      toast.error('Failed to load costs data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Build Lookup Maps for Categories and Descriptions
  const categoryMap = useMemo(() => categories.reduce((acc, cat) => ({ ...acc, [cat.id]: cat.category }), {}), [categories]);
  const descMap = useMemo(() => descriptions.reduce((acc, desc) => ({ ...acc, [desc.id]: desc.description }), {}), [descriptions]);

  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => params.set(key, value));
    setSearchParams(params);
  };

  // 3. Filter Logic
  const filteredCosts = costs.filter(cost => {
    if (activeTab === 'archived' && !cost.is_archived) return false;
    if (activeTab !== 'archived' && cost.is_archived) return false;

    // Handle Type isolation
    if (activeTab === 'debit' && cost.is_credit) return false;
    if (activeTab === 'credit' && !cost.is_credit) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const catName = categoryMap[cost.category_id]?.toLowerCase() || '';
    const descName = descMap[cost.description_id]?.toLowerCase() || '';

    return (
      cost.invoice_nmb?.toLowerCase().includes(term) ||
      catName.includes(term) ||
      descName.includes(term)
    );
  });

  // 4. Sorting Logic
  const sortedCosts = [...filteredCosts].sort((a, b) => {
    let valA = a[sortCol];
    let valB = b[sortCol];

    if (sortCol === 'category') { valA = categoryMap[a.category_id] || ''; valB = categoryMap[b.category_id] || ''; }
    if (sortCol === 'description') { valA = descMap[a.description_id] || ''; valB = descMap[b.description_id] || ''; }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedCosts.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) updateParams({ page: '1' });
  }, [sortedCosts.length, currentPage, totalPages]);

  const paginatedCosts = sortedCosts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (col: string) => {
    if (sortCol === col) updateParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    else updateParams({ sort: col, dir: 'asc' });
  };

  const handleBulkDelete = async () => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading('Deleting entries...');
    try {
      await Promise.all(deleteIds.map(id =>
        fetch(`${import.meta.env.VITE_API_URL}/costs/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }})
      ));
      toast.success(`${deleteIds.length} entry(s) deleted`, { id: toastId });
      fetchData(); // Refetch to update the dashboard totals
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete entries', { id: toastId });
    } finally {
      setDeleteIds([]);
    }
  };

  const handleBulkExport = () => {
    const dataToExport = costs.filter(c => selectedIds.includes(c.id)).map(c => ({
      Date: c.date,
      Type: c.is_credit ? 'Credit/Refund' : 'Expense',
      Category: categoryMap[c.category_id] || '',
      Description: descMap[c.description_id] || '',
      Reference: c.reference || '',
      'Net Amount': c.amount,
      'BTW Amount': c.btw,
      'Total Amount': c.total
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costs");
    XLSX.writeFile(wb, `Costs_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success(`${selectedIds.length} entry(s) exported!`);
    setSelectedIds([]);
  };

  const SexyCheckbox = ({ checked, onChange }: { checked: boolean, onChange: (e: any) => void }) => (
    <label className="relative flex items-center cursor-pointer">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all">
        <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
      </div>
    </label>
  );

  const SortableHeader = ({ label, col, align = 'left' }: { label: string, col: string, align?: 'left' | 'right' }) => (
    <th className={`px-4 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors group select-none ${align === 'right' ? 'text-right' : 'text-left'}`} onClick={() => handleSort(col)}>
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <ArrowUpDown size={14} className={`${sortCol === col ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-all`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Costs & Expenses</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage your company expenditures.</p>
        </div>
        <button onClick={() => { setFormCost(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={20} /> Add Expense
        </button>
      </div>

      {/* Financial Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/80 dark:border-gray-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.debit_sum)}</p>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/80 dark:border-gray-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Credits</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.credit_sum)}</p>
          </div>
        </div>
        <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/80 dark:border-gray-800/80 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Net Balance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totals.balance_sum)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-2 rounded-xl border border-white dark:border-gray-800 shadow-sm">
        <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          {['all', 'debit', 'credit', 'archived'].map((tab) => (
            <button key={tab} onClick={() => updateParams({ tab, page: '1' })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              {tab === 'all' ? 'All Entries' : tab === 'debit' ? 'Expenses' : tab === 'credit' ? 'Credits' : 'Archived'}
            </button>
          ))}
        </div>
        <div className="flex items-center w-full md:w-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1.5 flex-1 max-w-md border border-gray-200 dark:border-gray-700">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); updateParams({ page: '1' }); }} placeholder="Search reference, category, or description..." className="bg-transparent border-none outline-none w-full px-2 text-sm text-gray-700 dark:text-gray-200" />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-4 w-12"><SexyCheckbox checked={paginatedCosts.length > 0 && selectedIds.length === paginatedCosts.length} onChange={(e) => setSelectedIds(e.target.checked ? paginatedCosts.map(c => c.id) : [])} /></th>
                <SortableHeader label="Date" col="date" />
                <SortableHeader label="Category" col="category" />
                <SortableHeader label="Description" col="description" />
                <th className="px-4 py-4 font-medium">Reference</th>
                <SortableHeader label="Total" col="total" align="right" />
                <th className="px-4 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading entries...</td></tr>
              ) : paginatedCosts.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No costs found.</td></tr>
              ) : (
                paginatedCosts.map((cost) => (
                  <tr key={cost.id} className={`hover:bg-white/50 dark:hover:bg-gray-800/30 transition-colors group ${selectedIds.includes(cost.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-4"><SexyCheckbox checked={selectedIds.includes(cost.id)} onChange={() => setSelectedIds(prev => prev.includes(cost.id) ? prev.filter(x => x !== cost.id) : [...prev, cost.id])} /></td>
                    <td className="px-4 py-4 text-gray-900 dark:text-white font-medium">{new Date(cost.cost_date).toLocaleDateString()}</td>
                    <td className="px-4 py-4">{categoryMap[cost.category_id] || '-'}</td>
                    <td className="px-4 py-4">{descMap[cost.description_id] || '-'}</td>
                    <td className="px-4 py-4 max-w-[150px] truncate">{cost.invoice_nmb || '-'}</td>
                    <td className={`px-4 py-4 text-right font-bold ${!cost.is_credit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {!cost.is_credit ? '-' : '+'}{formatCurrency(cost.euro_amount)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormCost(cost); setIsFormOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteIds([cost.id])} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedCosts.length)} of {sortedCosts.length} results</span>
            <div className="flex gap-2">
              <button onClick={() => updateParams({ page: (currentPage - 1).toString() })} disabled={currentPage === 1} className="p-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={20} /></button>
              <button onClick={() => updateParams({ page: (currentPage + 1).toString() })} disabled={currentPage === totalPages} className="p-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={20} /></button>
            </div>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 backdrop-blur-xl text-white dark:text-gray-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-fade-in z-40">
          <span className="font-semibold text-sm">{selectedIds.length} selected</span>
          <div className="h-5 w-px bg-gray-700 dark:bg-gray-300"></div>
          <button onClick={handleBulkExport} className="flex items-center gap-2 text-sm font-medium hover:text-blue-400 dark:hover:text-blue-600 transition-colors px-2 py-1"><Download size={16} /> Export</button>
          <button onClick={() => setDeleteIds(selectedIds)} className="flex items-center gap-2 text-sm font-medium hover:text-red-400 dark:hover:text-red-600 transition-colors px-2 py-1"><Trash2 size={16} /> Delete</button>
        </div>
      )}

      <ConfirmModal isOpen={deleteIds.length > 0} title={deleteIds.length > 1 ? "Bulk Delete" : "Delete Entry"} message={`Are you sure you want to delete ${deleteIds.length} cost entry(s)?`} onConfirm={handleBulkDelete} onClose={() => setDeleteIds([])} />
      <CostFormModal isOpen={isFormOpen} costItem={formCost} onClose={() => setIsFormOpen(false)} onSuccess={fetchData} />
    </div>
  );
}