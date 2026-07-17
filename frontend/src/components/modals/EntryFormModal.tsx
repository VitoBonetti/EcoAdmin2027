import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Calculator, Truck, Package, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const InputField = ({ label, value, onChange, type = 'text', required = false, placeholder = '', disabled = false, min, max }: any) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{label} {required && '*'}</label>
    <input
      type={type} required={required} value={value} placeholder={placeholder} disabled={disabled} min={min} max={max}
      step={type === 'number' ? '0.01' : undefined}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm dark:text-white disabled:opacity-50"
    />
  </div>
);

export default function EntryFormModal({ isOpen, entryItem, onClose, onSuccess, customers = [], suppliers = [], companies = [] }: any) {
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor((currentMonth + 3) / 3);

  const defaultState = {
    date: new Date().toISOString().split('T')[0],
    overdue_date: '',
    company_id: companies[0]?.id || '',
    customer_id: '',
    supplier_id: '',
    loading_address: '',
    is_invoice: true,
    is_commission: false,
    is_quotation: false,
    is_paid: false,
    is_archived: false,

    // Logistics
    pallets_quantity: 0,
    pallets_price: 0,
    pallets_total_price: 0,
    pallets_notes: '',
    transport_gross: 0,
    transport_bereken: 0,
    transport_price_for_ton: 0,
    transport_diesel_toeslag: 0,
    transport_extra_stop: 0,
    transport_extra_stop_cost: 0,
    transport_total_no_btw: 0,
    transport_total_btw: 0,
    loading_info: '',
    notes: '',

    // Totals
    temp_no_btw_total: 0,
    no_btw_total: 0,
    btw_total: 0,
    discount: 0,
    btw_total_discount: 0,
    final_total: 0,

    year_reference: new Date().getFullYear(),
    quarter_reference: currentQuarter.toString(),
    products: []
  };

  const [formData, setFormData] = useState<any>(defaultState);
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);

  // FAST LOOKUP: Grab loading addresses directly from the selected supplier object
  const selectedSupplier = suppliers.find((s: any) => s.id === formData.supplier_id);
  const loadingAddresses = selectedSupplier?.loading_addresses || [];

  useEffect(() => {
    if (entryItem && isOpen) {
      const fetchFullEntry = async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/entries/${entryItem.id}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setFormData({
              ...defaultState,
              ...data.entry,
              products: data.products || [],
              quarter_reference: String(data.entry.quarter_reference || currentQuarter)
            });
          }
        } catch (error) {
          toast.error("Failed to load full entry details");
        }
      };
      fetchFullEntry();
    } else if (!entryItem && isOpen) {
      setFormData({ ...defaultState, company_id: companies[0]?.id || '' });
      setActiveTab('general');
    }
  }, [entryItem, isOpen, companies]);

  // THE FINANCIAL ENGINE
  useEffect(() => {
    let productsTotal = 0;
    const updatedProducts = formData.products.map((p: any) => {
      const q = parseFloat(p.quantity) || 0;
      const up = parseFloat(p.unity_price) || 0;
      const d = parseFloat(p.discount) || 0;
      const lineTotal = (q * up) * (1 - d / 100);
      productsTotal += lineTotal;
      return { ...p, total: lineTotal.toFixed(2) };
    });

    const tBereken = parseFloat(formData.transport_bereken) || 0;
    const tPriceTon = parseFloat(formData.transport_price_for_ton) || 0;
    const tDiesel = parseFloat(formData.transport_diesel_toeslag) || 0;
    const tStops = parseFloat(formData.transport_extra_stop) || 0;
    const tStopCost = parseFloat(formData.transport_extra_stop_cost) || 0;

    const baseTransport = tBereken * tPriceTon;
    const dieselCost = baseTransport * (tDiesel / 100);
    const stopsCost = tStops * tStopCost;
    const transportTotalNoBtw = baseTransport + dieselCost + stopsCost;
    const transportTotalBtw = transportTotalNoBtw * 0.21;

    const pQty = parseFloat(formData.pallets_quantity) || 0;
    const pPrice = parseFloat(formData.pallets_price) || 0;
    const palletsTotal = pQty * pPrice;

    const noBtwTotal = productsTotal + transportTotalNoBtw + palletsTotal;
    const mainDiscount = parseFloat(formData.discount) || 0;
    const discountedNoBtw = noBtwTotal * (1 - mainDiscount / 100);

    const btwTotal = formData.is_commission ? 0 : discountedNoBtw * 0.21;
    const finalTotal = discountedNoBtw + btwTotal;

    if (
      Math.abs((parseFloat(formData.final_total) || 0) - finalTotal) > 0.01 ||
      Math.abs((parseFloat(formData.transport_total_no_btw) || 0) - transportTotalNoBtw) > 0.01
    ) {
      setFormData((prev: any) => ({
        ...prev,
        products: updatedProducts,
        transport_total_no_btw: transportTotalNoBtw.toFixed(2),
        transport_total_btw: transportTotalBtw.toFixed(2),
        pallets_total_price: palletsTotal.toFixed(2),
        temp_no_btw_total: noBtwTotal.toFixed(2),
        no_btw_total: discountedNoBtw.toFixed(2),
        btw_total: btwTotal.toFixed(2),
        final_total: finalTotal.toFixed(2)
      }));
    }
  }, [
    formData.products, formData.transport_bereken, formData.transport_price_for_ton,
    formData.transport_diesel_toeslag, formData.transport_extra_stop, formData.transport_extra_stop_cost,
    formData.pallets_quantity, formData.pallets_price, formData.discount
  ]);

  const handleDateChange = (newDate: string) => {
    const d = new Date(newDate);
    if (!isNaN(d.getTime())) {
      // Show +30 days instantly in the UI
      const overdueDate = new Date(d);
      overdueDate.setDate(overdueDate.getDate() + 30);
      const formattedOverdue = overdueDate.toISOString().split('T')[0];

      setFormData((prev: any) => ({
        ...prev,
        date: newDate,
        overdue_date: formattedOverdue,
        year_reference: d.getFullYear(),
        quarter_reference: Math.floor((d.getMonth() + 3) / 3).toString()
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, date: newDate }));
    }
  };

  const handleProductAdd = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { name: '', description: '', quantity: 0, unity: 'M2', unity_price: 0, discount: 0, total: 0 }]
    });
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index][field] = value;
    setFormData({ ...formData, products: updatedProducts });
  };

  const handleProductRemove = (index: number) => {
    const updatedProducts = formData.products.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, products: updatedProducts });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem('token');

    const url = entryItem ? `${import.meta.env.VITE_API_URL}/entries/${entryItem.id}/` : `${import.meta.env.VITE_API_URL}/entries/`;
    const method = entryItem ? 'PATCH' : 'POST';

    try {
      const payload = { ...formData };

      // Cleanup for backend schema requirements
      if (!payload.supplier_id) payload.supplier_id = null;
      if (!payload.customer_id) payload.customer_id = null;
      if (!payload.loading_address) payload.loading_address = null;
      if (!payload.company_id) payload.company_id = null;
      if (!payload.overdue_date) payload.overdue_date = null;

      // Only delete auto-generated references if we are CREATING a new entry
      if (!entryItem) {
        delete payload.invoice_reference;
        delete payload.quotation_reference;
      }

      payload.quarter_reference = String(payload.quarter_reference);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Validation Error Details:", errorData);
        if (errorData.detail && Array.isArray(errorData.detail)) {
            const missingFields = errorData.detail.map((err: any) => err.loc[err.loc.length - 1]).join(', ');
            throw new Error(`Schema mismatch on fields: ${missingFields}`);
        }
        throw new Error('Failed to save entry');
      }

      toast.success(`Document ${entryItem ? 'updated' : 'created'} successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'An error occurred. Check console.');
    } finally {
      setIsLoading(false);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button type="button" onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}>
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[95vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{entryItem ? 'Edit Entry' : 'Create New Entry'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Manage documents, products, and logistics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20} /></button>
        </div>

        {/* Inner Tabs Navigation */}
        <div className="flex px-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 shrink-0 overflow-x-auto">
          <TabButton id="general" label="General Info" icon={Info} />
          <TabButton id="products" label={`Products (${formData.products.length})`} icon={Package} />
          <TabButton id="logistics" label="Logistics" icon={Truck} />
          <TabButton id="summary" label="Summary" icon={Calculator} />
        </div>

        <form id="entry-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 flex-1 bg-white dark:bg-gray-900">

          {/* TAB 1: GENERAL INFO */}
          <div className={`space-y-6 ${activeTab !== 'general' && 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="md:col-span-2 flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Document Type</label>
                  <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                    <button type="button" onClick={() => setFormData({ ...formData, is_invoice: true, is_quotation: false, is_commission: false })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${formData.is_invoice ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm' : 'text-gray-500'}`}>Invoice</button>
                    <button type="button" onClick={() => setFormData({ ...formData, is_invoice: false, is_quotation: true, is_commission: false })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${formData.is_quotation ? 'bg-white dark:bg-gray-700 text-purple-600 shadow-sm' : 'text-gray-500'}`}>Quotation</button>
                    <button type="button" onClick={() => setFormData({ ...formData, is_invoice: false, is_quotation: false, is_commission: true, customer_id: '', loading_address: '' })} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${formData.is_commission ? 'bg-white dark:bg-gray-700 text-orange-600 shadow-sm' : 'text-gray-500'}`}>Commission</button>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Emitting Company *</label>
                  <select required value={formData.company_id || ''} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })} className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm dark:text-white font-medium">
                    <option value="" disabled>Select Emitting Company...</option>
                    {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                <InputField label="Emission Date" type="date" required value={formData.date} onChange={handleDateChange} />
                <InputField label="Overdue Date (Auto +30 Days)" type="date" disabled value={formData.overdue_date} onChange={() => {}} placeholder="Calculated automatically" />
              </div>

              {/* Customer: Hidden if Commission */}
              {!formData.is_commission && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Customer (Client) *</label>
                  <select required={!formData.is_commission} value={formData.customer_id || ''} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm dark:text-white">
                    <option value="" disabled>Select Customer...</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Supplier: Visible for all (Required for Commission, optional for Invoices/Quotations) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier {formData.is_commission ? '*' : ''}</label>
                <select required={formData.is_commission} value={formData.supplier_id || ''} onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm dark:text-white">
                  <option value="" disabled>Select Supplier...</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Loading Address: Hidden if Commission */}
              {!formData.is_commission && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Loading Address</label>
                  <select value={formData.loading_address || ''} onChange={(e) => setFormData({ ...formData, loading_address: e.target.value })} disabled={!formData.supplier_id} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm dark:text-white disabled:opacity-50">
                    <option value="" disabled>{formData.supplier_id ? 'Select Address...' : 'Select Supplier First'}</option>
                    {loadingAddresses.map((la: any) => <option key={la.id} value={la.id}>{la.city} - {la.address}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* TAB 2: PRODUCTS */}
          <div className={`space-y-4 ${activeTab !== 'products' && 'hidden'}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Line Items</h3>
              <button type="button" onClick={handleProductAdd} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <Plus size={16} /> Add Product
              </button>
            </div>

            {formData.products.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">No products added yet.</div>
            ) : (
              <div className="space-y-3">
                {formData.products.map((product: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InputField label="Product Name" value={product.name} onChange={(v:any) => handleProductChange(idx, 'name', v)} required />
                        <InputField label="Description" value={product.description} onChange={(v:any) => handleProductChange(idx, 'description', v)} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <InputField label="Qty" type="number" value={product.quantity} onChange={(v:any) => handleProductChange(idx, 'quantity', v)} required />
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                          <select value={product.unity} onChange={(e) => handleProductChange(idx, 'unity', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm dark:text-white">
                            <option value="M2">m2</option>
                            <option value="ML">ml</option>
                            <option value="BX">bx</option>
                            <option value="ST">st</option>
                            <option value="FG">fg</option>
                          </select>
                        </div>
                        <InputField label="Unit Price (€)" type="number" value={product.unity_price} onChange={(v:any) => handleProductChange(idx, 'unity_price', v)} required />
                        <InputField label="Discount (%)" type="number" min="0" max="100" value={product.discount} onChange={(v:any) => handleProductChange(idx, 'discount', v)} />
                        <InputField label="Line Total (€)" type="number" value={product.total} disabled />
                      </div>
                    </div>
                    <button type="button" onClick={() => handleProductRemove(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mt-6 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TAB 3: LOGISTICS */}
          <div className={`space-y-8 ${activeTab !== 'logistics' && 'hidden'}`}>
            {/* Transport */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Transport Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <InputField label="Gross Weight (kg)" type="number" value={formData.transport_gross} onChange={(v:any) => setFormData({...formData, transport_gross: v})} />
                <InputField label="Calc Weight (kg)" type="number" value={formData.transport_bereken} onChange={(v:any) => setFormData({...formData, transport_bereken: v})} />
                <InputField label="Price per Ton (€)" type="number" value={formData.transport_price_for_ton} onChange={(v:any) => setFormData({...formData, transport_price_for_ton: v})} />
                <InputField label="Diesel Surcharge (%)" type="number" value={formData.transport_diesel_toeslag} onChange={(v:any) => setFormData({...formData, transport_diesel_toeslag: v})} />
                <InputField label="Transport Subtotal" type="number" disabled value={formData.transport_total_no_btw} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <InputField label="Extra Stops (Qty)" type="number" value={formData.transport_extra_stop} onChange={(v:any) => setFormData({...formData, transport_extra_stop: v})} />
                <InputField label="Extra Stop Cost (€)" type="number" value={formData.transport_extra_stop_cost} onChange={(v:any) => setFormData({...formData, transport_extra_stop_cost: v})} />
              </div>
            </div>

            {/* Pallets */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Pallet Tracking</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField label="Pallets Qty" type="number" value={formData.pallets_quantity} onChange={(v:any) => setFormData({...formData, pallets_quantity: v})} />
                <InputField label="Pallet Price (€)" type="number" value={formData.pallets_price} onChange={(v:any) => setFormData({...formData, pallets_price: v})} />
                <InputField label="Pallets Total (€)" type="number" disabled value={formData.pallets_total_price} />
              </div>
              <div className="mt-4">
                <InputField label="Pallet Notes" value={formData.pallets_notes} onChange={(v:any) => setFormData({...formData, pallets_notes: v})} />
              </div>
            </div>
          </div>

          {/* TAB 4: SUMMARY */}
          <div className={`space-y-6 ${activeTab !== 'summary' && 'hidden'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Notes */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Loading Info</label>
                  <textarea rows={3} value={formData.loading_info} onChange={(e) => setFormData({...formData, loading_info: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm dark:text-white resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes</label>
                  <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none text-sm dark:text-white resize-none" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_paid} onChange={(e) => setFormData({...formData, is_paid: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 bg-gray-100 border-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mark as Paid</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_archived} onChange={(e) => setFormData({...formData, is_archived: e.target.checked})} className="rounded text-amber-500 focus:ring-amber-500 bg-gray-100 border-gray-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Archived</span>
                  </label>
                </div>
              </div>

              {/* Grand Totals */}
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-blue-200 dark:border-blue-800 pb-2">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal (No BTW)</span>
                    <span className="font-medium text-gray-900 dark:text-white">€ {formData.temp_no_btw_total}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-blue-100 dark:border-blue-800/50 pb-3">
                    <span className="text-gray-600 dark:text-gray-400">Global Discount (%)</span>
                    <input type="number" min="0" max="100" value={formData.discount} onChange={(e) => setFormData({...formData, discount: e.target.value})} className="w-20 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-right text-sm" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Discounted Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">€ {formData.no_btw_total}</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400 border-b border-blue-100 dark:border-blue-800/50 pb-3">
                    <span>BTW Amount</span>
                    <span className="font-medium">€ {formData.btw_total}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2">
                    <span>Final Total</span>
                    <span>€ {formData.final_total}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Step {activeTab === 'general' ? '1' : activeTab === 'products' ? '2' : activeTab === 'logistics' ? '3' : '4'} of 4
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-sm font-medium">Cancel</button>
            <button type="submit" form="entry-form" disabled={isLoading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium shadow-sm">
              {isLoading ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}