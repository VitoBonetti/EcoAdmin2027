import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight, Wallet, PiggyBank, Receipt, Building2, Landmark, Euro } from 'lucide-react';
import toast from 'react-hot-toast';

interface TaxData {
  entry_data: number;
  basic_cost: number;
  bank_interest: number;
  total_salary: number;
  total_tax: number;
  first_step: number;
  second_step: number;
  third_step: number;
  tax: number;
  after_tax: number;
  quarter_safe: number;
}

export default function Taxes() {
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('1');
  const [taxData, setTaxData] = useState<TaxData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch available years on mount
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/taxes/years`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setYears(data);
          // Auto-select the most recent year if available, otherwise current year
          if (data.length > 0) {
            setSelectedYear(data[data.length - 1].toString());
          } else {
            setSelectedYear(new Date().getFullYear().toString());
          }
        }
      } catch (error) {
        toast.error('Failed to load tax years');
      }
    };
    fetchYears();
  }, []);

  // 2. Fetch the calculation whenever Year or Quarter changes
  useEffect(() => {
    const fetchCalculation = async () => {
      if (!selectedYear || !selectedQuarter) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/taxes/calculate?year=${selectedYear}&quarter=${selectedQuarter}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setTaxData(await res.json());
        }
      } catch (error) {
        toast.error('Failed to calculate taxes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalculation();
  }, [selectedYear, selectedQuarter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const GlassCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-sm border border-white/80 dark:border-gray-800/80 p-6 ${className}`}>
      {children}
    </div>
  );

  const MathRow = ({ label, value, isSubtracted = false, isTotal = false }: { label: string, value: number, isSubtracted?: boolean, isTotal?: boolean }) => (
    <div className={`flex justify-between items-center py-2 ${isTotal ? 'border-t-2 border-gray-200 dark:border-gray-700 font-bold mt-2 pt-3' : 'text-gray-600 dark:text-gray-300'}`}>
      <span className={isTotal ? 'text-gray-900 dark:text-white' : ''}>{label}</span>
      <span className={`font-mono ${isSubtracted ? 'text-red-500' : ''} ${isTotal ? 'text-lg text-gray-900 dark:text-white' : ''}`}>
        {isSubtracted ? '-' : ''} {formatCurrency(value)}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">

      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tax Calculator</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Calculate your Quarter Safe baseline and tax liabilities.</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
          <Calculator size={18} className="text-gray-400 ml-2" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 pr-2"
          >
            <option value="" disabled>Year</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
            {!years.includes(new Date().getFullYear().toString()) && (
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            )}
          </select>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none cursor-pointer text-gray-700 dark:text-gray-300 pl-1"
          >
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="h-1 bg-blue-500/20 rounded-full overflow-hidden w-full mt-4">
          <div className="h-full bg-blue-500 animate-pulse w-1/3 rounded-full"></div>
        </div>
      )}

      {taxData && !isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">

          {/* LEFT COLUMN: THE MATHEMATICAL BREAKDOWN */}
          <div className="lg:col-span-7 space-y-6">

            {/* Step 1: Base Deductions */}
            <GlassCard>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Building2 size={16}/> 1. Deductible Costs Base
              </h3>
              <div className="space-y-1">
                <MathRow label="Basic Costs (Excl. Salary, Tax, ABN)" value={taxData.basic_cost} />
                <MathRow label="Bank Interest (ABN Amro Credits)" value={taxData.bank_interest} isSubtracted={true} />
                <MathRow label="Intermediate Cost Base (First Step)" value={taxData.first_step} isTotal={true} />
                <div className="py-2"></div>
                <MathRow label="Total Paid Taxes" value={taxData.total_tax} />
                <MathRow label="Total Deductible Costs (Second Step)" value={taxData.second_step} isTotal={true} />
              </div>
            </GlassCard>

            {/* Step 2: Taxable Base & Tax Calculation */}
            <GlassCard>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Landmark size={16}/> 2. Tax Calculation
              </h3>
              <div className="space-y-1">
                <MathRow label="Paid Invoices Revenue" value={taxData.entry_data} />
                <MathRow label="Minus Total Deductible Costs" value={taxData.second_step} isSubtracted={true} />
                <MathRow label="Taxable Profit Base (Third Step)" value={taxData.third_step} isTotal={true} />
                <div className="py-2"></div>
                <MathRow label="Income Tax Rate applied" value={0} /> {/* Display only, actual value handled below */}
                <div className="flex justify-between items-center py-2 text-red-600 dark:text-red-400 font-medium">
                  <span>Calculated Tax (45%)</span>
                  <span className="font-mono">- {formatCurrency(taxData.tax)}</span>
                </div>
                <MathRow label="Profit After Tax" value={taxData.after_tax} isTotal={true} />
              </div>
            </GlassCard>

          </div>

          {/* RIGHT COLUMN: HIGHLIGHTS & QUARTER SAFE */}
          <div className="lg:col-span-5 space-y-6">

            {/* Quarter Safe Hero Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-4 text-blue-100">
                <PiggyBank size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wide">Quarter Safe Result</h3>
              </div>
              <p className="text-4xl font-bold font-mono tracking-tight mb-6">
                {formatCurrency(taxData.quarter_safe)}
              </p>

              <div className="space-y-3 pt-6 border-t border-blue-500/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-100">Profit After Tax</span>
                  <span className="font-mono">{formatCurrency(taxData.after_tax)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-100">Minus Salary Taken</span>
                  <span className="font-mono text-red-200">- {formatCurrency(taxData.total_salary)}</span>
                </div>
              </div>
            </div>

            {/* Quick Summary Widgets */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                  <Receipt size={18} />
                  <span className="text-xs font-bold uppercase">Tax Set Aside</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  {formatCurrency(taxData.tax)}
                </p>
              </GlassCard>

              <GlassCard className="p-4 flex flex-col justify-center">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <Euro size={18} />
                  <span className="text-xs font-bold uppercase">Salary Deducted</span>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                  {formatCurrency(taxData.total_salary)}
                </p>
              </GlassCard>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-xl flex gap-3 text-sm text-blue-800 dark:text-blue-300">
              <div className="shrink-0 mt-0.5"><ArrowRight size={16} /></div>
              <p>
                <strong>What is Quarter Safe?</strong> This represents your final retained earnings for the quarter after setting aside 45% for taxes and covering your previously withdrawn salary.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}