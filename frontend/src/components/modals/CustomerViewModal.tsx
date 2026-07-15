import { X, Copy, Edit, Share } from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomerViewModalProps {
  isOpen: boolean;
  customer: any;
  onClose: () => void;
  onEdit: (customer: any) => void;
}

export default function CustomerViewModal({ isOpen, customer, onClose, onEdit }: CustomerViewModalProps) {
  if (!isOpen || !customer) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const InfoRow = ({ label, value }: { label: string, value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="py-3 border-b border-gray-100 dark:border-gray-800/50 flex justify-between items-start group">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium w-1/3">{label}</span>
        <div className="flex items-center gap-2 max-w-[66%] justify-end text-right">
          <span className="text-sm text-gray-900 dark:text-gray-100 break-all">{value}</span>
          <button
            onClick={() => handleCopy(value, label)}
            className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-green-50 dark:hover:bg-gray-800 shrink-0"
          >
            <Copy size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${customer.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
              {customer.is_active ? 'Active Customer' : 'Inactive'}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Address" value={customer.address} />
          <InfoRow label="Postcode" value={customer.postcode} />
          <InfoRow label="City" value={customer.city} />
          <InfoRow label="Nation" value={customer.nation} />
          <InfoRow label="BTW Number" value={customer.btw} />
          <InfoRow label="KVK Number" value={customer.kvk} />
          <InfoRow label="Bank Account Name" value={customer.bankaccountname} />
          <InfoRow label="IBAN" value={customer.iban} />
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
          <button onClick={() => toast("Share feature coming soon!", { icon: '🚧' })} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium flex items-center gap-2">
            <Share size={16} /> Share
          </button>
          <button onClick={() => { onClose(); onEdit(customer); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium flex items-center gap-2">
            <Edit size={16} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}