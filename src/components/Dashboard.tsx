import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Transaction, Account, CardTransaction, CardConfig, FilterState, SharedAccount, BudgetTarget, Tag } from '../types';
import { parseCurrency, checkDateMatch } from '../utils';
import { MONTH_NAMES } from '../constants';
import { TrendingUp, Users, Layers, CreditCard, Wallet, PieChart as PieIcon, ArrowDownCircle, ArrowUpCircle, Table2 } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[]; 
  allTransactions: Transaction[]; 
  cardTransactions: CardTransaction[];
  year: number; 
  accounts: Account[]; 
  cardConfigs: CardConfig[]; 
  sharedAccounts: SharedAccount[];
  filters: FilterState; 
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  enabledModules: { cards: boolean; shared: boolean; };
  budgetTargets?: BudgetTarget[];
  tags?: Tag[];
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    transactions = [], allTransactions = [], cardTransactions = [], year, accounts = [], cardConfigs = [], sharedAccounts = [], filters, setFilters, enabledModules, budgetTargets = [], tags = []
}) => {
  
  // --- 1. DADOS DO GRÁFICO (COM BLINDAGEM NaN) ---
  const chartData = useMemo(() => {
      let accumulatedBalance = 0;
      let accIncome = 0;
      let accExpense = 0;

      return MONTH_NAMES.map((name, index) => {
        let incomeReal = 0; let expenseReal = 0;
        let cardInvoice = 0; let sharedTotal = 0;
        
        if (filters.viewMode === 'accounts') {
            allTransactions.forEach(t => {
                if (t.isShared || t.account === 'Externo') return;
                if (filters.accountId !== 'all' && t.account !== filters.accountId) return;
                
                const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                if (!checkDateMatch(date, year, index)) return;

                const val = Number(t.value) || 0;

                if (val > 0) incomeReal += val;
                else expenseReal += Math.abs(val);
                
                accumulatedBalance += val;
            });
            accIncome += incomeReal;
            accExpense += expenseReal;
        } 
        else if (filters.viewMode === 'cards' && enabledModules.cards) {
            cardTransactions.forEach(t => {
                if (filters.accountId !== 'all' && t.cardName !== filters.accountId) return;
                if (!checkDateMatch(t.dateInvoice, year, index)) return;
                
                const val = Number(t.value) || 0;
                cardInvoice += val; 
                accumulatedBalance += val; 
            });
        } 
        else if (filters.viewMode === 'shared' && enabledModules.shared) {
             allTransactions.forEach(t => {
                if (!t.isShared) return;
                if (filters.accountId !== 'all' && t.account !== filters.accountId) return;
                
                const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                if (!checkDateMatch(date, year, index)) return;
                
                const val = Number(t.value) || 0;
                sharedTotal += Math.abs(val);
                accumulatedBalance += Math.abs(val);
            });
        }

        return { 
            name: name.substring(0,3), 
            Receitas: incomeReal, 
            Despesas: expenseReal, 
            FaturaCartao: cardInvoice, 
            TotalShared: sharedTotal, 
            SaldoAcumulado: accumulatedBalance,
            AccIncome: accIncome,
            AccExpense: accExpense
        };
      });
  }, [allTransactions, cardTransactions, year, filters, enabledModules]);

  // --- 2. PIZZA ---
  const pieData = useMemo(() => {
      const categoryMap: Record<string, number> = {};
      let totalValue = 0;
      
      const processTx = (type: string, value: number) => {
          if (value < 0 || filters.viewMode === 'cards' || filters.viewMode === 'shared') { 
             const cat = type || 'Geral';
             const val = Math.abs(Number(value) || 0);
             categoryMap[cat] = (categoryMap[cat] || 0) + val;
             totalValue += val;
          }
      };

      MONTH_NAMES.forEach((_, index) => {
          if (filters.viewMode === 'accounts') {
               allTransactions.forEach(t => {
                   if (t.isShared || t.account === 'Externo') return;
                   if (filters.accountId !== 'all' && t.account !== filters.accountId) return;
                   const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                   if (checkDateMatch(date, year, index)) processTx(t.type, t.value);
               });
          } else if (filters.viewMode === 'cards') {
              cardTransactions.forEach(t => {
                 if (filters.accountId !== 'all' && t.cardName !== filters.accountId) return;
                 if (checkDateMatch(t.dateInvoice, year, index)) processTx(t.type, t.value);
              });
          } else if (filters.viewMode === 'shared') {
               allTransactions.forEach(t => {
                   if (!t.isShared) return;
                   if (filters.accountId !== 'all' && t.account !== filters.accountId) return;
                   const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                   if (checkDateMatch(date, year, index)) processTx(t.type, t.value);
               });
          }
      });

      return Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value, percent: totalValue ? (value / totalValue) * 100 : 0 }))
        .sort((a,b) => b.value - a.value);
  }, [allTransactions, cardTransactions, year, filters]);

  // --- 3. MATRIZ ---
  const matrixData = useMemo(() => {
      const incomeRows: any[] = [];
      const expenseRows: any[] = [];

      tags.forEach(tag => {
          const monthlyIncome = Array(12).fill(0);
          const monthlyExpense = Array(12).fill(0);

          const process = (valInput: number, monthIdx: number) => {
              const val = Number(valInput) || 0;
              if (filters.viewMode === 'accounts') {
                  if (val > 0) monthlyIncome[monthIdx] += val;
                  else monthlyExpense[monthIdx] += Math.abs(val);
              } else {
                  monthlyExpense[monthIdx] += Math.abs(val);
              }
          };

          MONTH_NAMES.forEach((_, index) => {
               if (filters.viewMode === 'accounts') {
                  allTransactions.forEach(t => {
                      if (t.isShared || t.account === 'Externo' || t.type !== tag.name) return;
                      if (filters.accountId !== 'all' && t.account !== filters.accountId) return;
                      const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                      if (checkDateMatch(date, year, index)) process(t.value, index);
                  });
              } else if (filters.viewMode === 'cards') {
                  cardTransactions.forEach(t => {
                      if (t.type !== tag.name) return;
                      if (filters.accountId !== 'all' && t.cardName !== filters.accountId) return;
                      if (checkDateMatch(t.dateInvoice, year, index)) process(t.value, index);
                  });
              } else if (filters.viewMode === 'shared') {
                  allTransactions.forEach(t => {
                      if (!t.isShared || t.type !== tag.name) return;
                      if (filters.accountId !== 'all' && t.account !== filters.accountId) return;
                      const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                      if (checkDateMatch(date, year, index)) process(t.value, index);
                  });
              }
          });

          const totalInc = monthlyIncome.reduce((a,b)=>a+b,0);
          const totalExp = monthlyExpense.reduce((a,b)=>a+b,0);

          if (totalInc > 0) incomeRows.push({ name: tag.name, color: tag.color, monthlyValues: monthlyIncome, total: totalInc });
          if (totalExp > 0) expenseRows.push({ name: tag.name, color: tag.color, monthlyValues: monthlyExpense, total: totalExp });
      });

      return { incomeRows, expenseRows };
  }, [allTransactions, cardTransactions, year, filters, tags]);

  // --- CÁLCULO DE SALDO DO PERÍODO (ANO SELECIONADO) ---
  const periodBalance = useMemo(() => {
      // Filtra apenas transações do ano atual
      return allTransactions
        .filter(t => !t.isShared && t.account !== 'Externo')
        .filter(t => {
            const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
            return date?.startsWith(`${year}`);
        })
        .reduce((acc, t) => acc + (Number(t.value) || 0), 0);
  }, [allTransactions, year]);

  const getChartTitle = () => {
      if (filters.viewMode === 'cards') return `Fluxo das Faturas - ${year}`;
      if (filters.viewMode === 'shared') return `Fluxo das Contas Compartilhadas - ${year}`;
      return `Fluxo das Contas Correntes - ${year}`;
  };

  const renderTableSection = (title: string, rows: any[], isIncome: boolean) => {
      if (rows.length === 0) return null;
      const monthlyTotals = MONTH_NAMES.map((_, idx) => rows.reduce((acc, row) => acc + row.monthlyValues[idx], 0));
      const grandTotalSection = rows.reduce((acc, row) => acc + row.total, 0);

      return (
          <>
            <tr className={isIncome ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}>
                <td className={`p-3 text-xs font-extrabold uppercase tracking-wider border-y dark:border-slate-700 ${isIncome ? "text-emerald-600 bg-emerald-50 dark:bg-slate-900" : "text-red-600 bg-red-50 dark:bg-slate-900"} sticky left-0 z-20 min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                    <div className="flex items-center gap-2">{isIncome ? <ArrowUpCircle size={16}/> : <ArrowDownCircle size={16}/>} {title}</div>
                </td>
                <td colSpan={13} className={`border-y dark:border-slate-700 ${isIncome ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}></td>
            </tr>
            {rows.map(row => (
                <tr key={row.name} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                    <td className="p-2 flex items-center gap-2 font-medium dark:text-white border-r dark:border-slate-700 bg-white dark:bg-slate-900 sticky left-0 z-10 min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: row.color}}></div>{row.name}
                    </td>
                    {row.monthlyValues.map((val: number, idx: number) => (
                        <td key={idx} className="p-2 text-right text-slate-600 dark:text-slate-400 text-[11px] border-r dark:border-slate-700/50 min-w-[90px]">
                            {val > 0 ? parseCurrency(val) : '-'}
                        </td>
                    ))}
                    <td className="p-2 text-right font-bold dark:text-white min-w-[100px] bg-slate-50 dark:bg-slate-800">
                        {parseCurrency(row.total)}
                    </td>
                </tr>
            ))}
            <tr className={`font-bold text-xs ${isIncome ? 'bg-emerald-100/50 dark:bg-emerald-900/30' : 'bg-red-100/50 dark:bg-red-900/30'}`}>
                <td className="p-2 text-right border-r dark:border-slate-700 sticky left-0 z-10 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TOTAL</td>
                {monthlyTotals.map((val, idx) => (
                    <td key={idx} className="p-2 text-right border-r dark:border-slate-700">{val > 0 ? parseCurrency(val) : '-'}</td>
                ))}
                <td className="p-2 text-right text-sm">{parseCurrency(grandTotalSection)}</td>
            </tr>
          </>
      );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20 md:pb-0 flex flex-col h-full relative">
      
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-30 bg-slate-50 dark:bg-slate-900 pb-4 pt-1 -mx-6 px-6 shadow-sm transition-all">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-shrink-0 mb-4">
             <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                 <button onClick={() => setFilters(prev => ({...prev, viewMode: 'accounts', accountId: 'all'}))} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filters.viewMode === 'accounts' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Contas</button>
                 {enabledModules.cards && <button onClick={() => setFilters(prev => ({...prev, viewMode: 'cards', accountId: 'all'}))} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filters.viewMode === 'cards' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Cartões</button>}
                 {enabledModules.shared && <button onClick={() => setFilters(prev => ({...prev, viewMode: 'shared', accountId: 'all'}))} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filters.viewMode === 'shared' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Compartilhado</button>}
             </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x flex-shrink-0 min-h-[160px]">
              {/* Card Geral */}
              <button onClick={() => setFilters(p => ({...p, accountId: 'all'}))} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border ${filters.accountId === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>
                  <div className="flex justify-between items-start w-full"><span className="font-bold text-lg">Visão Geral</span><Layers size={24} className="opacity-50"/></div>
                  <div className="text-right">
                      <span className="text-xs opacity-70 block">{filters.viewMode === 'accounts' ? `Resultado do Ano (${year})` : `Acumulado (${year})`}</span>
                      <span className="text-2xl font-bold">{filters.viewMode === 'accounts' ? parseCurrency(periodBalance) : parseCurrency(chartData[chartData.length-1]?.SaldoAcumulado || 0)}</span>
                  </div>
              </button>

              {filters.viewMode === 'accounts' && accounts.filter(a => !a.archived).map(acc => {
                  // CÁLCULO DE RESULTADO DO PERÍODO POR CONTA
                  const balance = allTransactions
                      .filter(t => t.account === acc.name && !t.isShared)
                      .filter(t => {
                          const date = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                          return date?.startsWith(`${year}`);
                      })
                      .reduce((acc, t) => acc + (Number(t.value) || 0), 0);
                  
                  return (
                    <button key={acc.id} onClick={() => setFilters(p => ({...p, accountId: acc.name}))} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border ${filters.accountId === acc.name ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>
                        <div className="flex justify-between items-start w-full"><span className="font-bold truncate pr-2 text-lg">{acc.name}</span><Wallet size={24} className="opacity-50"/></div>
                        <div className="text-right"><span className="text-xs opacity-70 block">Resultado ({year})</span><span className="text-2xl font-bold">{parseCurrency(balance)}</span></div>
                    </button>
                  )
              })}
              
              {filters.viewMode === 'cards' && enabledModules.cards && cardConfigs.filter(c => !c.archived).map(card => {
                 const cardExpenses = cardTransactions.filter(t => t.cardName === card.id && t.dateInvoice?.startsWith(`${year}`)).reduce((acc, t) => acc + (Number(t.value) || 0), 0);
                 return (
                 <button key={card.id} onClick={() => setFilters(p => ({...p, accountId: card.id}))} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border ${filters.accountId === card.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>
                     <div className="flex justify-between items-start w-full"><span className="font-bold truncate pr-2 text-lg">{card.name}</span><CreditCard size={24} className="opacity-50"/></div>
                     <div className="text-right"><span className="text-xs opacity-70 block">Total Faturas {year}</span><span className="text-lg font-bold">{parseCurrency(cardExpenses)}</span></div>
                 </button>
                 )
              })}

              {filters.viewMode === 'shared' && enabledModules.shared && sharedAccounts.filter(s => !s.archived).map(shared => (
                 <button key={shared.id} onClick={() => setFilters(p => ({...p, accountId: shared.id}))} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border ${filters.accountId === shared.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>
                     <div className="flex justify-between items-start w-full"><span className="font-bold truncate pr-2 text-lg">{shared.name}</span><Users size={24} className="opacity-50"/></div>
                     <div className="text-right"><span className="text-xs opacity-70 block">Total {year}</span><span className="text-lg font-bold">{parseCurrency(Math.abs(matrixData.expenseRows.reduce((acc, row) => acc + row.total, 0)))}</span></div>
                 </button>
              ))}
          </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-[450px] flex flex-col flex-shrink-0">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">{getChartTitle()}</h3>
          <div className="w-full flex-1 min-w-0 relative" style={{ minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} stroke="#94a3b8" />
                      <Tooltip formatter={(value: number) => parseCurrency(value)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Legend />
                      {filters.viewMode === 'accounts' ? (
                          <>
                            <Bar yAxisId="left" dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} name="Receita (Mês)" />
                            <Bar yAxisId="left" dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} name="Despesa (Mês)" />
                            <Line yAxisId="right" type="monotone" dataKey="AccIncome" stroke="#059669" strokeWidth={2} dot={false} name="Acumulado Rec." />
                            <Line yAxisId="right" type="monotone" dataKey="AccExpense" stroke="#dc2626" strokeWidth={2} dot={false} name="Acumulado Desp." />
                          </>
                      ) : filters.viewMode === 'cards' ? (
                          <>
                            <Bar yAxisId="left" dataKey="FaturaCartao" fill="#f97316" radius={[4, 4, 0, 0]} barSize={12} name="Fatura Mensal" />
                            <Line yAxisId="right" type="monotone" dataKey="SaldoAcumulado" stroke="#ea580c" strokeWidth={3} dot={{r: 3}} name="Fatura Acumulada" />
                          </>
                      ) : (
                          <>
                            <Bar yAxisId="left" dataKey="TotalShared" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} name="Total Conta" />
                            <Line yAxisId="right" type="monotone" dataKey="SaldoAcumulado" stroke="#3b82f6" strokeWidth={3} dot={{r: 3}} name="Gasto Acumulado" />
                          </>
                      )}
                  </ComposedChart>
              </ResponsiveContainer>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-[500px] flex flex-col">
               <h3 className="text-lg font-bold mb-2 flex items-center gap-2 dark:text-white"><PieIcon size={20}/> Distribuição</h3>
               <div className="flex-1 min-h-0 relative">
                   {pieData.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                               <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                   {pieData.map((entry, index) => {
                                       const tag = tags.find(t => t.name === entry.name);
                                       return <Cell key={`cell-${index}`} fill={tag ? tag.color : '#cbd5e1'} />;
                                   })}
                               </Pie>
                               <Tooltip formatter={(value: number) => parseCurrency(value)} />
                           </PieChart>
                       </ResponsiveContainer>
                   ) : <div className="text-slate-400 h-full flex items-center justify-center">Sem dados</div>}
               </div>
               <div className="mt-4 h-[180px] overflow-y-auto pr-2 custom-scrollbar border-t dark:border-slate-700 pt-2">
                  <table className="w-full text-xs">
                      <tbody>
                        {pieData.map((entry, idx) => {
                           const tag = tags.find(t => t.name === entry.name);
                           return (
                             <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                               <td className="py-2 flex items-center gap-2 dark:text-slate-300">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: tag?.color || '#ccc'}}></div>
                                  <span className="truncate max-w-[100px]">{entry.name}</span>
                               </td>
                               <td className="py-2 text-right font-bold text-slate-600 dark:text-slate-400">{entry.percent.toFixed(1)}%</td>
                               <td className="py-2 text-right font-medium dark:text-white">{parseCurrency(entry.value)}</td>
                             </tr>
                           )
                        })}
                      </tbody>
                  </table>
               </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[500px]">
              <h3 className="text-lg font-bold mb-4 dark:text-white flex items-center gap-2"><Table2 size={20}/> Detalhamento Mensal</h3>
              <div className="flex-1 overflow-auto relative">
                  <table className="w-full text-xs text-left border-collapse">
                      <thead className="sticky top-0 bg-white dark:bg-slate-800 z-20 shadow-sm">
                          <tr className="border-b dark:border-slate-700">
                              <th className="p-3 font-bold text-slate-500 sticky left-0 bg-white dark:bg-slate-800 z-30 min-w-[150px] border-r dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Categoria</th>
                              {MONTH_NAMES.map(m => <th key={m} className="p-2 text-center text-slate-500 min-w-[90px]">{m.substring(0,3)}</th>)}
                              <th className="p-3 text-right font-bold text-slate-500 min-w-[100px]">Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {renderTableSection('Receitas', matrixData.incomeRows, true)}
                          {matrixData.incomeRows.length > 0 && <tr><td colSpan={14} className="h-4"></td></tr>}
                          {renderTableSection('Despesas', matrixData.expenseRows, false)}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};