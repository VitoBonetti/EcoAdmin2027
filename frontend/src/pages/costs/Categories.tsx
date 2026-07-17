import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ArrowUpDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import ConfirmModal from '../../components/modals/ConfirmModal';
import CategoryFormModal from '../../components/modals/CategoryFormModal';

const ITEMS_PER_PAGE = 20;

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortCol = searchParams.get('sort') || 'category';
  const sortDir = searchParams.get('dir') || 'asc';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formCategory, setFormCategory] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/costs/categories/`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => params.set(key, value));
    setSearchParams(params);
  };

  const filteredCategories = categories.filter(cat => {
    if (!searchTerm) return true;
    return cat.category?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    let valA = a[sortCol]?.toLowerCase() || '';
    let valB = b[sortCol]?.toLowerCase() || '';
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) updateParams({ page: '1' });
  }, [sortedCategories.length, currentPage, totalPages]);

  const paginatedCategories = sortedCategories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (col: string) => {
    if (sortCol === col) updateParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    else updateParams({ sort: col, dir: 'asc' });
  };

  const handleBulkDelete = async () => {
    const toastId = toast.loading('Deleting categories...');
    try {
      await Promise.all(deleteIds.map(id =>
        fetch(`${import.meta.env.VITE_API_URL}/costs/categories/${id}`, { method: 'DELETE'})
      ));
      toast.success(`${deleteIds.length} category(s) deleted`, { id: toastId });
      setCategories(prev => prev.filter(c => !deleteIds.includes(c.id)));
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete some categories. Make sure they are not in use.', { id: toastId });
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

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-4xl mx-auto">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cost Categories</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage broad classifications for your expenses.</p>
        </div>
        <button onClick={() => { setFormCategory(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={20} /> New Category
        </button>
      </div>

      <div className="flex bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-2 rounded-xl border border-white dark:border-gray-800 shadow-sm max-w-md">
        <Search size={18} className="text-gray-400 ml-2" />
        <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); updateParams({ page: '1' }); }} placeholder="Search categories..." className="bg-transparent border-none outline-none w-full px-3 py-1 text-sm text-gray-700 dark:text-gray-200" />
      </div>

      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 w-12"><SexyCheckbox checked={paginatedCategories.length > 0 && selectedIds.length === paginatedCategories.length} onChange={(e) => setSelectedIds(e.target.checked ? paginatedCategories.map(c => c.id) : [])} /></th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors group select-none w-full" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Category Name <ArrowUpDown size={14} className={`${sortCol === 'category' ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-all`} /></div>
                </th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : paginatedCategories.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">No categories found.</td></tr>
              ) : (
                paginatedCategories.map((cat) => (
                  <tr key={cat.id} className={`hover:bg-white/50 dark:hover:bg-gray-800/30 transition-colors group ${selectedIds.includes(cat.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-6 py-4"><SexyCheckbox checked={selectedIds.includes(cat.id)} onChange={() => setSelectedIds(prev => prev.includes(cat.id) ? prev.filter(x => x !== cat.id) : [...prev, cat.id])} /></td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{cat.category}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormCategory(cat); setIsFormOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteIds([cat.id])} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg"><Trash2 size={16} /></button>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedCategories.length)} of {sortedCategories.length} results</span>
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

      <ConfirmModal isOpen={deleteIds.length > 0} title={deleteIds.length > 1 ? "Bulk Delete" : "Delete Category"} message={`Are you sure you want to delete ${deleteIds.length} category(s)?`} onConfirm={handleBulkDelete} onClose={() => setDeleteIds([])} />
      <CategoryFormModal isOpen={isFormOpen} categoryItem={formCategory} onClose={() => setIsFormOpen(false)} onSuccess={() => fetchCategories()} />
    </div>
  );
}