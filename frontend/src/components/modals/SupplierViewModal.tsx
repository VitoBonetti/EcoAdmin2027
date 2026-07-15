import { X, Copy, Edit, Share, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface SupplierViewModalProps {
  isOpen: boolean;
  supplier: any;
  onClose: () => void;
  onEdit: (supplier: any) => void;
}

export default function SupplierViewModal({ isOpen, supplier, onClose, onEdit }: SupplierViewModalProps) {
  if (!isOpen || !supplier) return null;

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
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{supplier.name}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${supplier.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
              {supplier.is_active ? 'Active Supplier' : 'Inactive'}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Company Details</h3>
            <InfoRow label="Email" value={supplier.email} />
            <InfoRow label="Phone" value={supplier.phone} />
            <InfoRow label="Headquarters" value={supplier.address} />
            <InfoRow label="Postcode" value={supplier.postcode} />
            <InfoRow label="City" value={supplier.city} />
            <InfoRow label="Nation" value={supplier.nation} />
            <InfoRow label="BTW Number" value={supplier.btw} />
            <InfoRow label="KVK Number" value={supplier.kvk} />
            <InfoRow label="Bank Account Name" value={supplier.bankaccountname} />
            <InfoRow label="IBAN" value={supplier.iban} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Loading Addresses ({supplier.loading_addresses?.length || 0})</h3>
            {supplier.loading_addresses?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {supplier.loading_addresses.map((addr: any, i: number) => (
                  <div key={addr.id || i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-start gap-2 text-gray-700 dark:text-gray-200">
                      <MapPin size={16} className="mt-0.5 text-gray-400 shrink-0" />
                      <div className="text-sm leading-relaxed">
                        {addr.address && <div>{addr.address}</div>}
                        <div>{(addr.postcode || '') + ' ' + (addr.city || '')}</div>
                        {addr.nation && <div className="text-gray-500 dark:text-gray-400">{addr.nation}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No loading addresses registered.</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={() => toast("Share feature coming soon!", { icon: '🚧' })} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium flex items-center gap-2">
            <Share size={16} /> Share
          </button>
          <button onClick={() => { onClose(); onEdit(supplier); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium flex items-center gap-2">
            <Edit size={16} /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}