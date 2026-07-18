import { X, FileText, Calendar, CreditCard, AlignLeft, Building2 } from 'lucide-react';

export default function CostDetailModal({ isOpen, cost, onClose, categoryMap, descMap }: any) {
  if (!isOpen || !cost) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const isCredit = cost.is_credit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCredit ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {cost.invoice_nmb || 'No Invoice Number'}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isCredit ? 'Credit / Income' : 'Debit / Expense'}
                </span>
                {cost.is_archived && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-orange-100 text-orange-700">Archived</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <Calendar size={12} /> {new Date(cost.cost_date).toLocaleDateString()}
                <span className="mx-1">•</span> Q{cost.quarter_reference} {cost.year_reference}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8">

          {/* Categorization & Supplier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><Building2 size={14}/> Supplier & Category</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Supplier:</span> <span className="font-medium text-gray-900 dark:text-white">{cost.supplier || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Category:</span> <span className="font-medium text-gray-900 dark:text-white">{categoryMap[cost.category_id] || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Description:</span> <span className="font-medium text-gray-900 dark:text-white">{descMap[cost.description_id] || '-'}</span></div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2"><CreditCard size={14}/> Financial Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Amount (No BTW):</span> <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(cost.amount_no_btw)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">BTW ({cost.btw_percent || 0}%):</span> <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(cost.amount_btw)}</span></div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">Total Amount:</span>
                  <span className={isCredit ? 'text-green-600' : 'text-red-600'}>{formatCurrency(cost.euro_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Summaries */}
          <div className="space-y-4">
            {cost.ai_summary && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2"><AlignLeft size={14}/> AI Summary</h3>
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  {cost.ai_summary}
                </div>
              </div>
            )}

            {cost.cost_note && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2"><AlignLeft size={14}/> Internal Note</h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                  {cost.cost_note}
                </div>
              </div>
            )}

            {cost.file_name && (
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Attached File</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">{cost.file_name}</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-colors text-sm font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}