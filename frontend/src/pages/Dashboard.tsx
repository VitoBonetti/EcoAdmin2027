import React, { useState, useEffect } from 'react';
import {
  FileText, AlertCircle, Clock, ChevronRight,
  BarChart3, PieChart as PieChartIcon, CreditCard, Users, Truck, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine
} from 'recharts';

// --- Types & Constants ---
interface DashboardData {
  kpis: {
    customers: number;
    suppliers: number;
    open_invoices: number;
    quotations: number;
    total_costs: number;
  };
  charts: {
    invoice_status_bar: Array<{ name: string; Paid: number; Open: number; Overdue: number }>;
    cost_diverging_bar: Array<{ name: string; Income: number; Expense: number }>;
    costs_by_category: Array<{ name: string; value: number }>;
    invoices_per_quarter: Array<{ quarter: string; count: number }>;
  };
  lists: {
    open_invoices: Array<any>;
    quotations: Array<any>;
  };
}

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16', '#64748b'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [yearFilter, setYearFilter] = useState<string>('All');
  const [quarterFilter, setQuarterFilter] = useState<string>('All');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({ year: yearFilter, quarter: quarterFilter });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/stats?${queryParams}`);
        if (response.ok) setData(await response.json());
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [yearFilter, quarterFilter]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);
  const formatDate = (dateString: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateString));

  const GlassCard = ({ children, className = '', title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
    <div className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 p-6 flex flex-col ${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-6">
          {Icon && <Icon className="text-gray-400" size={20} />}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">

      {/* --- HEADER & FILTERS --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Your business overview and pending actions.</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <Filter size={18} className="text-gray-400 ml-2" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 pr-2"
          >
            <option value="All">All Years</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          <select
            value={quarterFilter}
            onChange={(e) => setQuarterFilter(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-300 pl-1"
          >
            <option value="All">All Quarters</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="h-2 bg-blue-500/20 rounded-full overflow-hidden w-full"><div className="h-full bg-blue-500 animate-pulse w-1/3 rounded-full"></div></div>
      )}

      {/* --- ROW 1: KPI CARDS (5 Columns) --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Users size={20} className="text-blue-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customers</p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{data?.kpis.customers || 0}</h3>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <Truck size={20} className="text-purple-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Suppliers</p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{data?.kpis.suppliers || 0}</h3>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle size={20} className="text-orange-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Open Invoices</p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{data?.kpis.open_invoices || 0}</h3>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <FileText size={20} className="text-indigo-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quotations</p>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{data?.kpis.quotations || 0}</h3>
        </GlassCard>

        <GlassCard className={`p-4 border ${data?.kpis.total_costs && data.kpis.total_costs < 0 ? 'border-red-200 dark:border-red-900/30' : 'border-green-200 dark:border-green-900/30'}`}>
          <div className="flex items-center gap-3 mb-2">
            <CreditCard size={20} className="text-gray-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Net Costs</p>
          </div>
          <h3 className={`text-xl font-bold ${data?.kpis.total_costs && data.kpis.total_costs < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formatCurrency(data?.kpis.total_costs || 0)}
          </h3>
        </GlassCard>
      </div>

      {/* --- ROW 2: HORIZONTAL STACKED & DIVERGING BARS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <GlassCard title="Invoice Status" icon={BarChart3}>
          <div className="h-24 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data?.charts.invoice_status_bar} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="Paid" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} />
                <Bar dataKey="Open" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Overdue" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <span className="text-sm font-medium flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Paid</span>
            <span className="text-sm font-medium flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div> Open</span>
            <span className="text-sm font-medium flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Overdue</span>
          </div>
        </GlassCard>

        <GlassCard title="Costs Cashflow" icon={CreditCard}>
          <div className="h-24 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data?.charts.cost_diverging_bar} margin={{ top: 0, right: 20, left: 20, bottom: 0 }} stackOffset="sign">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={false} />
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <ReferenceLine x={0} stroke="#9ca3af" />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 0, 0, 4]} />
                <Bar dataKey="Income" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <span className="text-sm font-medium flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div> Income (Credit)</span>
            <span className="text-sm font-medium flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ef4444]"></div> Expenses</span>
          </div>
        </GlassCard>
      </div>

      {/* --- ROW 3: CATEGORY PIECHART & INVOICES BARCHART --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <GlassCard title="Costs by Category" icon={PieChartIcon}>
          <div className="h-64 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.charts.costs_by_category} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {data?.charts.costs_by_category?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => [value, 'Entries']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {data?.charts.costs_by_category?.map((entry, idx) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}></span>
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Invoices per Quarter" icon={BarChart3}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts.invoices_per_quarter} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis dataKey="quarter" tickFormatter={(val) => `Q${val}`} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* --- ROW 4: ACTION LISTS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <GlassCard title="Open Invoices & Commissions" icon={FileText}>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {data?.lists.open_invoices?.length === 0 ? (
              <p className="text-gray-500 text-center py-6">All clear! No open invoices.</p>
            ) : (
              data?.lists.open_invoices?.map((inv) => (
                <div key={inv.id} onClick={() => navigate('/entries')} className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                  inv.is_overdue
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50 hover:border-red-300'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:border-gray-300'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white">{inv.reference}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                        inv.is_commission ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                      }`}>
                        {inv.is_commission ? 'Commission' : 'Invoice'}
                      </span>
                      {inv.is_overdue && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Overdue</span>}
                    </div>
                    <p className={`text-xs font-medium flex items-center gap-1 mt-1 ${inv.is_overdue ? 'text-red-500' : 'text-gray-500'}`}>
                      <Clock size={12} /> Due {formatDate(inv.overdue_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${inv.is_overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {formatCurrency(inv.total)}
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard title="Quotations" icon={AlertCircle}>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {data?.lists.quotations?.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No quotations available.</p>
            ) : (
              data?.lists.quotations?.map((quotation) => (
                <div key={quotation.id} onClick={() => navigate('/entries')} className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer ${
                  quotation.is_overdue
                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/50 hover:border-orange-300'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:border-gray-300'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white">{quotation.reference}</p>
                      {quotation.is_overdue && <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Expired</span>}
                    </div>
                    <p className={`text-xs font-medium flex items-center gap-1 mt-1 ${quotation.is_overdue ? 'text-orange-500' : 'text-gray-500'}`}>
                      <Clock size={12} /> Valid till {formatDate(quotation.overdue_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(quotation.total)}</span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}