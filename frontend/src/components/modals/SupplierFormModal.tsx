import { useState, useEffect } from 'react';
import { X, Plus, Trash2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const InputField = ({ label, value, onChange, type = 'text', required = false, placeholder = '' }: any) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label} {required && '*'}</label>
    <input
      type={type} required={required} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm dark:text-white"
    />
  </div>
);

export default function SupplierFormModal({ isOpen, supplier, onClose, onSuccess }: any) {
  const defaultState = {
    name: '', address: '', postcode: '', city: '', nation: '',
    phone: '', email: '', btw: '', kvk: '', bankaccountname: '',
    iban: '', is_active: true, loading_addresses: []
  };

  const [formData, setFormData] = useState<any>(defaultState);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '', address: supplier.address || '', postcode: supplier.postcode || '',
        city: supplier.city || '', nation: supplier.nation || '', phone: supplier.phone || '',
        email: supplier.email || '', btw: supplier.btw || '', kvk: supplier.kvk || '',
        bankaccountname: supplier.bankaccountname || '', iban: supplier.iban || '',
        is_active: supplier.is_active ?? true,
        loading_addresses: supplier.loading_addresses ? [...supplier.loading_addresses] : []
      });
    } else {
      setFormData(defaultState);
    }
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  // Loading Address Handlers
  const addLoadingAddress = () => {
    setFormData((prev: any) => ({
      ...prev,
      loading_addresses: [...prev.loading_addresses, { address: '', postcode: '', city: '', nation: '' }]
    }));
  };

  const updateLoadingAddress = (index: number, field: string, value: string) => {
    const updated = [...formData.loading_addresses];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, loading_addresses: updated });
  };

  const removeLoadingAddress = (index: number) => {
    const updated = formData.loading_addresses.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, loading_addresses: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem('token');

    const url = supplier ? `${import.meta.env.VITE_API_URL}/suppliers/${supplier.id}` : `${import.meta.env.VITE_API_URL}/suppliers/`;
    const method = supplier ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save supplier');

      toast.success(`Supplier ${supplier ? 'updated' : 'created'} successfully!`);
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-6 bg-gray-50/30 dark:bg-gray-900 flex-1">
          <form id="supplier-form" onSubmit={handleSubmit} className="space-y-8">

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                Main Details
                <div className="flex items-center gap-3 normal-case">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
                  <button type="button" onClick={() => handleInputChange('is_active', !formData.is_active)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2"><InputField label="Company / Name" value={formData.name} onChange={(v:any) => handleInputChange('name', v)} required /></div>
                <InputField label="Email" type="email" value={formData.email} onChange={(v:any) => handleInputChange('email', v)} />
                <InputField label="Phone" value={formData.phone} onChange={(v:any) => handleInputChange('phone', v)} />
                <InputField label="Headquarters Address" value={formData.address} onChange={(v:any) => handleInputChange('address', v)} />
                <InputField label="City" value={formData.city} onChange={(v:any) => handleInputChange('city', v)} />
                <InputField label="Postcode" value={formData.postcode} onChange={(v:any) => handleInputChange('postcode', v)} />
                <InputField label="Nation" value={formData.nation} onChange={(v:any) => handleInputChange('nation', v)} />
                <InputField label="BTW Number" value={formData.btw} onChange={(v:any) => handleInputChange('btw', v)} />
                <InputField label="KVK Number" value={formData.kvk} onChange={(v:any) => handleInputChange('kvk', v)} />
                <InputField label="IBAN" value={formData.iban} onChange={(v:any) => handleInputChange('iban', v)} />
                <div className="lg:col-span-2"><InputField label="Bank Account Name" value={formData.bankaccountname} onChange={(v:any) => handleInputChange('bankaccountname', v)} /></div>
              </div>
            </div>

            {/* Loading Addresses (Dynamic Array) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Loading Addresses</h3>
                <button type="button" onClick={addLoadingAddress} className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={16} /> Add Address
                </button>
              </div>

              <div className="space-y-4">
                {formData.loading_addresses.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">No loading addresses added yet.</div>
                ) : (
                  formData.loading_addresses.map((addr: any, index: number) => (
                    <div key={index} className="relative grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl group pr-12">
                      <div className="md:col-span-2"><InputField label="Address" value={addr.address} onChange={(v:any) => updateLoadingAddress(index, 'address', v)} placeholder="Street name and number" /></div>
                      <InputField label="City" value={addr.city} onChange={(v:any) => updateLoadingAddress(index, 'city', v)} />
                      <div className="flex gap-3">
                        <div className="flex-1"><InputField label="Postcode" value={addr.postcode} onChange={(v:any) => updateLoadingAddress(index, 'postcode', v)} /></div>
                        <div className="flex-1"><InputField label="Nation" value={addr.nation} onChange={(v:any) => updateLoadingAddress(index, 'nation', v)} /></div>
                      </div>
                      <button type="button" onClick={() => removeLoadingAddress(index)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">Cancel</button>
          <button type="submit" form="supplier-form" disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-sm font-medium">
            {isLoading ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}