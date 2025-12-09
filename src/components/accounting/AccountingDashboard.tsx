import React, { useMemo, useState } from 'react';
import { 
  BusinessTransaction, BusinessAccount, BusinessCategory, BusinessPartner, Client, Project 
} from '../../businessTypes';
import { parseCurrency, parseDate } from '../../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, RefreshCw, AlertCircle, Calendar, Tag, CheckSquare, Eye, EyeOff, Users, Briefcase, Building, CalendarRange, Filter, MoreVertical, X, Layers
} from 'lucide-react';

interface AccountingDashboardProps {
  transactions: BusinessTransaction[];
  accounts: BusinessAccount[];
  categories: BusinessCategory[];
  partners: BusinessPartner[];
  clients: Client[];
  projects: Project[];
  year: number;
  setYear: (year: number) => void;
  onSyncTaxes: () => void;
  onEditTransaction: (tx: BusinessTransaction) => void;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

type CategoryVisibility = 'show' | 'group' | 'hide';

export const AccountingDashboard: React.FC<AccountingDashboardProps> = ({
  transactions, accounts, categories, partners, clients, projects, year, setYear, onSyncTaxes, onEditTransaction
}) => {
  const [dashboardFilter, setDashboardFilter] = useState<'all' | 'checking' | 'investment' | 'credit_card'>('all');
  const [categoryConfig, setCategoryConfig] = useState<Record<string, CategoryVisibility>>({});
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); 

  const relevantAccounts = useMemo(() => {
      return accounts.filter(a => {
          if (dashboardFilter === 'all') return a.type !== 'credit_card';
          return a.type === dashboardFilter;
      });
  }, [accounts, dashboardFilter]);

  const checkIsInternal = (t: BusinessTransaction, realCategoryName: string) => {
      const name = (realCategoryName || '').toLowerCase();
      const type = (t.type || '').toLowerCase();
      const internalTerms = ['transferência', 'pagamento de fatura', 'aplicação', 'resgate', 'saldo inicial', 'ajuste', 'acerto'];
      return internalTerms.some(term => name.includes(term)) || type === 'transfer' || type === 'pagamento' || type === 'acerto';
  };

  // KPIs - GARANTINDO QUE SÓ CONTA O QUE FOI PAGO (status === 'paid')
  const kpis = useMemo(() => {
    let income = 0, expense = 0, balance = 0, pendingIncome = 0, pendingExpense = 0;
    
    const monthFilterStr = selectedMonth !== 'all' 
        ? `${year}-${String(selectedMonth + 1).padStart(2, '0')}` 
        : `${year}`; 

    const initialBalanceSum = relevantAccounts.reduce((acc, a) => acc + (Number(a.initialBalance) || 0), 0);
    balance = initialBalanceSum;

    // 1. Saldo Total (Todos os tempos) - APENAS PAGOS
    transactions.forEach(t => {
        if (!relevantAccounts.some(a => a.id === t.accountId)) return;
        
        // --- REGRA DE OURO: SÓ PAGO AFETA SALDO ---
        if (t.status === 'paid') {
            if (t.type === 'income') balance += Math.abs(t.value);
            else if (t.type === 'expense') balance -= Math.abs(t.value);
        }
    });

    // 2. Movimentação do Período (Mês Selecionado)
    transactions.forEach(t => {
      if (!relevantAccounts.some(a => a.id === t.accountId)) return;

      const catObj = categories.find(c => c.id === t.categoryId);
      const realCatName = catObj ? catObj.name : (t.categoryName || '');
      const isInternal = checkIsInternal(t, realCatName);
      const skipInFlow = dashboardFilter === 'all' && isInternal;
      
      const dateRef = t.status === 'paid' ? (t.datePaid || t.date) : t.date;

      if (dateRef.startsWith(monthFilterStr)) {
        if (!skipInFlow) {
            if (t.type === 'income') {
              if (t.status === 'paid') income += Math.abs(t.value); 
              else pendingIncome += Math.abs(t.value);
            } else if (t.type === 'expense') {
              if (t.status === 'paid') expense += Math.abs(t.value); 
              else pendingExpense += Math.abs(t.value);
            }
        }
      }
    });

    return { income, expense, balance, pendingIncome, pendingExpense };
  }, [transactions, relevantAccounts, year, selectedMonth, dashboardFilter, categories]);

  // Widget de Compromissos (Mantém lógica de Pendentes)
  const paymentSchedule = useMemo(() => {
      const today = new Date(); today.setHours(0,0,0,0);
      const todayStr = today.toISOString().split('T')[0];
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7); const nextWeekStr = nextWeek.toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

      const dueToday: BusinessTransaction[] = [];
      const dueWeek: BusinessTransaction[] = [];
      const dueMonth: BusinessTransaction[] = [];
      let totalToday = 0; let totalWeek = 0; let totalMonth = 0;

      transactions.forEach(t => {
          if (t.type === 'expense' && t.status === 'pending') {
              const tDate = t.date || '';
              if (tDate <= todayStr) { dueToday.push(t); totalToday += t.value; }
              if (tDate <= nextWeekStr) { dueWeek.push(t); totalWeek += t.value; }
              if (tDate <= endOfMonthStr) { dueMonth.push(t); totalMonth += t.value; }
          }
      });
      
      const sorter = (a: BusinessTransaction, b: BusinessTransaction) => (a.date || '').localeCompare(b.date || '');
      return { 
          dueToday: dueToday.sort(sorter), totalToday, 
          dueWeek: dueWeek.sort(sorter), totalWeek, 
          dueMonth: dueMonth.sort(sorter), totalMonth 
      };
  }, [transactions]);

  // Gráfico de Evolução (Saldo)
  const chartData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      name: MONTH_NAMES[i],
      ReceitasRealizadas: 0, DespesasRealizadas: 0, SaldoAcumuladoRealizado: 0, SaldoAcumuladoPrevisto: 0 
    }));

    const startBalanceInitial = relevantAccounts.reduce((acc, a) => acc + (Number(a.initialBalance) || 0), 0);
    let runningBalanceReal = startBalanceInitial;
    let runningBalancePrev = startBalanceInitial;
    const startOfYear = `${year}-01-01`;

    // Saldos anteriores
    transactions.forEach(t => {
        if (!relevantAccounts.some(a => a.id === t.accountId)) return;
        if (t.status === 'paid') {
            const payDate = t.datePaid || t.date;
            if (payDate < startOfYear) {
                const val = t.type === 'income' ? Math.abs(t.value) : -Math.abs(t.value);
                runningBalanceReal += val;
            }
        }
        if (t.date < startOfYear) {
             const val = t.type === 'income' ? Math.abs(t.value) : -Math.abs(t.value);
             runningBalancePrev += val;
        }
    });

    const monthlyChangesReal = Array(12).fill(0);
    const monthlyChangesPrev = Array(12).fill(0);

    transactions.forEach(t => {
        if (!relevantAccounts.some(a => a.id === t.accountId)) return;
        
        const catObj = categories.find(c => c.id === t.categoryId);
        const realCatName = catObj ? catObj.name : (t.categoryName || '');
        const isInternal = checkIsInternal(t, realCatName);

        const skipInBars = dashboardFilter === 'all' && isInternal;
        const val = t.type === 'income' ? Math.abs(t.value) : -Math.abs(t.value);

        if (t.date.startsWith(String(year))) {
            const m = parseInt(t.date.split('-')[1]) - 1;
            if (m >= 0 && m < 12) monthlyChangesPrev[m] += val;
        }

        if (t.status === 'paid') {
            const payDate = t.datePaid || t.date;
            if (payDate.startsWith(String(year))) {
                const m = parseInt(payDate.split('-')[1]) - 1;
                if (m >= 0 && m < 12) {
                    monthlyChangesReal[m] += val;
                    if (!skipInBars) {
                        if (t.type === 'income') data[m].ReceitasRealizadas += Math.abs(t.value);
                        else data[m].DespesasRealizadas += Math.abs(t.value);
                    }
                }
            }
        }
    });

    data.forEach((d, i) => {
        runningBalanceReal += monthlyChangesReal[i];
        runningBalancePrev += monthlyChangesPrev[i];
        d.SaldoAcumuladoRealizado = runningBalanceReal;
        d.SaldoAcumuladoPrevisto = runningBalancePrev;
    });

    return data;
  }, [transactions, year, dashboardFilter, relevantAccounts, categories]);

  // --- REUTILIZAÇÃO DA LÓGICA DE CATEGORIAS E GRÁFICOS JÁ EXISTENTE ---
  const categoriesListForConfig = useMemo(() => {
      const list = categories.map(c => ({ id: c.id, name: c.name, source: 'registered' }));
      list.unshift({ id: 'uncategorized', name: '⚠️ Sem Categoria', source: 'system' });
      transactions.forEach(t => {
          if (!t.categoryId && t.categoryName && t.categoryName !== 'Geral') {
              const legacyId = `legacy_${t.categoryName}`;
              if (!list.find(i => i.id === legacyId)) {
                  list.push({ id: legacyId, name: t.categoryName, source: 'legacy' });
              }
          }
      });
      return list;
  }, [categories, transactions]);

  const categoryChartData = useMemo(() => {
      const categoryMap: Record<string, number> = {};
      const filterStr = selectedMonth !== 'all' ? `${year}-${String(selectedMonth + 1).padStart(2, '0')}` : `${year}`;
      let groupedValue = 0;

      transactions.forEach(t => {
          if (!t.date.startsWith(filterStr)) return;
          if (t.type !== 'expense' || t.status !== 'paid') return;
          if (!relevantAccounts.some(a => a.id === t.accountId)) return;
          
          const categoryObj = categories.find(c => c.id === t.categoryId);
          let categoryName = 'Sem Categoria';
          let categoryId = 'uncategorized';

          if (categoryObj) {
              categoryName = categoryObj.name;
              categoryId = categoryObj.id;
          } else if (t.categoryName && t.categoryName !== 'Geral') {
              categoryName = t.categoryName;
              categoryId = `legacy_${t.categoryName}`;
          }

          const config = categoryConfig[categoryId] || 'show';
          if (config === 'hide') return;

          const val = Math.abs(t.value);
          if (config === 'group') {
              groupedValue += val;
          } else {
              categoryMap[categoryName] = (categoryMap[categoryName] || 0) + val;
          }
      });

      const sortedData = Object.entries(categoryMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      
      if (groupedValue > 0) {
          sortedData.push({ name: 'Demais Categorias', value: groupedValue });
      }

      return sortedData;
  }, [transactions, year, selectedMonth, relevantAccounts, categoryConfig, categories]);

  const toggleCategoryConfig = (id: string, newStatus: CategoryVisibility) => {
      setCategoryConfig(prev => ({ ...prev, [id]: newStatus }));
  };

  const getGroupedData = (groupByKey: 'partnerId' | 'clientId' | 'projectId', sourceList: any[], labelKey: string) => {
      const map: Record<string, number> = {};
      const filterStr = selectedMonth !== 'all' ? `${year}-${String(selectedMonth + 1).padStart(2, '0')}` : `${year}`;

      transactions.forEach(t => {
          const dateRef = t.status === 'paid' ? (t.datePaid || t.date) : t.date;
          if (!dateRef.startsWith(filterStr)) return;
          if (t.status !== 'paid') return;
          const key = t[groupByKey];
          if (key) map[key] = (map[key] || 0) + Math.abs(t.value);
      });
      return sourceList.map(item => ({ name: item[labelKey], value: map[item.id] || 0 })).filter(i => i.value > 0).sort((a,b) => b.value - a.value).slice(0, 6);
  };

  const partnerData = getGroupedData('partnerId', partners, 'name');
  const clientData = getGroupedData('clientId', clients, 'name');
  const projectData = getGroupedData('projectId', projects, 'name');

  const renderPieChart = (title: string, data: any[], icon: any) => (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
          <h4 className="font-bold text-slate-700 dark:text-white text-xs uppercase flex items-center gap-2 mb-4">{icon} {title}</h4>
          <div className="flex-1 min-h-[200px] relative">
              {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                              {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                          </Pie>
                          <Tooltip formatter={(val: number) => parseCurrency(val)} contentStyle={{borderRadius: '8px', border: 'none'}} />
                      </PieChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Sem dados no período</div>
              )}
          </div>
          <div className="mt-4 space-y-1 h-[100px] overflow-y-auto custom-scrollbar">
              {data.map((entry, index) => (
                  <div key={index} className="flex justify-between text-xs p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                          <span className="truncate max-w-[150px] dark:text-slate-300" title={entry.name}>{entry.name}</span>
                      </div>
                      <span className="font-bold dark:text-white">{parseCurrency(entry.value)}</span>
                  </div>
              ))}
          </div>
      </div>
  );

  const renderPaymentList = (list: BusinessTransaction[]) => {
      if (list.length === 0) return <div className="text-xs text-slate-400 italic py-2 text-center">Nenhum pagamento.</div>;
      return (
          <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {list.map(t => (
                  <div key={t.id} onClick={() => onEditTransaction(t)} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-700/50 rounded-lg border border-transparent hover:border-slate-200 cursor-pointer">
                      <div className="truncate flex-1 pr-2"><span className="font-bold text-slate-700 dark:text-slate-200 block truncate">{t.description}</span><span className="text-[10px] text-slate-400">{parseDate(t.date)}</span></div>
                      <span className="font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{parseCurrency(t.value)}</span>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10 w-full relative">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              {['all', 'checking', 'investment', 'credit_card'].map(f => (
                  <button key={f} onClick={() => setDashboardFilter(f as any)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${dashboardFilter === f ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}>{f === 'all' ? 'Visão Geral' : f === 'checking' ? 'Conta Corrente' : f === 'investment' ? 'Aplicações' : 'Cartões'}</button>
              ))}
          </div>
          <div className="flex gap-2 items-center">
             <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer">
                 <option value="all">Ano Todo</option>
                 {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
             </select>

             <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer">
                 {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
             <button onClick={onSyncTaxes} className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200 dark:border-slate-700"><RefreshCw size={14}/> Sincronizar</button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><div className="flex justify-between items-start mb-2"><div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Wallet size={24} /></div><span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">Total</span></div><p className="text-slate-500 text-xs font-bold uppercase">{dashboardFilter === 'credit_card' ? 'Fatura Atual' : 'Saldo Atual'}</p><h3 className="text-2xl font-bold text-slate-800 dark:text-white">{parseCurrency(kpis.balance)}</h3></div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><div className="flex justify-between items-start mb-2"><div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600"><TrendingUp size={24} /></div><span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">Receitas {selectedMonth !== 'all' ? `(${MONTH_NAMES[selectedMonth]})` : '(Ano)'}</span></div><div className="flex flex-col"><div className="flex justify-between items-end"><span className="text-xs text-slate-500">Realizado</span><span className="font-bold text-emerald-600">{parseCurrency(kpis.income)}</span></div><div className="flex justify-between items-end mt-1"><span className="text-xs text-slate-400">Pendente</span><span className="text-xs font-bold text-slate-400">{parseCurrency(kpis.pendingIncome)}</span></div></div></div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><div className="flex justify-between items-start mb-2"><div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600"><TrendingDown size={24} /></div><span className="text-xs font-bold bg-red-50 text-red-700 px-2 py-1 rounded">Despesas {selectedMonth !== 'all' ? `(${MONTH_NAMES[selectedMonth]})` : '(Ano)'}</span></div><div className="flex flex-col"><div className="flex justify-between items-end"><span className="text-xs text-slate-500">Realizado</span><span className="font-bold text-red-600">{parseCurrency(kpis.expense)}</span></div><div className="flex justify-between items-end mt-1"><span className="text-xs text-slate-400">Pendente</span><span className="text-xs font-bold text-slate-400">{parseCurrency(kpis.pendingExpense)}</span></div></div></div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><div className="flex justify-between items-start mb-2"><div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600"><DollarSign size={24} /></div><span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-1 rounded">Resultado</span></div><p className="text-slate-500 text-xs font-bold uppercase">Balanço {selectedMonth !== 'all' ? `(${MONTH_NAMES[selectedMonth]})` : '(Ano)'}</p><h3 className={`text-2xl font-bold ${kpis.income - kpis.expense >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>{parseCurrency(kpis.income - kpis.expense)}</h3></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full relative">
          <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-700 dark:text-white text-xs uppercase flex items-center gap-2"><Tag size={14}/> Maiores Despesas</h4>
              
              <button 
                  onClick={() => setIsConfigOpen(true)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                  title="Configurar Gráfico"
              >
                  <MoreVertical size={16}/>
              </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#64748b'}} />
                <Tooltip formatter={(value: number) => parseCurrency(value)} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={15}>
                    {categoryChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={index < 9 ? '#ef4444' : '#94a3b8'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
            <h4 className="font-bold text-slate-700 dark:text-white mb-4 text-xs uppercase flex items-center gap-2"><CheckSquare size={14}/> Fluxo Realizado</h4>
            <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `${val/1000}k`}/>
                        <Tooltip formatter={(value: number) => parseCurrency(value)} />
                        <Bar dataKey="ReceitasRealizadas" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="DespesasRealizadas" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-[500px]">
          <h4 className="font-bold text-slate-700 dark:text-white mb-4 text-xs uppercase flex items-center gap-2"><TrendingUp size={14}/> Evolução do Saldo ({year})</h4>
          <div className="w-full h-full pb-6" style={{ minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} tickFormatter={(val) => `${val/1000}k`}/>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip formatter={(value: number) => parseCurrency(value)} />
                <Legend iconType="plainline" wrapperStyle={{fontSize: '10px'}}/>
                <Area type="monotone" dataKey="SaldoAcumuladoRealizado" name="Saldo Realizado" stroke="#6366f1" fillOpacity={1} fill="url(#colorReal)" strokeWidth={3} />
                <Line type="monotone" dataKey="SaldoAcumuladoPrevisto" name="Saldo Previsto" stroke="#a855f7" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 className="font-bold text-slate-700 dark:text-white mb-4 text-xs uppercase flex items-center gap-2"><AlertCircle size={14}/> Compromissos Financeiros (A Pagar)</h4><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/30 rounded-xl flex flex-col h-full max-h-[300px]"><div className="flex justify-between items-start mb-2 pb-2 border-b border-red-100 dark:border-red-800/30"><div><div className="text-xs text-red-600 font-bold uppercase">Hoje</div><div className="text-xl font-bold text-red-700 dark:text-red-400">{parseCurrency(paymentSchedule.totalToday)}</div></div><Calendar className="text-red-300" size={20}/></div>{renderPaymentList(paymentSchedule.dueToday)}</div><div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/30 rounded-xl flex flex-col h-full max-h-[300px]"><div className="flex justify-between items-start mb-2 pb-2 border-b border-orange-100 dark:border-orange-800/30"><div><div className="text-xs text-orange-600 font-bold uppercase">Semana</div><div className="text-xl font-bold text-orange-700 dark:text-orange-400">{parseCurrency(paymentSchedule.totalWeek)}</div></div><CalendarRange className="text-orange-300" size={20}/></div>{renderPaymentList(paymentSchedule.dueWeek)}</div><div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl flex flex-col h-full max-h-[300px]"><div className="flex justify-between items-start mb-2 pb-2 border-b border-blue-100 dark:border-blue-800/30"><div><div className="text-xs text-blue-600 font-bold uppercase">Mês</div><div className="text-xl font-bold text-blue-700 dark:text-blue-400">{parseCurrency(paymentSchedule.totalMonth)}</div></div><Calendar className="text-blue-300" size={20}/></div>{renderPaymentList(paymentSchedule.dueMonth)}</div></div></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {renderPieChart('Por Profissional', partnerData, <Users size={14}/>)}
          {renderPieChart('Por Cliente', clientData, <Building size={14}/>)}
          {renderPieChart('Por Projeto', projectData, <Briefcase size={14}/>)}
      </div>

      {isConfigOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h3 className="font-bold text-slate-800 dark:text-white">Configurar Visualização</h3>
                      <button onClick={() => setIsConfigOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      <div className="text-xs text-slate-500 mb-2 px-1">Defina como cada categoria aparece no gráfico de despesas:</div>
                      {categoriesListForConfig.map(cat => {
                          const status = categoryConfig[cat.id] || 'show';
                          return (
                              <div key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-lg">
                                  <span className="font-medium text-sm dark:text-slate-200 truncate pr-2" title={cat.name}>{cat.name}</span>
                                  <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 shrink-0">
                                      <button 
                                          onClick={() => toggleCategoryConfig(cat.id, 'show')}
                                          className={`p-1.5 rounded-md transition-colors ${status === 'show' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                          title="Mostrar"
                                      >
                                          <Eye size={14}/>
                                      </button>
                                      <button 
                                          onClick={() => toggleCategoryConfig(cat.id, 'group')}
                                          className={`p-1.5 rounded-md transition-colors ${status === 'group' ? 'bg-white dark:bg-slate-600 shadow text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}
                                          title="Agrupar em 'Demais'"
                                      >
                                          <Layers size={14}/>
                                      </button>
                                      <button 
                                          onClick={() => toggleCategoryConfig(cat.id, 'hide')}
                                          className={`p-1.5 rounded-md transition-colors ${status === 'hide' ? 'bg-white dark:bg-slate-600 shadow text-red-600' : 'text-slate-400 hover:text-slate-600'}`}
                                          title="Ocultar"
                                      >
                                          <EyeOff size={14}/>
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
                      <button onClick={() => setIsConfigOpen(false)} className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors text-sm">
                          Concluir
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};