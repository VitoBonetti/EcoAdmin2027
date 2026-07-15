import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onClose, isLoading }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} disabled={isLoading} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors text-sm font-medium flex items-center gap-2">
            {isLoading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}