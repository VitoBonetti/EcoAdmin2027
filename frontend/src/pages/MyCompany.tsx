import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Copy, Building2, MapPin, Phone, Mail, Hash, CreditCard, Building } from 'lucide-react';
import toast from 'react-hot-toast';
import CompanyFormModal from '../components/modals/CompanyFormModal';

export default function MyCompany() {
  const [company, setCompany] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchCompany = useCallback(async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/mycompany/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Since it returns a list, take the first one if it exists
        if (data && data.length > 0) {
          setCompany(data[0]);
        } else {
          setCompany(null);
        }
      }
    } catch (error) {
      toast.error('Failed to load company details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const InfoBlock = ({ label, value, icon: Icon }: { label: string, value: string, icon: any }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/40 dark:hover:bg-gray-800/40 transition-colors group">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{value}</p>
            <button
              onClick={() => handleCopy(value, label)}
              className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-green-50 dark:hover:bg-gray-800 shrink-0"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Company</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your primary business profile and billing details.</p>
        </div>
        {company && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-white/70 hover:bg-white dark:bg-gray-900/70 dark:hover:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl transition-all shadow-sm backdrop-blur-md"
          >
            <Edit2 size={18} /> Edit Profile
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400">Loading profile...</p>
        </div>
      ) : !company ? (
        // Empty State
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl rounded-3xl border border-white/60 dark:border-gray-800 p-12 text-center shadow-lg">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Company Profile</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
            You haven't set up your company details yet. These details will be used for invoices, quotations, and official documents.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-colors shadow-md font-medium"
          >
            <Plus size={20} /> Setup Company Profile
          </button>
        </div>
      ) : (
        // The Business Card
        <div className="relative overflow-hidden bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl rounded-3xl border border-white/80 dark:border-gray-700 shadow-xl">
          {/* Decorative Background Blur */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-400/20 dark:bg-green-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="p-8 md:p-12 relative z-10">
            {/* Header Section */}
            <div className="flex items-center gap-6 mb-12 pb-8 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                <Building size={40} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{company.name}</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${company.is_active ? 'bg-green-100/80 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-100/80 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'}`}>
                  {company.is_active ? 'Active Profile' : 'Inactive Profile'}
                </span>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
              <InfoBlock
                label="Location"
                icon={MapPin}
                value={[company.address, company.postcode, company.city, company.nation].filter(Boolean).join(', ')}
              />
              <InfoBlock label="Email" icon={Mail} value={company.email} />
              <InfoBlock label="Telephone" icon={Phone} value={company.telephone} />
              <InfoBlock label="BTW Number" icon={Hash} value={company.btw} />
              <InfoBlock label="KVK Number" icon={Building2} value={company.kvk} />
              <InfoBlock label="IBAN" icon={CreditCard} value={company.iban} />
            </div>
          </div>
        </div>
      )}

      <CompanyFormModal
        isOpen={isFormOpen}
        company={company}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchCompany}
      />
    </div>
  );
}