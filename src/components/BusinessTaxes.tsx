import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ServiceInvoice, 
  TaxPayment, 
} from '../businessTypes';
import { calculateTaxReport, TAX_RATES, safeFloat } from '../utils/taxCalculations';
import { parseCurrency, generateUUID } from '../utils';
import { auth } from '../firebase'; 
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { 
  TrendingUp, CheckCircle, Save, Calendar, Info, FileText, 
  Filter, X, AlertTriangle, Check, ArrowRight, DollarSign, PieChart, Calculator, Clock, AlertOctagon
} from 'lucide-react';

interface BusinessTaxesProps {
  invoices: ServiceInvoice[];
  payments: TaxPayment[];
  onSavePayment: (payment: TaxPayment) => void;
}

type TaxType = 'ISS' | 'PIS' | 'COFINS' | 'IRPJ' | 'CSLL';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// --- COMPONENTES AUXILIARES ---

const MoneyInput = ({ value, onCommit, placeholder }: { value: number; onCommit: (val: string) => void; placeholder?: string }) => {
  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
        setLocalValue(value > 0 ? value.toFixed(2).replace('.', ',') : '');
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    onCommit(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="relative flex items-center justify-end">
      <span className="absolute left-2 text-slate-400 text-xs font-bold">R$</span>
      <input 
        type="text"
        className="w-32 p-1.5 pl-7 text-right border border-slate-200 dark:border-slate-600 rounded bg-transparent focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
        placeholder={placeholder || "0,00"}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

const QuarterCard = ({ title, revenue, profit, excess }: { title: string, revenue: number, profit: number, excess: number }) => (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2 relative overflow-hidden group hover:border-indigo-300 transition-colors">
        <div className="absolute top-0 right-0 p-2 opacity-5"><Calculator size={40}/></div>
        <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={12}/> {title}</h4>
        <div className="space-y-2 mt-1">
            <div className="flex justify-between text-sm items-end">
                <span className="text-slate-600 dark:text-slate-400 text-xs">Faturamento</span>
                <span className="font-bold text-slate-800 dark:text-white">{parseCurrency(revenue)}</span>
            </div>
            <div className="flex justify-between text-sm items-end">
                <span className="text-slate-600 dark:text-slate-400 text-xs">Lucro Presumido (32%)</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{parseCurrency(profit)}</span>
            </div>
            <div className={`flex justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700 items-center ${excess > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                <span className="font-medium">Lucro Excedente {excess > 0 && '(>60k)'}</span>
                <span className="font-bold">{parseCurrency(excess)}</span>
            </div>
        </div>
    </div>
);

// Card de Status KPI
const StatusCard = ({ title, value, colorClass, icon: Icon }: { title: string, value: number, colorClass: string, icon: any }) => (
    <div className={`p-4 rounded-xl border flex items-center justify-between ${colorClass}`}>
        <div>
            <p className="text-xs font-bold uppercase opacity-70 mb-1">{title}</p>
            <p className="text-xl font-bold">{parseCurrency(value)}</p>
        </div>
        <div className="p-2 rounded-full bg-white/20">
            <Icon size={20} />
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL ---

export const BusinessTaxes: React.FC<BusinessTaxesProps> = ({ 
  invoices, 
  payments,
  onSavePayment 
}) => {
  const [selectedTax, setSelectedTax] = useState<TaxType | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [filterMonthStart, setFilterMonthStart] = useState(0);
  const [filterMonthEnd, setFilterMonthEnd] = useState(11);

  const taxReport = useMemo(() => calculateTaxReport(invoices, year), [invoices, year]);

  const processedInvoicesCount = useMemo(() => {
    return invoices.filter(inv => inv.status !== 'cancelled' && inv.issueDate?.startsWith(String(year))).length;
  }, [invoices, year]);

  const totals = useMemo(() => {
    const acc = { ISS: 0, PIS: 0, COFINS: 0, IRPJ: 0, CSLL: 0 };
    taxReport.forEach(m => {
      acc.ISS += m.taxes.ISS.dueAmount;
      acc.PIS += m.taxes.PIS.dueAmount;
      acc.COFINS += m.taxes.COFINS.dueAmount;
      acc.IRPJ += m.taxes.IRPJ.dueAmount;
      acc.CSLL += m.taxes.CSLL.dueAmount;
    });
    return acc;
  }, [taxReport]);

  const chartData = useMemo(() => {
    return taxReport.map((m, idx) => ({
      name: MONTH_NAMES[idx],
      ISS: m.taxes.ISS.dueAmount,
      PIS: m.taxes.PIS.dueAmount,
      COFINS: m.taxes.COFINS.dueAmount,
      IRPJ: m.taxes.IRPJ.dueAmount,
      CSLL: m.taxes.CSLL.dueAmount,
      Total: m.taxes.ISS.dueAmount + m.taxes.PIS.dueAmount + m.taxes.COFINS.dueAmount + m.taxes.IRPJ.dueAmount + m.taxes.CSLL.dueAmount
    }));
  }, [taxReport]);

  const quarterlyKPIs = useMemo(() => {
      const qs = [];
      const quarters = [['01','02','03'], ['04','05','06'], ['07','08','09'], ['10','11','12']];
      
      quarters.forEach((months, idx) => {
          let revenue = 0;
          months.forEach(m => {
              const s = taxReport.find(r => r.month === `${year}-${m}`);
              if (s) revenue += s.revenue;
          });
          const profit = revenue * TAX_RATES.PRESUMPTION_RATE;
          const excess = Math.max(0, profit - TAX_RATES.IRPJ_THRESHOLD_QUARTER);
          qs.push({ id: idx + 1, title: `${idx + 1}º Trimestre`, revenue, profit, excess });
      });
      return qs;
  }, [taxReport, year]);

  // KPIs de Status (Pago, Pendente, Atrasado, Multas)
  const statusKPIs = useMemo(() => {
      let paid = 0;
      let pending = 0;
      let overdue = 0;
      let fines = 0;
      const today = new Date().toISOString().split('T')[0];

      taxReport.forEach(m => {
          (['ISS', 'PIS', 'COFINS', 'IRPJ', 'CSLL'] as TaxType[]).forEach(tax => {
              const data = m.taxes[tax];
              const paymentId = `${tax}_${m.month}`;
              // Busca por ID fixo (preferencial) ou legado
              const existingPayment = payments.find(p => p.id === paymentId) || payments.find(p => p.taxType === tax && p.period === m.month);
              const paidAmount = existingPayment?.amountPaid || 0;

              if (paidAmount > 0) {
                  paid += paidAmount;
                  // Se pagou a mais que o devido, considera o excedente como multa/juros
                  if (paidAmount > data.dueAmount) {
                      fines += (paidAmount - data.dueAmount);
                  }
              } else if (data.dueAmount > 0) {
                  // Se não pagou e tem valor devido
                  if (data.dueDate < today) {
                      overdue += data.dueAmount;
                  } else {
                      pending += data.dueAmount;
                  }
              }
          });
      });

      return { paid, pending, overdue, fines };
  }, [taxReport, payments]);

  const handlePaymentChange = (month: string, tax: TaxType, valueStr: string) => {
    const value = safeFloat(valueStr);
    const deterministicId = `${tax}_${month}`;
    const existing = payments.find(p => p.id === deterministicId) || payments.find(p => p.taxType === tax && p.period === month);
    
    const userId = invoices[0]?.userId || auth.currentUser?.uid || existing?.userId;

    if (!userId) {
        console.error("ERRO CRÍTICO: Não foi possível identificar o usuário para salvar o pagamento.");
        return;
    }

    const payment: TaxPayment = {
      id: deterministicId, 
      taxType: tax,
      period: month,
      amountPaid: value,
      paymentDate: existing?.paymentDate || new Date().toISOString().split('T')[0],
      userId: userId 
    };
    
    onSavePayment(payment);
  };

  const handleToggleStatus = (month: string, tax: TaxType, dueAmount: number, currentPaid: number) => {
      const newValue = currentPaid > 0 ? '0' : dueAmount.toFixed(2).replace('.', ',');
      handlePaymentChange(month, tax, newValue);
  };

  const renderCard = (type: TaxType, colorClass: string, borderColorClass: string, bgClass: string) => {
    const isSelected = selectedTax === type;
    return (
      <button 
        onClick={() => setSelectedTax(isSelected ? null : type)}
        className={`flex-1 p-4 rounded-xl border transition-all relative overflow-hidden group ${
          isSelected 
            ? `${bgClass} text-white shadow-lg scale-105 z-10 border-transparent` 
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-bold uppercase ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>{type}</span>
          {isSelected && <CheckCircle size={16} className="text-white"/>}
        </div>
        <div className={`text-xl font-bold ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
          {parseCurrency(totals[type])}
        </div>
        <div className={`text-[10px] mt-1 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
          Acumulado {year}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn relative pb-20">
      {/* HEADER & FILTRO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-indigo-600" />
            Painel Tributário
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Apuração baseada em</span>
            <span className="flex items-center gap-1 font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
              <FileText size={12}/> {processedInvoicesCount} notas
            </span>
            <span>do Lucro Presumido</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <Calendar size={16} className="text-slate-400 ml-2"/>
                <select 
                    value={year} 
                    onChange={e => setYear(Number(e.target.value))}
                    className="bg-transparent text-slate-700 dark:text-white text-sm font-bold outline-none pr-2 py-1 cursor-pointer"
                >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded-lg border transition-colors ${isFilterOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'}`}
                title="Filtrar Período e Status"
            >
                <Filter size={18} />
            </button>
        </div>
      </div>

      {isFilterOpen && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg animate-scale-in mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Status do Pagamento</label>
                  <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                      <button onClick={() => setFilterStatus('all')} className={`flex-1 py-1.5 text-xs font-bold rounded ${filterStatus === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Todos</button>
                      <button onClick={() => setFilterStatus('paid')} className={`flex-1 py-1.5 text-xs font-bold rounded ${filterStatus === 'paid' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Pagos</button>
                      <button onClick={() => setFilterStatus('pending')} className={`flex-1 py-1.5 text-xs font-bold rounded ${filterStatus === 'pending' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}>Pendentes</button>
                  </div>
              </div>
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Período (Meses)</label>
                  <div className="flex items-center gap-2">
                      <select value={filterMonthStart} onChange={e => setFilterMonthStart(Number(e.target.value))} className="flex-1 p-2 bg-slate-100 dark:bg-slate-700 rounded text-sm outline-none">
                          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                      <ArrowRight size={14} className="text-slate-400"/>
                      <select value={filterMonthEnd} onChange={e => setFilterMonthEnd(Number(e.target.value))} className="flex-1 p-2 bg-slate-100 dark:bg-slate-700 rounded text-sm outline-none">
                          {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                      </select>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        {renderCard('ISS', 'text-blue-600', 'border-blue-200', 'bg-blue-600')}
        {renderCard('PIS', 'text-cyan-600', 'border-cyan-200', 'bg-cyan-600')}
        {renderCard('COFINS', 'text-teal-600', 'border-teal-200', 'bg-teal-600')}
        {renderCard('IRPJ', 'text-indigo-600', 'border-indigo-200', 'bg-indigo-600')}
        {renderCard('CSLL', 'text-violet-600', 'border-violet-200', 'bg-violet-600')}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        
        {!selectedTax && (
          <div className="p-6 flex flex-col gap-8 animate-fadeIn">
            
            {/* KPIs de Status (Acima dos Gráficos) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatusCard title="Impostos Pagos" value={statusKPIs.paid} colorClass="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" icon={CheckCircle} />
                <StatusCard title="Pendentes (A Vencer)" value={statusKPIs.pending} colorClass="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400" icon={Clock} />
                <StatusCard title="Em Atraso" value={statusKPIs.overdue} colorClass="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400" icon={AlertTriangle} />
                <StatusCard title="Total Multas/Juros" value={statusKPIs.fines} colorClass="bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-300" icon={AlertOctagon} />
            </div>

            {/* Seção Gráficos */}
            <div className="flex flex-col h-full border-t border-slate-100 dark:border-slate-700 pt-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Info size={18} className="text-slate-400"/>
                        Evolução da Carga Tributária
                    </h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[300px]">
                    <div className="flex flex-col">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Por Competência</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 10, fill: '#94a3b8'}}/>
                                <Tooltip formatter={(val: number) => parseCurrency(val)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f1f5f9', opacity: 0.4}}/>
                                <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}}/>
                                <Bar dataKey="ISS" stackId="a" fill="#3b82f6" name="ISS"/>
                                <Bar dataKey="PIS" stackId="a" fill="#06b6d4" name="PIS"/>
                                <Bar dataKey="COFINS" stackId="a" fill="#14b8a6" name="COFINS"/>
                                <Bar dataKey="IRPJ" stackId="a" fill="#6366f1" name="IRPJ"/>
                                <Bar dataKey="CSLL" stackId="a" fill="#8b5cf6" name="CSLL"/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 text-center">Acumulado Anual</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 10, fill: '#94a3b8'}}/>
                                <Tooltip formatter={(val: number) => parseCurrency(val)} contentStyle={{borderRadius: '8px', border: 'none'}}/>
                                <Legend wrapperStyle={{fontSize: '10px'}}/>
                                <Line type="monotone" dataKey="Total" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} name="Total Impostos" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Seção KPIs Trimestrais */}
            <div>
                <div className="flex items-center gap-2 mb-4 border-t border-slate-100 dark:border-slate-700 pt-6">
                    <PieChart size={18} className="text-slate-400"/>
                    <h3 className="font-bold text-lg dark:text-white">Performance Trimestral (Lucro Real vs Presumido)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quarterlyKPIs.map(q => (
                        <QuarterCard key={q.id} {...q} />
                    ))}
                </div>
            </div>

          </div>
        )}

        {/* === EXTRACT MODE (COM SELEÇÃO) === */}
        {selectedTax && (
          <div className="flex flex-col h-full animate-fadeIn">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                Extrato Detalhado: {selectedTax}
              </h3>
              <div className="text-xs font-mono text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded border border-slate-200 dark:border-slate-700">
                Alíquota Base: {
                  selectedTax === 'ISS' ? '5.00%' : 
                  selectedTax === 'PIS' ? '0.65%' :
                  selectedTax === 'COFINS' ? '3.00%' :
                  selectedTax === 'IRPJ' ? '4.80%' : '2.88%'
                }
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 uppercase font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4 w-48">Competência</th>
                    <th className="p-4 w-32">Vencimento</th>
                    {/* Exibe coluna de retenção para PIS/COFINS/IRPJ/CSLL */}
                    {['PIS', 'COFINS', 'IRPJ', 'CSLL'].includes(selectedTax) && <th className="p-4 text-right">( - ) Retido</th>}
                    <th className="p-4 text-right">(≈) A Pagar</th>
                    <th className="p-4 text-right w-40">(=) Pago</th>
                    <th className="p-4 text-center w-24">Status</th>
                    <th className="p-4 text-right w-40">Multa/Ajuste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {taxReport.filter((m, idx) => {
                    const isQuarterly = selectedTax === 'IRPJ' || selectedTax === 'CSLL';
                    if (isQuarterly && ![2, 5, 8, 11].includes(idx)) return false;

                    if (idx < filterMonthStart || idx > filterMonthEnd) return false;
                    const paymentId = `${selectedTax}_${m.month}`;
                    const paid = payments.find(p => p.id === paymentId)?.amountPaid || payments.find(p => p.taxType === selectedTax && p.period === m.month)?.amountPaid || 0;
                    
                    if (filterStatus === 'paid' && paid === 0) return false;
                    if (filterStatus === 'pending' && paid > 0) return false;

                    return true;
                  }).map((m) => {
                    const data = m.taxes[selectedTax];
                    const paymentId = `${selectedTax}_${m.month}`;
                    const paidAmount = payments.find(p => p.id === paymentId)?.amountPaid || payments.find(p => p.taxType === selectedTax && p.period === m.month)?.amountPaid || 0;
                    const diff = paidAmount - data.dueAmount;
                    
                    const [dueY, dueM, dueD] = data.dueDate.split('-');
                    const formattedDueDate = `${dueD}/${dueM}/${dueY}`;
                    
                    const monthIdx = parseInt(m.month.split('-')[1]) - 1;
                    const isQuarterlyTax = selectedTax === 'IRPJ' || selectedTax === 'CSLL';
                    const periodLabel = isQuarterlyTax 
                        ? `Trimestre findo em ${MONTH_NAMES[monthIdx]}` 
                        : `${MONTH_NAMES[monthIdx]}`;

                    // Lógica Atrasado (Só se não pagou e já passou da data)
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isOverdue = paidAmount === 0 && todayStr > data.dueDate && data.dueAmount > 0;

                    let adjustmentContent = <span className="text-slate-300 text-xs">-</span>;
                    if (paidAmount > 0) {
                        if (Math.abs(diff) < 0.05) {
                            adjustmentContent = <div className="flex items-center justify-end gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg font-bold text-xs"><Check size={12}/> Correto</div>;
                        } else if (diff > 0) {
                            adjustmentContent = <div className="flex items-center justify-end gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg font-bold text-xs"><AlertTriangle size={12}/> Multa (+{parseCurrency(diff)})</div>;
                        } else {
                            adjustmentContent = <div className="flex items-center justify-end gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg font-bold text-xs"><AlertTriangle size={12}/> {parseCurrency(diff)}</div>;
                        }
                    }

                    // Botão Status
                    let statusBtn = (
                        <button 
                            onClick={() => handleToggleStatus(m.month, selectedTax, data.dueAmount, paidAmount)}
                            className="px-3 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 transition-all"
                        >
                            PENDENTE
                        </button>
                    );

                    if (paidAmount > 0) {
                        statusBtn = (
                            <button 
                                onClick={() => handleToggleStatus(m.month, selectedTax, data.dueAmount, paidAmount)}
                                className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 transition-all"
                            >
                                PAGO
                            </button>
                        );
                    } else if (isOverdue) {
                        statusBtn = (
                            <button 
                                onClick={() => handleToggleStatus(m.month, selectedTax, data.dueAmount, paidAmount)}
                                className="px-3 py-1 rounded-full text-xs font-bold border bg-red-100 text-red-700 border-red-200 hover:bg-red-200 transition-all flex items-center justify-center gap-1 w-full"
                            >
                                <Clock size={10} /> ATRASADO
                            </button>
                        );
                    }

                    return (
                      <tr key={m.month} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                        <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                          {periodLabel} <span className="text-slate-400 text-xs ml-1">/ {year}</span>
                        </td>
                        <td className={`p-4 text-xs font-mono ${isOverdue ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
                          {formattedDueDate}
                        </td>
                        
                        {['PIS', 'COFINS', 'IRPJ', 'CSLL'].includes(selectedTax) && (
                            <td className="p-4 text-right text-slate-400 text-xs">
                                {data.retained > 0 ? `(${parseCurrency(data.retained)})` : '-'}
                            </td>
                        )}

                        <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-200">
                          {data.dueAmount > 0 ? parseCurrency(data.dueAmount) : '-'}
                          {data.surcharge ? <span className="text-[9px] text-indigo-500 block mt-0.5" title="Adicional de 10% sobre o excedente de R$ 60k">+ Adicional IRPJ de {parseCurrency(data.surcharge)}</span> : null}
                        </td>
                        
                        <td className="p-4 text-right">
                          <MoneyInput 
                            value={paidAmount} 
                            onCommit={(val) => handlePaymentChange(m.month, selectedTax, val)} 
                          />
                        </td>

                        <td className="p-4 text-center w-32">
                            {statusBtn}
                        </td>

                        <td className="p-4 text-right">
                          {adjustmentContent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};