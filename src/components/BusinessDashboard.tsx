import React, { useState, useMemo } from 'react';
import { 
  ServiceInvoice, BusinessTransaction, Project, Client, TaxPayment, BusinessCategory, BusinessPartner 
} from '../businessTypes';
import { parseCurrency } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, ComposedChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, 
  Activity, Target, Filter, ArrowRight, Wallet, Landmark, Calendar, Users, 
  ChevronRight, ArrowDown as ArrowDownIcon, Briefcase
} from 'lucide-react';

type DashboardView = 'dashboard' | 'crm' | 'projects' | 'invoices' | 'taxes' | 'cashflow' | 'settings' | 'partners';

interface BusinessDashboardProps {
  invoices: ServiceInvoice[];
  transactions: BusinessTransaction[];
  categories: BusinessCategory[];
  projects: Project[];
  clients: Client[];
  taxPayments: TaxPayment[];
  partners: BusinessPartner[];
  onNavigate?: (view: DashboardView) => void;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// --- UTILITÁRIOS ---
const getInvoiceDate = (inv: any): string => inv.issuanceDate || inv.issueDate || inv.date || inv.createdAt || '';
const getInvoiceValue = (inv: any): number => safeFloat(inv.grossValue ?? inv.amount ?? inv.value ?? inv.total ?? 0);

const getSafeYear = (dateStr?: string) => {
    if (!dateStr) return 0;
    if (dateStr.includes('-')) return parseInt(dateStr.split('-')[0]);
    if (dateStr.includes('/')) return parseInt(dateStr.split('/')[2]);
    try { return new Date(dateStr).getFullYear(); } catch { return 0; }
};

const getSafeMonth = (dateStr?: string) => {
    if (!dateStr) return -1;
    if (dateStr.includes('-')) return parseInt(dateStr.split('-')[1]) - 1;
    if (dateStr.includes('/')) return parseInt(dateStr.split('/')[1]) - 1;
    try { return new Date(dateStr).getMonth(); } catch { return -1; }
};

const safeFloat = (val: any) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        let clean = val.replace(/[R$\s]/g, '');
        if (clean.includes(',') && !clean.includes('.')) clean = clean.replace(',', '.');
        else if (clean.includes('.') && clean.includes(',')) {
            if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) clean = clean.replace(/\./g, '').replace(',', '.');
            else clean = clean.replace(/,/g, '');
        }
        return parseFloat(clean) || 0;
    }
    return 0;
};

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  invoices,
  transactions,
  categories,
  projects,
  clients,
  taxPayments,
  partners,
  onNavigate
}) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  // --- LÓGICA DE CLASSIFICAÇÃO ---
  const isMovement = (category: BusinessCategory | undefined, type: string, description: string) => {
      if (category?.subtype === 'movement') return true;
      const text = `${type} ${description}`.toLowerCase();
      if (text.includes('aplicação') || text.includes('investimento') || text.includes('resgate')) return true;
      if (text.includes('transferência') || type === 'transfer') return true;
      return false;
  };

  const isProfitDistribution = (categoryName: string) => {
      const cat = (categoryName || '').toLowerCase();
      return cat.includes('dividendo') || cat.includes('distribuição') || cat.includes('lucro') || cat.includes('sócios') || cat.includes('antecipação');
  };

  // --- KPI DATA ---
  const kpiData = useMemo(() => {
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      name: MONTH_NAMES[i],
      faturamentoBrutoNotas: 0,
      baseCalculoPresumido: 0,
      lucroPresumido: 0,
      
      receitaCaixa: 0,
      custoDireto: 0,
      despesaOperacional: 0,
      gastoSociedade: 0,
      
      lucroBrutoReal: 0,
      lucroLiquidoReal: 0,
      lucroProdutivo: 0,
      
      dividendos: 0,
      movimentacoes: 0
    }));

    invoices.forEach(inv => {
      if (inv.status === 'cancelled') return;
      const dateStr = getInvoiceDate(inv);
      if (getSafeYear(dateStr) !== year) return;
      const m = getSafeMonth(dateStr);
      if (m >= 0 && m < 12) {
          const val = getInvoiceValue(inv);
          monthlyData[m].faturamentoBrutoNotas += val;
          if (inv.isTaxable !== false) {
              monthlyData[m].baseCalculoPresumido += val;
              monthlyData[m].lucroPresumido += val * 0.32;
          }
      }
    });

    transactions.forEach(tx => {
      const dateRef = tx.status === 'paid' ? (tx.datePaid || tx.date) : tx.date;
      if (getSafeYear(dateRef) !== year) return;
      const m = getSafeMonth(dateRef);
      if (m < 0 || m > 11) return;

      const val = Math.abs(safeFloat(tx.value));
      const catObj = categories.find(c => c.id === tx.categoryId);
      const categoryName = catObj ? catObj.name : (tx.categoryName || (tx as any).category || tx.type || '');
      const desc = tx.description || '';

      if (isMovement(catObj, tx.type, desc)) {
          monthlyData[m].movimentacoes += val;
          return;
      }

      if (tx.type === 'income') {
          monthlyData[m].receitaCaixa += val;
      } else if (tx.type === 'expense') {
          if (isProfitDistribution(categoryName)) {
              monthlyData[m].dividendos += val;
          } else {
              if (catObj?.subtype === 'cost') {
                  monthlyData[m].custoDireto += val;
              } else if (catObj?.subtype === 'productive_society') {
                  monthlyData[m].gastoSociedade += val;
              } else {
                  monthlyData[m].despesaOperacional += val;
              }
          }
      }
    });

    monthlyData.forEach(d => { 
        d.lucroBrutoReal = d.receitaCaixa - d.custoDireto;
        d.lucroLiquidoReal = d.lucroBrutoReal - d.despesaOperacional;
        d.lucroProdutivo = d.lucroLiquidoReal - d.gastoSociedade;
    });
    
    return monthlyData;
  }, [invoices, transactions, year, categories]);

  const totals = useMemo(() => {
    const dataToSum = selectedMonth === 'all' ? kpiData : [kpiData[selectedMonth]];
    
    return dataToSum.reduce((acc, curr) => ({
      faturamentoBrutoNotas: acc.faturamentoBrutoNotas + curr.faturamentoBrutoNotas,
      lucroPresumido: acc.lucroPresumido + curr.lucroPresumido,
      receitaCaixa: acc.receitaCaixa + curr.receitaCaixa,
      custoDireto: acc.custoDireto + curr.custoDireto,
      despesaOperacional: acc.despesaOperacional + curr.despesaOperacional,
      gastoSociedade: acc.gastoSociedade + curr.gastoSociedade,
      lucroBrutoReal: acc.lucroBrutoReal + curr.lucroBrutoReal,
      lucroLiquidoReal: acc.lucroLiquidoReal + curr.lucroLiquidoReal,
      lucroProdutivo: acc.lucroProdutivo + curr.lucroProdutivo,
      dividendos: acc.dividendos + curr.dividendos
    }), { faturamentoBrutoNotas: 0, lucroPresumido: 0, receitaCaixa: 0, custoDireto: 0, despesaOperacional: 0, gastoSociedade: 0, lucroBrutoReal: 0, lucroLiquidoReal: 0, lucroProdutivo: 0, dividendos: 0 });
  }, [kpiData, selectedMonth]);

  const margins = useMemo(() => {
      const revenue = totals.receitaCaixa || 1;
      return {
          gross: (totals.lucroBrutoReal / revenue) * 100,
          net: (totals.lucroLiquidoReal / revenue) * 100,
          prod: (totals.lucroProdutivo / revenue) * 100
      };
  }, [totals]);

  const societyBreakdown = useMemo(() => {
      const breakdown: Record<string, number> = {};
      transactions.forEach(tx => {
          const dateRef = tx.status === 'paid' ? (tx.datePaid || tx.date) : tx.date;
          if (getSafeYear(dateRef) !== year) return;
          const m = getSafeMonth(dateRef);
          if (selectedMonth !== 'all' && m !== selectedMonth) return;

          const catObj = categories.find(c => c.id === tx.categoryId);
          if (tx.type === 'expense' && catObj?.subtype === 'productive_society') {
               const val = Math.abs(safeFloat(tx.value));
               const partnerId = tx.partnerId || 'unknown';
               breakdown[partnerId] = (breakdown[partnerId] || 0) + val;
          }
      });
      return Object.entries(breakdown).map(([id, value]) => {
          const partner = partners.find(p => p.id === id);
          return { name: partner ? partner.name : 'Geral/Outros', value };
      }).sort((a,b) => b.value - a.value);
  }, [transactions, year, selectedMonth, categories, partners]);

  // --- CLIENTES (ATIVOS: ORÇAMENTO vs FATURADO) ---
  const activeClientInsights = useMemo(() => {
    return clients.map(client => {
      const clientInvoices = invoices.filter(i => i.clientId === client.id && i.status !== 'cancelled');
      
      const clientProjects = projects.filter(p => 
          p.clientId === client.id && 
          p.status !== 'pending' && 
          p.status !== 'cancelled'
      );

      const totalFaturado = clientInvoices.reduce((acc, i) => acc + getInvoiceValue(i), 0);
      const totalOrcamento = clientProjects.reduce((acc, p) => acc + safeFloat(p.value), 0);
      
      const billingProgress = totalOrcamento > 0 ? (totalFaturado / totalOrcamento) * 100 : 0;
      const backlog = totalOrcamento - totalFaturado;

      return { 
          id: client.id, 
          name: client.name, 
          totalFaturado, 
          totalOrcamento, 
          billingProgress,
          backlog
      };
    })
    .filter(c => c.totalOrcamento > 0 || c.totalFaturado > 0)
    .sort((a, b) => b.totalFaturado - a.totalFaturado);
  }, [clients, invoices, projects]);

  // --- CALCULA TOTALIZADORES DE CLIENTES ---
  const activeClientsTotals = useMemo(() => {
      return activeClientInsights.reduce((acc, curr) => ({
          orcamento: acc.orcamento + curr.totalOrcamento,
          faturado: acc.faturado + curr.totalFaturado,
          backlog: acc.backlog + curr.backlog
      }), { orcamento: 0, faturado: 0, backlog: 0 });
  }, [activeClientInsights]);

  // --- PIPELINE (PROPOSTAS) ---
  const pipelineInsights = useMemo(() => {
      return clients.map(client => {
          const proposals = projects.filter(p => p.clientId === client.id && p.status === 'pending');
          const totalProposta = proposals.reduce((acc, p) => acc + safeFloat(p.value), 0);
          return {
              id: client.id,
              name: client.name,
              totalProposta,
              count: proposals.length
          };
      })
      .filter(c => c.totalProposta > 0)
      .sort((a, b) => b.totalProposta - a.totalProposta);
  }, [clients, projects]);

  const ProfitCard = ({ title, value, margin, colorClass, textColor, subtitle }: any) => (
      <div className={`p-4 rounded-xl border ${colorClass} flex flex-col justify-between min-h-[120px] relative overflow-hidden group`}>
          <div className="absolute right-0 top-0 p-3 opacity-10"><DollarSign size={40}/></div>
          <div>
              <p className="text-xs font-bold uppercase opacity-70 mb-1">{title}</p>
              <h3 className={`text-2xl font-bold ${textColor}`}>{parseCurrency(value)}</h3>
          </div>
          <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 flex justify-between items-center">
              <span className="text-xs font-medium">Margem: {margin.toFixed(1)}%</span>
              {subtitle && <span className="text-[10px] opacity-70">{subtitle}</span>}
          </div>
      </div>
  );

  const KpiCard = ({ title, value, icon: Icon, colorClass, linkTo, subtitle, valueColor, hoverContent }: any) => (
      <div 
        onClick={() => onNavigate && onNavigate(linkTo)}
        className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group relative"
      >
          <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg ${colorClass}`}><Icon size={20}/></div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-indigo-500 font-bold">
                  Ver <ArrowRight size={12}/>
              </div>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase">{title}</p>
          <h3 className={`text-2xl font-bold ${valueColor || 'text-slate-800 dark:text-white'}`}>{parseCurrency(value)}</h3>
          {subtitle && <div className="text-[10px] mt-1">{subtitle}</div>}
          {hoverContent && (
              <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 text-white p-3 rounded-xl shadow-xl z-20 hidden group-hover:block border border-slate-700 animate-fadeIn">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2 border-b border-slate-700 pb-1">Detalhamento</div>
                  {hoverContent}
              </div>
          )}
      </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="text-indigo-600"/> DRE Gerencial
          </h2>
          <p className="text-xs text-slate-500 mt-1">Análise de Lucratividade em Cascata (Regime de Caixa).</p>
        </div>
        
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <Filter size={16} className="text-slate-400 ml-2"/>
                <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-transparent text-slate-700 dark:text-white text-sm font-bold outline-none px-2 py-1 cursor-pointer"
                >
                    <option value="all">Ano Todo</option>
                    {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                <Calendar size={16} className="text-slate-400 ml-2"/>
                <select 
                    value={year} 
                    onChange={e => setYear(Number(e.target.value))}
                    className="bg-transparent text-slate-700 dark:text-white text-sm font-bold outline-none px-2 py-1 cursor-pointer"
                >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* KPI CARDS (DRE RESUMIDO) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <KpiCard 
            title="Faturamento Bruto (Notas)" 
            value={totals.faturamentoBrutoNotas} 
            icon={TrendingUp} 
            colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30"
            linkTo="invoices"
            subtitle="Regime de Competência"
        />

        <KpiCard 
            title="Faturamento Real (Caixa)" 
            value={totals.receitaCaixa} 
            icon={Wallet} 
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
            linkTo="cashflow"
            subtitle="Entradas Efetivas"
        />

        <KpiCard 
            title="Lucro Bruto Real" 
            value={totals.lucroBrutoReal} 
            icon={Target} 
            colorClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30"
            linkTo="cashflow"
            valueColor="text-orange-600"
            subtitle={
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Margem Bruta: {margins.gross.toFixed(1)}%</span>
                    <span className="text-slate-400">Receita - Custos Diretos</span>
                </div>
            }
        />

        <KpiCard 
            title="Lucro Líquido Real" 
            value={totals.lucroLiquidoReal} 
            icon={DollarSign} 
            colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
            linkTo="cashflow"
            valueColor="text-emerald-600"
            subtitle={
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold">Margem Líquida: {margins.net.toFixed(1)}%</span>
                    <span className="text-slate-400">Bruto - Despesas Op.</span>
                </div>
            }
        />
      </div>

      {/* DRE VISUAL EM CASCATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-3">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Target size={20} className="text-indigo-500"/> Resultado Operacional</h3>
                  <div className="text-right">
                      <span className="text-xs text-slate-500 block uppercase">Receita Líquida (Caixa)</span>
                      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{parseCurrency(totals.receitaCaixa)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ProfitCard 
                      title="1. Lucro Bruto" 
                      value={totals.lucroBrutoReal} 
                      margin={margins.gross} 
                      colorClass="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      textColor="text-blue-700 dark:text-blue-400"
                      subtitle="(-) Custos Diretos"
                  />
                  <ProfitCard 
                      title="2. Lucro Líquido" 
                      value={totals.lucroLiquidoReal} 
                      margin={margins.net} 
                      colorClass="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
                      textColor="text-emerald-700 dark:text-emerald-400"
                      subtitle="(-) Despesas Operacionais"
                  />
                  <ProfitCard 
                      title="3. Lucro Produtivo (Final)" 
                      value={totals.lucroProdutivo} 
                      margin={margins.prod} 
                      colorClass="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800"
                      textColor="text-purple-700 dark:text-purple-400"
                      subtitle="(-) Sociedade Produtiva"
                  />
              </div>
          </div>
      </div>

      {/* DETALHAMENTO DE SAÍDAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Custos Diretos</span>
              <div className="text-lg font-bold text-orange-600">{parseCurrency(totals.custoDireto)}</div>
              <div className="text-xs text-orange-600/70 mt-1">Abate do Lucro Bruto</div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Despesas Operacionais</span>
              <div className="text-lg font-bold text-red-600">{parseCurrency(totals.despesaOperacional)}</div>
              <div className="text-xs text-red-600/70 mt-1">Abate do Lucro Líquido</div>
          </div>
          
          <KpiCard 
              title="Sociedade Produtiva" 
              value={totals.gastoSociedade} 
              icon={Users} 
              colorClass="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800"
              linkTo="cashflow"
              valueColor="text-purple-600"
              subtitle="Abate do Lucro Produtivo"
              hoverContent={
                  societyBreakdown.length > 0 ? (
                      <div className="space-y-1">
                          {societyBreakdown.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs">
                                  <span>{item.name}</span>
                                  <span className="font-bold text-emerald-400">{parseCurrency(item.value)}</span>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-xs text-slate-500 italic">Nenhum registro classificado.</div>
              }
          />

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Presunção Fiscal (32%)</span>
              <div className="text-lg font-bold text-amber-600">{parseCurrency(totals.lucroPresumido)}</div>
              <div className="text-xs text-amber-600/70 mt-1">Ref. Tributária sobre Notas</div>
          </div>
      </div>

      {/* GRÁFICO DE EVOLUÇÃO */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-[400px] flex flex-col">
          <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={20}/> Evolução da Lucratividade</h3>
          <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={kpiData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 10}}/>
                      <Tooltip formatter={(value: number) => parseCurrency(value)} contentStyle={{borderRadius: '8px', border: 'none'}} />
                      <Legend wrapperStyle={{fontSize: '11px'}} />
                      
                      <Bar dataKey="lucroLiquidoReal" name="Lucro Líquido" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line type="monotone" dataKey="lucroProdutivo" name="Lucro Produtivo" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4}} />
                      <Line type="monotone" dataKey="lucroPresumido" name="Presunção (32%)" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </ComposedChart>
              </ResponsiveContainer>
          </div>
      </div>

      {/* KPI: CLIENTES (ATIVOS) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Users size={20} className="text-blue-500"/> Performance de Carteira Ativa</h3>
              {onNavigate && <button onClick={() => onNavigate('crm')} className="text-xs font-bold text-blue-600 hover:underline">Ver CRM Completo</button>}
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 font-bold">
                      <tr>
                          <th className="p-4">Cliente</th>
                          <th className="p-4 text-right">Orçamento</th>
                          <th className="p-4 text-right">Faturado</th>
                          <th className="p-4 text-center">Progresso</th>
                          <th className="p-4 text-right">Backlog (Saldo)</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {activeClientInsights.map((client, idx) => {
                          return (
                              <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                  <td className="p-4 font-bold text-slate-700 dark:text-white">
                                      <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                                              {idx + 1}
                                          </div>
                                          {client.name}
                                      </div>
                                  </td>
                                  <td className="p-4 text-right font-medium text-slate-600 dark:text-slate-300">
                                      {parseCurrency(client.totalOrcamento)}
                                  </td>
                                  <td className="p-4 text-right font-bold text-emerald-600">
                                      {parseCurrency(client.totalFaturado)}
                                  </td>
                                  <td className="p-4">
                                      <div className="flex flex-col gap-1 items-center">
                                          <div className="w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{width: `${Math.min(client.billingProgress, 100)}%`}}></div>
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-500">{client.billingProgress.toFixed(0)}%</span>
                                      </div>
                                  </td>
                                  <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-300">
                                      {parseCurrency(client.backlog)}
                                  </td>
                              </tr>
                          )
                      })}
                      {activeClientInsights.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum cliente ativo ou com faturamento no período.</td></tr>
                      )}
                  </tbody>
                  {/* FOOTER COM TOTAIS */}
                  {activeClientInsights.length > 0 && (
                      <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-white">
                          <tr>
                              <td className="p-4 uppercase text-xs">Total Geral</td>
                              <td className="p-4 text-right text-slate-600 dark:text-slate-300">{parseCurrency(activeClientsTotals.orcamento)}</td>
                              <td className="p-4 text-right text-emerald-600">{parseCurrency(activeClientsTotals.faturado)}</td>
                              <td className="p-4 text-center text-xs text-slate-500">
                                  {activeClientsTotals.orcamento > 0 
                                      ? ((activeClientsTotals.faturado / activeClientsTotals.orcamento) * 100).toFixed(0) + '%' 
                                      : '-'}
                              </td>
                              <td className="p-4 text-right text-slate-700 dark:text-slate-300">{parseCurrency(activeClientsTotals.backlog)}</td>
                          </tr>
                      </tfoot>
                  )}
              </table>
          </div>
      </div>

      {/* KPI: PIPELINE COMERCIAL (PROPOSTAS) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Briefcase size={20} className="text-amber-500"/> Pipeline Comercial (Propostas)</h3>
          </div>
          
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase text-slate-500 font-bold">
                      <tr>
                          <th className="p-4">Cliente (Prospect)</th>
                          <th className="p-4 text-center">Qtd. Propostas</th>
                          <th className="p-4 text-right">Valor Total em Proposta</th>
                          <th className="p-4 text-right">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {pipelineInsights.map((client, idx) => (
                          <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                              <td className="p-4 font-bold text-slate-700 dark:text-white">
                                  {client.name}
                              </td>
                              <td className="p-4 text-center">
                                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-bold">{client.count}</span>
                              </td>
                              <td className="p-4 text-right font-bold text-amber-600">
                                  {parseCurrency(client.totalProposta)}
                              </td>
                              <td className="p-4 text-right">
                                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100">Em Negociação</span>
                              </td>
                          </tr>
                      ))}
                      {pipelineInsights.length === 0 && (
                          <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma proposta em aberto no momento.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

    </div>
  );
};
