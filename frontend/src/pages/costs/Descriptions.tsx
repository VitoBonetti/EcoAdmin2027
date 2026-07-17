import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, ArrowUpDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

import ConfirmModal from '../../components/modals/ConfirmModal';
import DescriptionFormModal from '../../components/modals/DescriptionFormModal';

const ITEMS_PER_PAGE = 20;

export default function Descriptions() {
  const [descriptions, setDescriptions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // NEW: Store categories for lookup
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortCol = searchParams.get('sort') || 'description';
  const sortDir = searchParams.get('dir') || 'asc';

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formDescription, setFormDescription] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  // 1. Fetch BOTH descriptions and categories simultaneously
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [descRes, catRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/costs/descriptions/`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/costs/categories/`, { headers })
      ]);

      if (descRes.ok && catRes.ok) {
        const [descData, catData] = await Promise.all([descRes.json(), catRes.json()]);
        setDescriptions(descData);
        setCategories(catData);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Create a fast lookup dictionary { "category_id": "Category Name" }
  const categoryMap = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat.id] = cat.category;
      return acc;
    }, {} as Record<string, string>);
  }, [categories]);

  const updateParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, value]) => params.set(key, value));
    setSearchParams(params);
  };

  // 3. Update Filtering to use the mapped Category Name
  const filteredDescriptions = descriptions.filter(desc => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const catName = categoryMap[desc.category_id]?.toLowerCase() || '';

    return (
      desc.description?.toLowerCase().includes(term) ||
      catName.includes(term)
    );
  });

  // 4. Update Sorting to sort by the mapped Category Name
  const sortedDescriptions = [...filteredDescriptions].sort((a, b) => {
    let valA = a[sortCol]?.toLowerCase() || '';
    let valB = b[sortCol]?.toLowerCase() || '';

    // If sorting by category, grab the actual name from the map instead of the UUID
    if (sortCol === 'category') {
      valA = categoryMap[a.category_id]?.toLowerCase() || '';
      valB = categoryMap[b.category_id]?.toLowerCase() || '';
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedDescriptions.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) updateParams({ page: '1' });
  }, [sortedDescriptions.length, currentPage, totalPages]);

  const paginatedDescriptions = sortedDescriptions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSort = (col: string) => {
    if (sortCol === col) updateParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    else updateParams({ sort: col, dir: 'asc' });
  };

  const handleBulkDelete = async () => {
    const toastId = toast.loading('Deleting descriptions...');
    try {
      await Promise.all(deleteIds.map(id =>
        fetch(`${import.meta.env.VITE_API_URL}/costs/descriptions/${id}`, { method: 'DELETE'})
      ));
      toast.success(`${deleteIds.length} description(s) deleted`, { id: toastId });
      setDescriptions(prev => prev.filter(d => !deleteIds.includes(d.id)));
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to delete some descriptions. Make sure they are not in use.', { id: toastId });
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
    <div className="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cost Descriptions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage specific line-items within your categories.</p>
        </div>
        <button onClick={() => { setFormDescription(null); setIsFormOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm">
          <Plus size={20} /> New Description
        </button>
      </div>

      <div className="flex bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-2 rounded-xl border border-white dark:border-gray-800 shadow-sm max-w-md">
        <Search size={18} className="text-gray-400 ml-2" />
        <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); updateParams({ page: '1' }); }} placeholder="Search descriptions or categories..." className="bg-transparent border-none outline-none w-full px-3 py-1 text-sm text-gray-700 dark:text-gray-200" />
      </div>

      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 w-12"><SexyCheckbox checked={paginatedDescriptions.length > 0 && selectedIds.length === paginatedDescriptions.length} onChange={(e) => setSelectedIds(e.target.checked ? paginatedDescriptions.map(d => d.id) : [])} /></th>

                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors group select-none" onClick={() => handleSort('description')}>
                  <div className="flex items-center gap-1">Description <ArrowUpDown size={14} className={`${sortCol === 'description' ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-all`} /></div>
                </th>

                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors group select-none" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">Parent Category <ArrowUpDown size={14} className={`${sortCol === 'category' ? 'text-blue-600 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-all`} /></div>
                </th>

                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : paginatedDescriptions.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No descriptions found.</td></tr>
              ) : (
                paginatedDescriptions.map((desc) => (
                  <tr key={desc.id} className={`hover:bg-white/50 dark:hover:bg-gray-800/30 transition-colors group ${selectedIds.includes(desc.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                    <td className="px-6 py-4"><SexyCheckbox checked={selectedIds.includes(desc.id)} onChange={() => setSelectedIds(prev => prev.includes(desc.id) ? prev.filter(x => x !== desc.id) : [...prev, desc.id])} /></td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{desc.description}</td>
                    <td className="px-6 py-4">
                      {/* 5. Display the mapped category name! */}
                      <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-medium border border-gray-200 dark:border-gray-700">
                        {categoryMap[desc.category_id] || 'Unknown Category'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setFormDescription(desc); setIsFormOpen(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg"><Edit2 size={16} /></button>
                        <button onClick={() => setDeleteIds([desc.id])} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg"><Trash2 size={16} /></button>
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
            <span className="text-sm text-gray-500 dark:text-gray-400">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedDescriptions.length)} of {sortedDescriptions.length} results</span>
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

      <ConfirmModal isOpen={deleteIds.length > 0} title={deleteIds.length > 1 ? "Bulk Delete" : "Delete Description"} message={`Are you sure you want to delete ${deleteIds.length} description(s)?`} onConfirm={handleBulkDelete} onClose={() => setDeleteIds([])} />
      <DescriptionFormModal isOpen={isFormOpen} descriptionItem={formDescription} onClose={() => setIsFormOpen(false)} onSuccess={() => fetchData()} />
    </div>
  );
}