import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

// MOVED OUTSIDE: This prevents React from destroying the input on every keystroke
const InputField = ({ label, name, value, onChange, type = 'text', required = false }: any) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label} {required && '*'}</label>
    <input
      type={type} required={required}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm dark:text-white"
    />
  </div>
);

export default function CustomerFormModal({ isOpen, customer, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '', address: '', postcode: '', city: '', nation: '',
    phone: '', email: '', btw: '', kvk: '', bankaccountname: '',
    iban: '', is_active: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '', address: customer.address || '', postcode: customer.postcode || '',
        city: customer.city || '', nation: customer.nation || '', phone: customer.phone || '',
        email: customer.email || '', btw: customer.btw || '', kvk: customer.kvk || '',
        bankaccountname: customer.bankaccountname || '', iban: customer.iban || '', is_active: customer.is_active ?? true
      });
    } else {
      setFormData({ name: '', address: '', postcode: '', city: '', nation: '', phone: '', email: '', btw: '', kvk: '', bankaccountname: '', iban: '', is_active: true });
    }
  }, [customer, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem('token');

    const url = customer ? `${import.meta.env.VITE_API_URL}/customers/${customer.id}` : `${import.meta.env.VITE_API_URL}/customers/`;
    const method = customer ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save customer');

      toast.success(`Customer ${customer ? 'updated' : 'created'} successfully!`);
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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{customer ? 'Edit Customer' : 'New Customer'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Company / Name" name="name" value={formData.name} onChange={handleInputChange} required />
            <InputField label="Email" name="email" value={formData.email} onChange={handleInputChange} type="email" />
            <InputField label="Phone" name="phone" value={formData.phone} onChange={handleInputChange} />
            <InputField label="Address" name="address" value={formData.address} onChange={handleInputChange} />
            <InputField label="City" name="city" value={formData.city} onChange={handleInputChange} />
            <InputField label="Postcode" name="postcode" value={formData.postcode} onChange={handleInputChange} />
            <InputField label="Nation" name="nation" value={formData.nation} onChange={handleInputChange} />
            <InputField label="BTW Number" name="btw" value={formData.btw} onChange={handleInputChange} />
            <InputField label="KVK Number" name="kvk" value={formData.kvk} onChange={handleInputChange} />
            <InputField label="IBAN" name="iban" value={formData.iban} onChange={handleInputChange} />
            <InputField label="Bank Account Name" name="bankaccountname" value={formData.bankaccountname} onChange={handleInputChange} />
          </div>

          {/* NEW: Modern Toggle Switch instead of Checkbox */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleInputChange('is_active', !formData.is_active as any)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Customer</span>
          </div>
        </form>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={isLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-sm font-medium">
            {isLoading ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}