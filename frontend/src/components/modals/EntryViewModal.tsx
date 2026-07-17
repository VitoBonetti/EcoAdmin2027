import React, { useEffect, useState } from 'react';
import { X, FileText, Download, Edit2, Eye, Truck, Package, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface EntryViewModalProps {
  isOpen: boolean;
  entryId: string | null;
  initialTab?: 'details' | 'preview';
  onClose: () => void;
  onEdit: (entry: any) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value || 0);

export default function EntryViewModal({ isOpen, entryId, initialTab = 'details', onClose, onEdit }: EntryViewModalProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'preview'>(initialTab);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !entryId) return;
    setActiveTab(initialTab);
    setPdfPreviewUrl(null);

    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/entries/${entryId}/`);
        if (res.ok) {
          setData(await res.json());
        } else {
          toast.error("Failed to load document details");
          onClose();
        }
      } catch (err) {
        toast.error("Network error");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [isOpen, entryId, initialTab]);

  const loadPdfPreview = async () => {
    if (!data?.entry) return;
    const toastId = toast.loading('Generating preview...');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/entries/${data.entry.id}/pdf`);
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      toast.success('Preview ready', { id: toastId });
    } catch (err) {
      toast.error('Failed to generate preview', { id: toastId });
      setActiveTab('details');
    }
  };

  useEffect(() => {
    if (activeTab === 'preview' && data && !pdfPreviewUrl) {
      loadPdfPreview();
    }
  }, [activeTab, data]);

  const handleDownloadPDF = () => {
    if (!pdfPreviewUrl) return;
    const a = document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = `${data.entry.invoice_reference || data.entry.quotation_reference}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">

        {/* Header & Tabs */}
        <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
          <div className="flex justify-between items-center p-4 px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {data?.entry?.invoice_reference || data?.entry?.quotation_reference || 'Document Details'}
                </h2>
                <p className="text-sm text-gray-500">
                  {data?.entry?.is_invoice ? 'Invoice' : data?.entry?.is_commission ? 'Commission' : 'Quotation'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-4 px-6 mt-2">
            <button onClick={() => setActiveTab('details')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Data View
            </button>
            <button onClick={() => setActiveTab('preview')} className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'preview' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <Eye size={16}/> PDF Preview
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-gray-900">
          {isLoading || !data ? (
            <div className="flex justify-center items-center h-40 text-gray-500">Loading document details...</div>
          ) : activeTab === 'preview' ? (
            <div className="h-[65vh] w-full bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} className="w-full h-full" title="PDF Preview" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">Generating preview...</div>
              )}
            </div>
          ) : (
            <div className="space-y-8">

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-800">
                <div>
                  <label className="text-xs font-medium text-gray-500">Emission Date</label>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.entry.date}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Overdue Date</label>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.entry.overdue_date}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Year Reference</label>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.entry.year_reference}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Quarter Reference</label>
                  <p className="font-semibold text-gray-900 dark:text-white">{data.entry.quarter_reference}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Products & Services</h3>
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="p-3">Item</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-center">Unit</th>
                        <th className="p-3 text-right">Price</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                      {data.products.map((prod: any) => (
                        <tr key={prod.id}>
                          <td className="p-3 font-medium">{prod.name}</td>
                          <td className="p-3 text-gray-500">{prod.description}</td>
                          <td className="p-3 text-right">{prod.quantity}</td>
                          <td className="p-3 text-center uppercase">{prod.unity}</td>
                          <td className="p-3 text-right">{formatCurrency(prod.unity_price)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(prod.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-2 mb-4 text-blue-800 dark:text-blue-400 font-bold">
                    <Truck size={18} /> Transport Details
                  </div>
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between"><span>Gross Weight:</span> <span className="font-medium">{data.transport.transport_gross} kg</span></div>
                    <div className="flex justify-between"><span>Bereken Weight:</span> <span className="font-medium">{data.transport.transport_bereken} kg</span></div>
                    <div className="flex justify-between"><span>Price per Ton:</span> <span className="font-medium">{formatCurrency(data.transport.transport_price_for_ton)}</span></div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-blue-200 dark:border-blue-800 font-bold">
                      <span>Transport Subtotal:</span> <span>{formatCurrency(data.transport.transport_total_no_btw)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 mb-4 text-amber-800 dark:text-amber-500 font-bold">
                    <Package size={18} /> Pallet Details
                  </div>
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between"><span>Quantity:</span> <span className="font-medium">{data.entry.pallets_quantity || 0}</span></div>
                    <div className="flex justify-between"><span>Price per Pallet:</span> <span className="font-medium">{formatCurrency(data.entry.pallets_price)}</span></div>
                    <div className="flex justify-between pt-2 mt-2 border-t border-amber-200 dark:border-amber-800 font-bold">
                      <span>Pallets Subtotal:</span> <span>{formatCurrency(data.entry.pallets_total_price)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Improved Financial Summary */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="w-full md:w-1/2 lg:w-1/3 space-y-3 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">

                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Products Subtotal</span>
                    <span>{formatCurrency(data.entry.no_btw_total)}</span>
                  </div>

                  {data.transport.transport_total_no_btw > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Transport Subtotal</span>
                      <span>{formatCurrency(data.transport.transport_total_no_btw)}</span>
                    </div>
                  )}

                  {data.entry.pallets_total_price > 0 && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Pallets Subtotal</span>
                      <span>{formatCurrency(data.entry.pallets_total_price)}</span>
                    </div>
                  )}

                  {data.entry.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({data.entry.discount}%)</span>
                      <span>-{formatCurrency(data.total_discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-200 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>Total Excl. BTW</span>
                    <span>{formatCurrency(data.entry.temp_no_btw_total)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>BTW Tax (21%)</span>
                    <span>{formatCurrency(data.btw_calc)}</span>
                  </div>

                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span>Final Amount</span>
                    <span>{formatCurrency(data.entry.final_total)}</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-between bg-gray-50 dark:bg-gray-800/50">
          <button onClick={onClose} className="px-6 py-2 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Close
          </button>
          <div className="flex gap-3">
            {activeTab === 'preview' && (
               <button onClick={handleDownloadPDF} disabled={!pdfPreviewUrl} className="flex items-center gap-2 px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
                 <Download size={18} /> Save PDF
               </button>
            )}
            <button
              onClick={() => { onClose(); onEdit(data.entry); }}
              disabled={!data}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Edit2 size={18} /> Full Edit
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}