import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface CategoryFormModalProps {
  isOpen: boolean;
  categoryItem?: any; // If provided, we are in Edit mode
  onClose: () => void;
  onSuccess: () => void;
}

export default function CategoryFormModal({ isOpen, categoryItem, onClose, onSuccess }: CategoryFormModalProps) {
  const [formData, setFormData] = useState({ category: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (categoryItem) {
      setFormData({ category: categoryItem.category || '' });
    } else {
      setFormData({ category: '' });
    }
  }, [categoryItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Using the categories endpoints defined in costs.py
    const url = categoryItem
      ? `${import.meta.env.VITE_API_URL}/costs/categories/${categoryItem.id}`
      : `${import.meta.env.VITE_API_URL}/costs/categories/`;
    const method = categoryItem ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save category');

      toast.success(`Category ${categoryItem ? 'updated' : 'created'} successfully!`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{categoryItem ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form id="category-form" onSubmit={handleSubmit} className="p-6">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category Name *</label>
            <input
              type="text" required
              value={formData.category}
              onChange={(e) => setFormData({ category: e.target.value })}
              placeholder="e.g. Office Supplies"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white"
            />
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">Cancel</button>
          <button type="submit" form="category-form" disabled={isLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium">
            {isLoading ? 'Saving...' : 'Save Category'}
          </button>
        </div>
      </div>
    </div>
  );
}