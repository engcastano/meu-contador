import React, { useState, useMemo, useRef } from 'react';
import { BusinessTransaction, BusinessAccount, BusinessCategory, BusinessPartner, Client, ServiceInvoice } from '../../businessTypes';
import { parseCurrency, parseDate, processContabilCSV } from '../../utils';
import { 
  Search, Filter, Download, Upload, Plus, Edit2, Trash2, CheckSquare, Square, 
  ArrowUpDown, ArrowUp, ArrowDown, Clock, Users, Building, FileText, X, ChevronLeft, ChevronRight, AlertCircle, Check, Copy
} from 'lucide-react';

interface AccountingLedgerProps {
  transactions: BusinessTransaction[];
  accounts: BusinessAccount[];
  categories: BusinessCategory[];
  partners: BusinessPartner[];
  clients: Client[];
  invoices: ServiceInvoice[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: BusinessTransaction) => void;
  onDuplicateTransaction: (tx: BusinessTransaction) => void; // <--- NOVA PROP
  onDeleteTransaction: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkEditOpen: (ids: string[]) => void;
  onImportCSV: (data: any[], accountId: string) => void;
}

export const AccountingLedger: React.FC<AccountingLedgerProps> = ({
  transactions, accounts, categories, partners, clients, invoices,
  onAddTransaction, onEditTransaction, onDuplicateTransaction, onDeleteTransaction, onBulkDelete, onBulkEditOpen, onImportCSV
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetAccount, setImportTargetAccount] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewPeriod, setViewPeriod] = useState<'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [ledgerFilters, setLedgerFilters] = useState({
      accountId: 'all', clientId: 'all', partnerId: 'all', status: 'all', categoryId: 'all', startDate: '', endDate: ''
  });

  const navigatePeriod = (direction: number) => {
      const newDate = new Date(currentDate);
      if (viewPeriod === 'month') newDate.setMonth(newDate.getMonth() + direction);
      else newDate.setFullYear(newDate.getFullYear() + direction);
      setCurrentDate(newDate);
      setLedgerFilters(prev => ({...prev, startDate: '', endDate: ''}));
  };

  const periodLabel = useMemo(() => {
      if (ledgerFilters.startDate || ledgerFilters.endDate) return 'Período Personalizado';
      if (viewPeriod === 'month') return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return currentDate.getFullYear().toString();
  }, [viewPeriod, currentDate, ledgerFilters.startDate, ledgerFilters.endDate]);

  const setFilterPeriod = (type: 'thisMonth' | 'lastMonth' | 'thisYear') => {
      const now = new Date();
      let start = '', end = '';
      
      if (type === 'thisMonth') {
          start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (type === 'lastMonth') {
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
          end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      } else if (type === 'thisYear') {
          start = `${now.getFullYear()}-01-01`;
          end = `${now.getFullYear()}-12-31`;
      }
      setLedgerFilters(prev => ({ ...prev, startDate: start, endDate: end }));
  };

  const filteredTransactions = useMemo(() => {
    let startStr = '', endStr = '';
    
    if (ledgerFilters.startDate || ledgerFilters.endDate) {
        startStr = ledgerFilters.startDate || '1900-01-01';
        endStr = ledgerFilters.endDate || '2100-12-31';
    } else {
        if (viewPeriod === 'month') {
            const y = currentDate.getFullYear(), m = currentDate.getMonth();
            startStr = new Date(y, m, 1).toISOString().split('T')[0];
            endStr = new Date(y, m + 1, 0).toISOString().split('T')[0];
        } else {
            startStr = `${currentDate.getFullYear()}-01-01`;
            endStr = `${currentDate.getFullYear()}-12-31`;
        }
    }

    let result = transactions.filter(t => {
        if (t.date < startStr || t.date > endStr) return false;

        if (searchTerm) {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.value.toString().includes(searchTerm);
            if (!matchesSearch) return false;
        }

        if (ledgerFilters.accountId !== 'all' && t.accountId !== ledgerFilters.accountId) return false;
        if (ledgerFilters.clientId !== 'all' && t.clientId !== ledgerFilters.clientId) return false;
        if (ledgerFilters.partnerId !== 'all' && t.partnerId !== ledgerFilters.partnerId) return false;
        
        if (ledgerFilters.categoryId !== 'all') {
            if (ledgerFilters.categoryId === 'uncategorized') {
                const hasValidCategory = t.categoryId && categories.some(c => c.id === t.categoryId);
                if (hasValidCategory) return false;
            } else {
                if (t.categoryId !== ledgerFilters.categoryId) return false;
            }
        }
        
        if (ledgerFilters.status !== 'all') {
            if (ledgerFilters.status === 'paid' && t.status !== 'paid') return false;
            if (ledgerFilters.status === 'pending' && t.status !== 'pending') return false;
        }
        
        return true;
    });

    return result.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof BusinessTransaction];
        let valB: any = b[sortConfig.key as keyof BusinessTransaction];
        
        if (sortConfig.key === 'value') {
            valA = a.type === 'expense' ? -Math.abs(Number(a.value)) : Math.abs(Number(a.value));
            valB = b.type === 'expense' ? -Math.abs(Number(b.value)) : Math.abs(Number(b.value));
        }
        else if (sortConfig.key === 'accountId') { valA = accounts.find(acc => acc.id === a.accountId)?.name || ''; valB = accounts.find(acc => acc.id === b.accountId)?.name || ''; }
        else if (sortConfig.key === 'categoryId') { valA = categories.find(c => c.id === a.categoryId)?.name || ''; valB = categories.find(c => c.id === b.categoryId)?.name || ''; }
        else if (sortConfig.key === 'datePaid') { valA = a.datePaid || a.date; valB = b.datePaid || b.date; }
        
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [transactions, searchTerm, sortConfig, viewPeriod, currentDate, ledgerFilters, accounts, categories]);

  const toggleSelection = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
  const handleSort = (key: string) => { setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc' })); };
  
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !importTargetAccount) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
          const text = evt.target?.result as string;
          const data = processContabilCSV(text); 
          if(data && data.length > 0) {
             onImportCSV(data, importTargetAccount);
             setIsImportModalOpen(false);
          }
      };
      reader.readAsText(file);
  };

  const handleExportCSV = () => {
      if (filteredTransactions.length === 0) return alert("Nada para exportar.");
      const header = ["Data Competencia", "Data Pagamento", "Descrição", "Tipo", "Categoria", "Conta", "Valor", "Status", "Cliente", "Observacoes"];
      const rows = filteredTransactions.map(t => {
          const isExpense = t.type === 'expense';
          const finalValue = isExpense ? -Math.abs(t.value) : Math.abs(t.value);
          
          return [
            t.date, t.datePaid || '', `"${t.description.replace(/"/g, '""')}"`,
            isExpense ? 'Despesa' : 'Receita',
            categories.find(c => c.id === t.categoryId)?.name || t.categoryName || 'Sem Categoria',
            accounts.find(a => a.id === t.accountId)?.name || t.accountName || '',
            finalValue.toFixed(2).replace('.', ','),
            t.status === 'paid' ? 'Pago' : 'Pendente',
            clients?.find(c => c.id === t.clientId)?.name || '', `"${(t.notes || '').replace(/"/g, '""')}"`
          ];
      });
      const csvContent = [header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url); link.setAttribute("download", `extrato_gerencial_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getSortIcon = (key: string) => {
      if (sortConfig.key !== key) return <ArrowUpDown size={12} className="opacity-30 inline ml-1" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-indigo-600 inline ml-1" /> : <ArrowDown size={12} className="text-indigo-600 inline ml-1" />;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-fadeIn w-full">
      <div className="p-4 border-b dark:border-slate-700 flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
        
        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button onClick={() => { setViewPeriod(p => p === 'month' ? 'year' : 'month'); setLedgerFilters(p => ({...p, startDate: '', endDate: ''})); }} className="px-3 py-1 text-xs font-bold uppercase text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                {viewPeriod === 'month' ? 'Mensal' : 'Anual'}
            </button>
            <div className="flex items-center gap-2">
                <button onClick={() => navigatePeriod(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronLeft size={16}/></button>
                <span className="text-sm font-bold w-36 text-center capitalize truncate px-1">{periodLabel}</span>
                <button onClick={() => navigatePeriod(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><ChevronRight size={16}/></button>
            </div>
            <button onClick={() => { setCurrentDate(new Date()); setLedgerFilters(p => ({...p, startDate: '', endDate: ''})); }} className="text-xs font-bold text-slate-500 hover:text-indigo-600 px-2">Hoje</button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px] justify-end">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-8 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"/>
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"><X size={14}/></button>}
          </div>
          <button 
            onClick={() => setIsFilterModalOpen(true)} 
            className={`p-2 border dark:border-slate-700 rounded-lg transition-colors ${Object.values(ledgerFilters).some(v => v !== 'all' && v !== '') ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'text-slate-500 hover:text-indigo-600'}`}
            title="Filtros Avançados"
          >
              <Filter size={18} />
          </button>
        </div>
        
        <div className="flex gap-2">
            <button onClick={handleExportCSV} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Download size={18}/> Exportar</button>
            <button onClick={() => setIsImportModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Upload size={18}/> Importar</button>
            <button onClick={onAddTransaction} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={18} /> Nova</button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 flex items-center gap-4 text-xs">
            <span className="font-bold text-indigo-800 dark:text-indigo-300">{selectedIds.size} itens selecionados</span>
            <button onClick={() => onBulkEditOpen(Array.from(selectedIds))} className="flex items-center gap-1 text-indigo-700 hover:underline"><Edit2 size={12}/> Editar em Massa</button>
            <button onClick={() => { if(confirm('Excluir itens?')) { onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); }}} className="flex items-center gap-1 text-red-600 hover:underline"><Trash2 size={12}/> Excluir</button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-slate-500 hover:text-slate-700">Cancelar Seleção</button>
        </div>
      )}

      <div className="flex-1 overflow-auto w-full">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-xs font-bold sticky top-0 z-10">
            <tr>
              <th className="p-4 w-12"><button onClick={() => selectedIds.size === filteredTransactions.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredTransactions.map(t => t.id)))} className="text-slate-400 hover:text-indigo-600 transition-colors">{selectedIds.size > 0 && selectedIds.size === filteredTransactions.length ? <CheckSquare size={18}/> : <Square size={18}/>}</button></th>
              <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('date')}>Competência {getSortIcon('date')}</th>
              <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('datePaid')}>Pagamento {getSortIcon('datePaid')}</th>
              <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('description')}>Descrição {getSortIcon('description')}</th>
              <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('categoryId')}>Categoria {getSortIcon('categoryId')}</th>
              <th className="p-4 cursor-pointer hover:text-indigo-600" onClick={() => handleSort('accountId')}>Conta {getSortIcon('accountId')}</th>
              <th className="p-4 text-right cursor-pointer hover:text-indigo-600" onClick={() => handleSort('value')}>Valor {getSortIcon('value')}</th>
              <th className="p-4 text-center cursor-pointer hover:text-indigo-600" onClick={() => handleSort('status')}>Status {getSortIcon('status')}</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredTransactions.map(t => {
              const isExpense = t.type === 'expense';
              const displayValue = isExpense ? -Math.abs(t.value) : Math.abs(t.value);
              const category = categories.find(c => c.id === t.categoryId);
              
              return (
              <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${selectedIds.has(t.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`} onClick={() => onEditTransaction(t)}>
                <td className="p-4" onClick={(e) => { e.stopPropagation(); toggleSelection(t.id); }}>{selectedIds.has(t.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18} className="text-slate-300"/>}</td>
                <td className="p-4 whitespace-nowrap text-slate-500 font-mono text-xs">{parseDate(t.date)}</td>
                <td className="p-4 whitespace-nowrap text-slate-500 font-mono text-xs">{t.status === 'paid' ? parseDate(t.datePaid || t.date) : '-'}</td>
                <td className="p-4 font-medium dark:text-white">
                    {t.description}
                    <div className="flex gap-2 mt-1">
                      {t.invoiceId && <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"><FileText size={10}/> NF VINCULADA</span>}
                      {t.status === 'pending' && <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"><Clock size={10}/> PREV</span>}
                      {t.partnerId && <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded"><Users size={10}/> {partners.find(p => p.id === t.partnerId)?.name}</span>}
                      {t.clientId && <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Building size={10}/> {clients.find(c => c.id === t.clientId)?.name}</span>}
                    </div>
                </td>
                
                <td className="p-4 text-slate-500">
                    {category ? (
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs">{category.name}</span>
                    ) : (
                        <span className="px-2 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded text-xs font-bold flex items-center gap-1 w-fit" title="Este item precisa ser categorizado">
                            <AlertCircle size={12}/> Sem Categoria
                        </span>
                    )}
                </td>

                <td className="p-4 text-slate-500 text-xs">{accounts.find(a => a.id === t.accountId)?.name || t.accountName || 'Conta Excluída'}</td>
                
                <td className={`p-4 text-right font-bold whitespace-nowrap ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
                    {parseCurrency(displayValue)}
                </td>

                <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border flex items-center justify-center gap-1 w-fit mx-auto ${t.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : t.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {t.status === 'paid' && <Check size={10}/>}
                        {t.status === 'paid' ? 'Pago' : t.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                    </span>
                </td>
                
                {/* AÇÕES */}
                <td className="p-4 text-right">
                    <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => onDuplicateTransaction(t)} 
                            className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 p-1.5 rounded transition-colors" 
                            title="Duplicar"
                        >
                            <Copy size={16}/>
                        </button>
                        <button 
                            onClick={() => onEditTransaction(t)} 
                            className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded transition-colors"
                            title="Editar"
                        >
                            <Edit2 size={16}/>
                        </button>
                        <button 
                            onClick={() => { if(confirm('Excluir?')) onDeleteTransaction(t.id); }} 
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded transition-colors"
                            title="Excluir"
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {isFilterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold dark:text-white text-lg flex items-center gap-2"><Filter size={20}/> Filtros Avançados</h3><button onClick={() => setIsFilterModalOpen(false)}><X className="text-slate-400"/></button></div>
                  <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                          <label className="text-xs font-bold text-slate-500 mb-2 block">Período (Competência)</label>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                              <button onClick={() => setFilterPeriod('thisMonth')} className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border rounded hover:bg-indigo-50 text-slate-600 dark:text-slate-300">Este Mês</button>
                              <button onClick={() => setFilterPeriod('lastMonth')} className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border rounded hover:bg-indigo-50 text-slate-600 dark:text-slate-300">Mês Passado</button>
                              <button onClick={() => setFilterPeriod('thisYear')} className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border rounded hover:bg-indigo-50 text-slate-600 dark:text-slate-300 col-span-2">Este Ano</button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-[10px] text-slate-400">De</span><input type="date" value={ledgerFilters.startDate} onChange={e => setLedgerFilters({...ledgerFilters, startDate: e.target.value})} className="w-full p-1.5 border rounded dark:bg-slate-700 dark:text-white text-xs"/></div>
                              <div><span className="text-[10px] text-slate-400">Até</span><input type="date" value={ledgerFilters.endDate} onChange={e => setLedgerFilters({...ledgerFilters, endDate: e.target.value})} className="w-full p-1.5 border rounded dark:bg-slate-700 dark:text-white text-xs"/></div>
                          </div>
                      </div>

                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Status</label><select value={ledgerFilters.status} onChange={e => setLedgerFilters({...ledgerFilters, status: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"><option value="all">Todos</option><option value="paid">Pagos</option><option value="pending">Pendentes</option></select></div>
                      
                      <div>
                          <label className="text-xs font-bold text-slate-500 mb-1 block">Categoria</label>
                          <select value={ledgerFilters.categoryId} onChange={e => setLedgerFilters({...ledgerFilters, categoryId: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white">
                              <option value="all">Todas</option>
                              <option value="uncategorized" className="text-amber-600 font-bold">⚠️ Sem Categoria</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>

                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Profissional / Parceiro</label><select value={ledgerFilters.partnerId} onChange={e => setLedgerFilters({...ledgerFilters, partnerId: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"><option value="all">Todos</option>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Conta</label><select value={ledgerFilters.accountId} onChange={e => setLedgerFilters({...ledgerFilters, accountId: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"><option value="all">Todas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                      
                      <div className="flex justify-end"><button onClick={() => setLedgerFilters({ accountId: 'all', clientId: 'all', partnerId: 'all', status: 'all', categoryId: 'all', startDate: '', endDate: '' })} className="text-xs text-red-500 hover:underline">Limpar Filtros</button></div>
                      <button onClick={() => setIsFilterModalOpen(false)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold mt-2">Aplicar Filtros</button>
                  </div>
              </div>
          </div>
      )}

      {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold dark:text-white text-lg flex items-center gap-2"><Upload size={20}/> Importar CSV</h3><button onClick={() => setIsImportModalOpen(false)}><X className="text-slate-400"/></button></div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-800"><div className="flex items-start gap-2"><div className="text-xs text-blue-700 dark:text-blue-300"><p className="font-bold mb-1">Formatos suportados:</p><ul className="list-disc pl-4 space-y-1"><li>Data; Pagamento; Descrição; Valor; Categoria</li></ul></div></div></div>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-slate-500 mb-1 block">Conta de Destino</label><select value={importTargetAccount} onChange={e => setImportTargetAccount(e.target.value)} className="w-full p-3 border rounded dark:bg-slate-700 dark:text-white"><option value="">Selecione uma conta...</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                      <div className="pt-2"><input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={handleCSVImport}/><button onClick={() => { if(!importTargetAccount) return alert("Selecione uma conta primeiro."); fileInputRef.current?.click(); }} disabled={!importTargetAccount} className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed">Selecionar Arquivo</button></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};