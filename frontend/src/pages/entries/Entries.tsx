import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ArrowUpDown, Check, ChevronLeft, ChevronRight, FileText, Download, Archive, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

import ConfirmModal from '../../components/modals/ConfirmModal';
import EntryFormModal from '../../components/modals/EntryFormModal';

const ITEMS_PER_PAGE = 20;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value || 0);
};

export default function Entries() {
  const [entries, setEntries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all'; // 'all', 'invoices', 'quotations', 'commissions', 'archived'
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortCol = searchParams.get('sort') || 'date';
  const sortDir = searchParams.get('dir') || 'desc';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formEntry, setFormEntry] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  // 1. Fetch Lookup Maps (Customers & Suppliers) ONCE on mount
  useEffect(() => {
    const fetchOptions = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/entries/form-options/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          console.log("FORM OPTIONS LOADED:", data);
          setCustomers(data.customers || []);
          setSuppliers(data.suppliers || []);
          setCompanies(data.companies || []); // NEW: Save companies
        }
      } catch (err) {
        console.error("Failed to load options");
      }
    };
    fetchOptions();
  }, []);

  const custMap = useMemo(() => customers.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {}), [customers]);
  const suppMap = useMemo(() => suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}), [suppliers]);

  // 2. Fetch Entries based on the Active Tab
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');

    // Map the UI tab to the correct backend endpoint
    let endpoint = '/entries/';
    if (activeTab === 'invoices') endpoint = '/entries/invoices/';
    else if (activeTab === 'quotations') endpoint = '/entries/quotations/';
    else if (activeTab === 'commissions') endpoint = '/entries/commissions/';
    else if (activeTab === 'archived') endpoint = '/entries/archived/';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setEntries(await response.json());
      } else {
        toast.error('Failed to load entries');
      }
    } catch (error) {
      toast.error('Network error');
    } finally {
      setIsLoading(false);
      setSelectedIds([]); // Clear selections when changing tabs
    }
  }, [activeTab]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => params.set(key, value));
    setSearchParams(params);
  };

  // 3. Filter & Sort Logic
  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const entityName = entry.is_commission
      ? (suppMap[entry.supplier_id]?.toLowerCase() || '')
      : (custMap[entry.customer_id]?.toLowerCase() || '');

    return (
      entry.invoice_reference?.toLowerCase().includes(term) ||
      entry.quotation_reference?.toLowerCase().includes(term) ||
      entityName.includes(term)
    );
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let valA = a[sortCol] || '';
    let valB = b[sortCol] || '';
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / ITEMS_PER_PAGE));
  const paginatedEntries = sortedEntries.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (col: string) => {
    if (sortCol === col) updateParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    else updateParams({ sort: col, dir: 'asc' });
  };

  // 4. Actions: PDF, Archive, Delete
  const handleDownloadPDF = async (id: string, ref: string) => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading('Generating PDF...');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/entries/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ref || 'Document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('PDF Downloaded', { id: toastId });
    } catch (err) {
      toast.error('Failed to generate PDF', { id: toastId });
    }
  };

  const handleToggleArchive = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/entries/${id}/archive-state/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Archive state updated');
        fetchEntries(); // Refetch the current tab
      }
    } catch (err) {
      toast.error('Failed to update archive state');
    }
  };

  const handleBulkDelete = async () => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading('Deleting entries...');
    try {
      await Promise.all(deleteIds.map(id =>
        fetch(`${import.meta.env.VITE_API_URL}/entries/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }})
      ));
      toast.success(`${deleteIds.length} entry(s) deleted`, { id: toastId });
      fetchEntries();
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete entries', { id: toastId });
    } finally {
      setDeleteIds([]);
    }
  };

  const SexyCheckbox = ({ checked, onChange }: { checked: boolean, onChange: (e: any) => void }) => (
    <label className="relative flex items-center cursor-pointer">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-all">
        <Check size={14} className="text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
      </div>
    </label>
  );

  const getStatusBadge = (entry: any) => {
    if (entry.is_paid) return <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-md text-xs font-medium border border-green-200 dark:border-green-800/50">Paid</span>;
    if (entry.overdue_date && new Date(entry.overdue_date) < new Date()) return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-md text-xs font-medium border border-red-200 dark:border-red-800/50">Overdue</span>;
    return <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2.5 py-1 rounded-md text-xs font-medium border border-yellow-200 dark:border-yellow-800/50">Pending</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents & Entries</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage invoices, quotations, and commissions.</p>
        </div>
        <button onClick={() => { setFormEntry(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={20} /> Create Entry
        </button>
      </div>

      {/* Toolbar & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-2 rounded-xl border border-white dark:border-gray-800 shadow-sm">
        <div className="flex bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          {['all', 'invoices', 'quotations', 'commissions', 'archived'].map((tab) => (
            <button key={tab} onClick={() => updateParams({ tab, page: '1' })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <a href={`${import.meta.env.VITE_API_URL}/entries/export/${activeTab === 'all' ? 'entries' : activeTab}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
            <Download size={16} /> Export
          </a>
          <div className="flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1.5 flex-1 max-w-xs border border-gray-200 dark:border-gray-700">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); updateParams({ page: '1' }); }} placeholder="Search reference or client..." className="bg-transparent border-none outline-none w-full px-2 text-sm text-gray-700 dark:text-gray-200" />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-4 w-12"><SexyCheckbox checked={paginatedEntries.length > 0 && selectedIds.length === paginatedEntries.length} onChange={(e) => setSelectedIds(e.target.checked ? paginatedEntries.map(c => c.id) : [])} /></th>
                <th className="px-4 py-4 font-medium">Reference</th>
                <th className="px-4 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('date')}>Date <ArrowUpDown size={12} className="inline ml-1 opacity-50" /></th>
                <th className="px-4 py-4 font-medium">Client / Supplier</th>
                <th className="px-4 py-4 font-medium text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('final_total')}>Total <ArrowUpDown size={12} className="inline ml-1 opacity-50" /></th>
                <th className="px-4 py-4 font-medium text-center">Status</th>
                <th className="px-4 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading documents...</td></tr>
              ) : paginatedEntries.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No entries found for this tab.</td></tr>
              ) : (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id} className={`hover:bg-white/50 dark:hover:bg-gray-800/30 transition-colors group ${selectedIds.includes(entry.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-4"><SexyCheckbox checked={selectedIds.includes(entry.id)} onChange={() => setSelectedIds(prev => prev.includes(entry.id) ? prev.filter(x => x !== entry.id) : [...prev, entry.id])} /></td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText size={16} className={entry.is_quotation && !entry.is_invoice ? "text-purple-500" : entry.is_commission ? "text-orange-500" : "text-blue-500"} />
                        {entry.is_quotation && !entry.is_invoice ? entry.quotation_reference : entry.invoice_reference || 'Draft'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{new Date(entry.date).toLocaleDateString()}</div>
                      {entry.overdue_date && <div className="text-xs text-gray-400">Due: {new Date(entry.overdue_date).toLocaleDateString()}</div>}
                    </td>
                    <td className="px-4 py-4 font-medium">
                      {entry.is_commission ? suppMap[entry.supplier_id] || 'Unknown Supplier' : custMap[entry.customer_id] || 'Unknown Customer'}
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(entry.final_total)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {getStatusBadge(entry)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDownloadPDF(entry.id, entry.invoice_reference || entry.quotation_reference)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg tooltip" title="Download PDF"><Download size={16} /></button>
                        <button onClick={() => handleToggleArchive(entry.id)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-800 rounded-lg tooltip" title={entry.is_archived ? "Unarchive" : "Archive"}><Archive size={16} /></button>
                        <button onClick={() => { setFormEntry(entry); setIsFormOpen(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-gray-800 rounded-lg tooltip" title="Edit Entry"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteIds([entry.id])} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg tooltip" title="Delete"><Trash2 size={16} /></button>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedEntries.length)} of {sortedEntries.length} results</span>
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
          <button onClick={() => setDeleteIds(selectedIds)} className="flex items-center gap-2 text-sm font-medium hover:text-red-400 dark:hover:text-red-600 transition-colors px-2 py-1"><Trash2 size={16} /> Delete</button>
        </div>
      )}

      <ConfirmModal isOpen={deleteIds.length > 0} title={deleteIds.length > 1 ? "Bulk Delete" : "Delete Entry"} message={`Are you sure you want to delete ${deleteIds.length} document(s)?`} onConfirm={handleBulkDelete} onClose={() => setDeleteIds([])} />

      <EntryFormModal isOpen={isFormOpen} entryItem={formEntry} onClose={() => setIsFormOpen(false)} onSuccess={fetchEntries} customers={customers} suppliers={suppliers} companies={companies} />
    </div>
  );
}