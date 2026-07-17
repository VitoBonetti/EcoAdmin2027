import { useState, useEffect } from 'react';
import { X, Calculator, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// InputField is OUTSIDE to prevent React from losing focus on every keystroke
const InputField = ({ label, value, onChange, type = 'text', required = false, placeholder = '' }: any) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label} {required && '*'}</label>
    <input
      type={type} required={required} value={value} placeholder={placeholder} step={type === 'number' ? '0.01' : undefined}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white"
    />
  </div>
);

export default function CostFormModal({ isOpen, costItem, onClose, onSuccess }: any) {
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor((currentMonth + 3) / 3);

  // Mapped EXACTLY to CostModelBase
  const defaultState = {
    cost_date: new Date().toISOString().split('T')[0],
    is_credit: false,
    invoice_nmb: '',
    supplier: '',
    cost_note: '',
    year_reference: new Date().getFullYear(),
    quarter_reference: currentQuarter.toString(), // Must be a string
    is_archived: false,
    category_id: '',
    description_id: '',
    amount_no_btw: '',
    btw_percent: 21,
    amount_btw: '',
    euro_amount: ''
  };

  const [formData, setFormData] = useState<any>(defaultState);
  const [categories, setCategories] = useState<any[]>([]);
  const [descriptions, setDescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDesc, setIsFetchingDesc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchCategories = async () => {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/costs/categories/`);
          if (response.ok) setCategories(await response.json());
        } catch (error) {
          toast.error('Failed to load categories');
        }
      };
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.category_id) {
      const fetchDescriptions = async () => {
        setIsFetchingDesc(true);
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/costs/categories/${formData.category_id}/descriptions/`);
          if (response.ok) {
            const data = await response.json();
            setDescriptions(data);
            if (!data.find((d: any) => d.id === formData.description_id)) {
              setFormData((prev: any) => ({ ...prev, description_id: '' }));
            }
          }
        } catch (error) {
          toast.error('Failed to load descriptions');
        } finally {
          setIsFetchingDesc(false);
        }
      };
      fetchDescriptions();
    } else {
      setDescriptions([]);
    }
  }, [formData.category_id]);

  useEffect(() => {
    if (costItem && isOpen) {
      setFormData({
        ...defaultState,
        ...costItem,
        quarter_reference: String(costItem.quarter_reference) // Ensure string on load
      });
    } else if (!costItem && isOpen) {
      setFormData(defaultState);
    }
  }, [costItem, isOpen]);

  // Smart Math Effect using exact backend fields
  useEffect(() => {
    const amount = parseFloat(formData.amount_no_btw) || 0;
    const rate = formData.btw_percent / 100;

    if (amount >= 0) {
      const calculatedBtw = (amount * rate).toFixed(2);
      const calculatedTotal = (amount * (1 + rate)).toFixed(2);
      setFormData((prev: any) => ({ ...prev, amount_btw: calculatedBtw, euro_amount: calculatedTotal }));
    }
  }, [formData.amount_no_btw, formData.btw_percent]);

  const handleDateChange = (newDate: string) => {
    const d = new Date(newDate);
    if (!isNaN(d.getTime())) {
      setFormData((prev: any) => ({
        ...prev,
        cost_date: newDate,
        year_reference: d.getFullYear(),
        quarter_reference: Math.floor((d.getMonth() + 3) / 3).toString() // Cast to string
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, cost_date: newDate }));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const url = costItem ? `${import.meta.env.VITE_API_URL}/costs/${costItem.id}` : `${import.meta.env.VITE_API_URL}/costs/`;
    const method = costItem ? 'PATCH' : 'POST';

    try {
      const payload = { ...formData };
      payload.ai_summary = null;
      payload.file_name = null;
      // Explicitly cast numeric fields for Pydantic
      payload.amount_no_btw = parseFloat(payload.amount_no_btw);
      payload.amount_btw = parseFloat(payload.amount_btw);
      payload.euro_amount = parseFloat(payload.euro_amount);
      payload.btw_percent = parseFloat(payload.btw_percent);
      payload.year_reference = parseInt(payload.year_reference, 10);
      payload.quarter_reference = String(payload.quarter_reference);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Validation Error Details:", errorData);
        if (errorData.detail && Array.isArray(errorData.detail)) {
            const missingFields = errorData.detail.map((err: any) => err.loc[err.loc.length - 1]).join(', ');
            throw new Error(`Schema mismatch on fields: ${missingFields}`);
        }
        throw new Error('Failed to save cost entry');
      }

      toast.success(`Cost entry ${costItem ? 'updated' : 'added'} successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'An error occurred. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[95vh]" onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator size={22} className="text-blue-500" />
            {costItem ? 'Edit Cost Entry' : 'New Cost Entry'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 normal-case">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Archived</span>
              <button type="button" onClick={() => setFormData({ ...formData, is_archived: !formData.is_archived })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${formData.is_archived ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${formData.is_archived ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
          </div>
        </div>

        <form id="cost-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Entry Type</label>
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button type="button" onClick={() => setFormData({ ...formData, is_credit: false })} className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${!formData.is_credit ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                  <ArrowDownCircle size={16} /> Expense
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, is_credit: true })} className={`flex-1 flex justify-center items-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${formData.is_credit ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
                  <ArrowUpCircle size={16} /> Refund/Credit
                </button>
              </div>
            </div>
            <InputField label="Date" type="date" required value={formData.cost_date} onChange={handleDateChange} />
            <div className="grid grid-cols-2 gap-2">
              <InputField label="Year" type="number" required value={formData.year_reference} onChange={(v:any) => setFormData({ ...formData, year_reference: v })} />
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quarter *</label>
                <select required value={formData.quarter_reference} onChange={(e) => setFormData({ ...formData, quarter_reference: e.target.value })} className="w-full px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white">
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Supplier Name" required value={formData.supplier} onChange={(v:any) => setFormData({ ...formData, supplier: v })} placeholder="e.g. Amazon, Shell, etc." />
            <InputField label="Invoice No. / Reference" value={formData.invoice_nmb} onChange={(v:any) => setFormData({ ...formData, invoice_nmb: v })} placeholder="e.g. INV-2026-001" />
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <select required value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white">
                <option value="" disabled>Select Category...</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.category}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description * {isFetchingDesc && <span className="text-blue-500 text-xs ml-2 animate-pulse">Loading...</span>}</label>
              <select required value={formData.description_id} onChange={(e) => setFormData({ ...formData, description_id: e.target.value })} disabled={!formData.category_id} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white disabled:opacity-50">
                <option value="" disabled>{formData.category_id ? 'Select Description...' : 'Select Category First'}</option>
                {descriptions.map(desc => <option key={desc.id} value={desc.id}>{desc.description}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Net Amount (€)" type="number" required value={formData.amount_no_btw} onChange={(v:any) => setFormData({ ...formData, amount_no_btw: v })} />
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex justify-between">
                <span>BTW Amount (€)</span>
                <div className="flex gap-1">
                  {[21, 9, 0].map(rate => (
                    <button key={rate} type="button" onClick={() => setFormData({ ...formData, btw_percent: rate })} className={`text-[10px] px-1.5 py-0.5 rounded border ${formData.btw_percent === rate ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300' : 'bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700'}`}>{rate}%</button>
                  ))}
                </div>
              </label>
              <input type="number" step="0.01" required value={formData.amount_btw} onChange={(e) => setFormData({ ...formData, amount_btw: e.target.value })} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white" />
            </div>
            <InputField label="Total Amount (€)" type="number" required value={formData.euro_amount} onChange={(v:any) => setFormData({ ...formData, euro_amount: v })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={formData.cost_note}
              onChange={(e) => setFormData({ ...formData, cost_note: e.target.value })}
              placeholder="Any additional information..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white resize-none"
            />
          </div>

        </form>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">Cancel</button>
          <button type="submit" form="cost-form" disabled={isLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium">
            {isLoading ? 'Saving...' : 'Save Cost Entry'}
          </button>
        </div>
      </div>
    </div>
  );
}