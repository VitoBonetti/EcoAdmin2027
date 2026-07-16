import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DescriptionFormModalProps {
  isOpen: boolean;
  descriptionItem?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DescriptionFormModal({ isOpen, descriptionItem, onClose, onSuccess }: DescriptionFormModalProps) {
  const [formData, setFormData] = useState({ description: '', category_id: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories for the dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        const token = localStorage.getItem('token');
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/costs/categories/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setCategories(data);
          }
        } catch (error) {
          toast.error('Failed to load categories for dropdown');
        }
      };
      fetchCategories();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (descriptionItem) {
      setFormData({
        description: descriptionItem.description || '',
        category_id: descriptionItem.category_id || ''
      });
    } else {
      setFormData({ description: '', category_id: '' });
    }
  }, [descriptionItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');

    const url = descriptionItem
      ? `${import.meta.env.VITE_API_URL}/costs/descriptions/${descriptionItem.id}`
      : `${import.meta.env.VITE_API_URL}/costs/descriptions/`;
    const method = descriptionItem ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save description');

      toast.success(`Description ${descriptionItem ? 'updated' : 'created'} successfully!`);
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{descriptionItem ? 'Edit Description' : 'New Description'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form id="description-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Parent Category *</label>
            <select
              required
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white"
            >
              <option value="" disabled>Select a category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description Name *</label>
            <input
              type="text" required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Printer Ink"
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white"
            />
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">Cancel</button>
          <button type="submit" form="description-form" disabled={isLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium">
            {isLoading ? 'Saving...' : 'Save Description'}
          </button>
        </div>
      </div>
    </div>
  );
}