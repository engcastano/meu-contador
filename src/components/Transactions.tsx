import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Transaction, Account, Tag } from '../types';
import { parseCurrency, parseDate, getStatus, generateUUID, processContabilCSV } from '../utils';
import { Plus, Edit2, Trash2, Square, CheckSquare, Upload, X, Landmark, Eye, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Search, Check, Copy } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[]; 
  displayedTransactions: Transaction[]; 
  onSave: (transaction: Transaction) => void;
  onDelete: (id: string) => void; 
  accounts: Account[];
  tags: Tag[];
  onAddTag?: (tagName: string) => void; 
  onBulkEdit: (ids: string[], updates: Partial<Transaction>) => void;
  onBulkDelete: (ids: string[]) => void;
  onImport: (data: any[], targetAccount: string) => void;
  onBulkDeleteByDate: (start: string, end: string, targetId: string, type: 'transactions' | 'cards') => void;
  activeFilterAccount: string;
  onFilterAccountChange: (id: string) => void;
  onBatchSave?: (transactions: Transaction[]) => void;
}

const Transactions: React.FC<TransactionsProps> = ({ 
    transactions = [], displayedTransactions = [], onSave, onDelete, accounts = [], tags = [], onAddTag,
    onBulkEdit, onBulkDelete, onImport, activeFilterAccount, onFilterAccountChange, onBatchSave
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);
  
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [itemsToDuplicate, setItemsToDuplicate] = useState<string[]>([]);
  const [duplicateDate, setDuplicateDate] = useState(new Date().toISOString().split('T')[0]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  
  // MODO ARQUITETO: Removida 'description' daqui pois não é redimensionável manualmente
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    select: 48, date: 120, value: 130, type: 150, account: 150, status: 120
  });
  
  // MODO ARQUITETO: Largura Mínima = Colunas Fixas + 300px (Descrição) + 100px (Ações)
  const minTableWidth = useMemo(() => Object.values(columnWidths).reduce((acc, w) => acc + w, 0) + 300 + 100, [columnWidths]);

  const resizingRef = useRef<{ col: string, startX: number, startWidth: number } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { col, startX, startWidth } = resizingRef.current;
      const diff = e.clientX - startX;
      setColumnWidths(prev => ({ ...prev, [col]: Math.max(50, startWidth + diff) }));
  }, []);

  const handleMouseUp = useCallback(() => {
      resizingRef.current = null;
      document.body.style.cursor = 'default';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const startResize = (e: React.MouseEvent, col: string) => {
      e.preventDefault();
      resizingRef.current = { col, startX: e.clientX, startWidth: columnWidths[col] || 100 };
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
  };

  const [formData, setFormData] = useState<Transaction>({ 
      id: '', description: '', value: 0, dateExpected: '', dateRealized: '', 
      account: '', category: '', type: 'Geral', isRealized: false 
  });
  const [operationType, setOperationType] = useState<'income' | 'expense'>('expense'); 
  
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  const [bulkData, setBulkData] = useState({ account: '', type: '', isRealized: 'no_change' });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTransactions = useMemo(() => {
      if (!searchTerm) return displayedTransactions;
      const lowerSearch = searchTerm.toLowerCase();
      return displayedTransactions.filter(t => 
          t.description.toLowerCase().includes(lowerSearch) ||
          t.value.toString().includes(lowerSearch) ||
          t.type.toLowerCase().includes(lowerSearch) ||
          t.account.toLowerCase().includes(lowerSearch)
      );
  }, [displayedTransactions, searchTerm]);

  const sortedTransactions = useMemo(() => {
      if (!filteredTransactions) return [];
      let sortable = [...filteredTransactions];
      if (sortConfig !== null) {
          sortable.sort((a, b) => {
              let aValue: any = a[sortConfig.key as keyof Transaction];
              let bValue: any = b[sortConfig.key as keyof Transaction];
              if (sortConfig.key === 'date') {
                  aValue = (a.isRealized && a.dateRealized) ? a.dateRealized : a.dateExpected;
                  bValue = (b.isRealized && b.dateRealized) ? b.dateRealized : b.dateExpected;
              }
              if (sortConfig.key === 'value') { aValue = Math.abs(a.value); bValue = Math.abs(b.value); }
              if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return sortable;
  }, [filteredTransactions, sortConfig]);

  const requestSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'desc'; 
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
      setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
      if (!sortConfig || sortConfig.key !== columnName) return <ArrowUpDown size={14} className="ml-1 opacity-30 inline" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-blue-600 inline" /> : <ArrowDown size={14} className="ml-1 text-blue-600 inline" />;
  };

  const getAccountBalance = (accName: string) => {
      return displayedTransactions
        .filter(t => t.account === accName && !t.isShared) 
        .reduce((acc, t) => acc + (Number(t.value) || 0), 0);
  };

  const totalRealBalance = useMemo(() => {
      return displayedTransactions
        .filter(t => !t.isShared)
        .reduce((acc, t) => acc + (Number(t.value) || 0), 0);
  }, [displayedTransactions]);

  const handleToggleSelect = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
  const handleSelectAll = () => { if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredTransactions.map(t => t.id))); };
  const handleDeleteSelected = (e: React.MouseEvent) => { e.stopPropagation(); onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); };
  const handleDeleteSingle = (e: React.MouseEvent, id: string) => { e.stopPropagation(); onDelete(id); };
  
  const handleEdit = (e: React.MouseEvent, t: Transaction) => { 
      e.stopPropagation(); 
      setEditingId(t.id); 
      setOperationType(t.value < 0 ? 'expense' : 'income');
      setFormData({ ...t, value: Math.abs(t.value) }); 
      setCategorySearch(t.type); 
      setIsModalOpen(true); 
  };

  const handleDuplicateSingle = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setItemsToDuplicate([id]);
      setDuplicateDate(new Date().toISOString().split('T')[0]);
      setIsDuplicateModalOpen(true);
  };

  const handleDuplicateSelected = () => {
      setItemsToDuplicate(Array.from(selectedIds));
      setDuplicateDate(new Date().toISOString().split('T')[0]);
      setIsDuplicateModalOpen(true);
  };

  const handleConfirmDuplicate = () => {
      if (!onBatchSave) return;
      const newTransactions: Transaction[] = [];
      itemsToDuplicate.forEach(id => {
          const original = transactions.find(t => t.id === id);
          if (original) {
              newTransactions.push({
                  ...original,
                  id: generateUUID(),
                  dateExpected: duplicateDate,
                  dateRealized: original.isRealized ? duplicateDate : '',
                  isRealized: original.isRealized
              });
          }
      });
      onBatchSave(newTransactions);
      setIsDuplicateModalOpen(false);
      setItemsToDuplicate([]);
      setSelectedIds(new Set());
  };

  const handleSave = () => { 
      const finalValue = operationType === 'expense' ? -Math.abs(Number(formData.value)) : Math.abs(Number(formData.value));
      onSave({ ...formData, value: finalValue }); 
      setIsModalOpen(false); 
  };

  const handleOpenNew = () => { 
      setEditingId(null); 
      setOperationType('expense'); 
      const initialType = tags[0]?.name || 'Geral';
      setFormData({ id: generateUUID(), description: '', value: 0, dateExpected: new Date().toISOString().split('T')[0], dateRealized: '', account: accounts[0]?.name || '', category: '', type: initialType, isRealized: false }); 
      setCategorySearch(initialType);
      setIsModalOpen(true); 
  };

  const handleCreateCategory = () => {
      if (onAddTag && categorySearch.trim() !== '') {
          onAddTag(categorySearch);
          setFormData({ ...formData, type: categorySearch });
          setIsCategoryDropdownOpen(false);
      }
  };

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const handleExecuteBulkEdit = () => {
      const updates: Partial<Transaction> = {};
      if (bulkData.account) updates.account = bulkData.account;
      if (bulkData.type) updates.type = bulkData.type;
      if (bulkData.isRealized !== 'no_change') updates.isRealized = bulkData.isRealized === 'true';
      onBulkEdit(Array.from(selectedIds), updates);
      setIsBulkEditOpen(false); setSelectedIds(new Set());
  };

  const handleImportClick = () => { if (activeFilterAccount === 'all') { alert('Selecione uma conta específica nos cards.'); return; } fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (evt) => { if (evt.target?.result) onImport(processContabilCSV(evt.target.result as string), activeFilterAccount); }; reader.readAsText(file); e.target.value = ''; };

  const activeAccounts = accounts ? accounts.filter(a => !a.archived) : [];

  const SortHeader = ({ label, sortKey, className }: { label: string, sortKey?: string, className?: string }) => (
    <th className={`px-4 py-3 border-b dark:border-slate-600 bg-slate-50 dark:bg-slate-700 select-none ${className}`}>
        <div className="flex items-center cursor-pointer hover:text-blue-600" onClick={() => sortKey && requestSort(sortKey)}>
            {label} {sortKey && getSortIcon(sortKey)}
        </div>
    </th>
  );

  // MODO ARQUITETO: ResizableHeader (para as outras colunas)
  const ResizableHeader = ({ label, colKey, sortKey }: { label: string, colKey: string, sortKey?: string }) => (
    <th className="px-4 py-3 relative group select-none border-b dark:border-slate-600 bg-slate-50 dark:bg-slate-700" style={{ width: columnWidths[colKey] }}>
        <div className="flex items-center cursor-pointer hover:text-blue-600" onClick={() => sortKey && requestSort(sortKey)}>
            {label} {sortKey && getSortIcon(sortKey)}
        </div>
        <div onMouseDown={(e) => startResize(e, colKey)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-10"/>
    </th>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-6 pb-4">
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              <button onClick={() => onFilterAccountChange('all')} className={`snap-center flex-shrink-0 w-64 h-36 rounded-2xl p-4 flex flex-col justify-between transition-all border ${activeFilterAccount === 'all' ? 'bg-slate-800 text-white ring-4 ring-slate-300 border-transparent' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-start"><span className="font-bold">Todas as Contas</span><Landmark size={24}/></div>
                  <div className="text-right"><span className="text-xs opacity-70 block">Resultado (Período)</span><span className="text-xl font-bold">{parseCurrency(totalRealBalance)}</span></div>
              </button>
              {activeAccounts.map(acc => (
                <button key={acc.id} onClick={() => onFilterAccountChange(acc.name)} className={`snap-center flex-shrink-0 w-64 h-36 rounded-2xl p-4 flex flex-col justify-between transition-all border relative ${activeFilterAccount === acc.name ? 'bg-blue-600 text-white ring-4 ring-blue-200 border-transparent' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start w-full"><span className="font-bold truncate">{acc.name}</span><div onClick={(e) => { e.stopPropagation(); setShowDetailsId(showDetailsId === acc.id ? null : acc.id); }} className="cursor-pointer"><Eye size={16}/></div></div>
                    {showDetailsId === acc.id ? (
                        <div className="text-[10px] opacity-90 space-y-0.5 text-left mt-2"><div>{acc.bank}</div><div>Ag: {acc.agency} | CC: {acc.number}</div></div>
                    ) : (
                        <div className="text-right mt-auto"><span className="text-xs opacity-70 block">Resultado (Período)</span><span className="text-xl font-bold">{parseCurrency(getAccountBalance(acc.name))}</span></div>
                    )}
                </button>
              ))}
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
              <div className="flex items-center gap-2 flex-1 w-full overflow-x-auto">
                  <button onClick={handleSelectAll} className="text-slate-500 flex-shrink-0">{selectedIds.size > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}</button>
                  
                  <div className="relative group w-full md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-700 dark:text-white rounded-lg text-sm w-full border-transparent focus:border-blue-500 focus:ring-0 transition-all outline-none"/>
                        {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14} /></button>)}
                  </div>
                  
                  {selectedIds.size > 0 && (
                    <div className="flex gap-1">
                        <button type="button" onClick={() => setIsBulkEditOpen(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Editar em Massa"><Edit2 size={18}/></button>
                        <button type="button" onClick={handleDuplicateSelected} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Duplicar Selecionados"><Copy size={18}/></button>
                        <button type="button" onClick={handleDeleteSelected} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Excluir Selecionados"><Trash2 size={18}/></button>
                    </div>
                  )}
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden"/>
                  <button type="button" onClick={handleImportClick} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${activeFilterAccount === 'all' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700 dark:text-white'}`}><Upload size={16}/> <span className="hidden md:inline">Importar</span></button>
                  <button type="button" onClick={handleOpenNew} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Novo</button>
              </div>
          </div>
      </div>
      
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
         <div className="hidden md:block h-full overflow-auto">
             {/* MODO ARQUITETO: minWidth calculado garante o scroll horizontal se necessário */}
             <table className="w-full text-sm text-left table-fixed" style={{ minWidth: minTableWidth }}>
                 <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400 sticky top-0 z-30 shadow-sm">
                     <tr>
                        <th className="p-4 border-b dark:border-slate-600" style={{ width: columnWidths.select }}></th>
                        <ResizableHeader label="Data" colKey="date" sortKey="date" />
                        
                        {/* MODO ARQUITETO: Descrição com largura mínima garantida */}
                        <th className="px-4 py-3 border-b dark:border-slate-600 min-w-[300px]">Descrição</th>
                        
                        <ResizableHeader label="Valor" colKey="value" sortKey="value" />
                        <ResizableHeader label="Categoria" colKey="type" sortKey="type" />
                        <ResizableHeader label="Conta" colKey="account" sortKey="account" />
                        <ResizableHeader label="Status" colKey="status" />
                        
                        <th className="px-4 py-3 text-right sticky right-0 bg-slate-50 dark:bg-slate-700 z-40 border-b dark:border-slate-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-24">Ações</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                     {sortedTransactions.map(t => {
                         const tagColor = tags.find(tag => tag.name === t.type)?.color || '#94a3b8';
                         const displayDate = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                         return (
                         <tr key={t.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedIds.has(t.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                             <td className="p-4 truncate"><button type="button" onClick={() => handleToggleSelect(t.id)} className="text-slate-400">{selectedIds.has(t.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}</button></td>
                             <td className="px-4 py-3 text-slate-500 truncate">{parseDate(displayDate)}</td>
                             
                             {/* MODO ARQUITETO: break-words para quebrar linhas */}
                             <td className="px-4 py-3 font-medium dark:text-white break-words whitespace-normal min-w-[300px]">
                                {t.description}
                             </td>
                             
                             <td className={`px-4 py-3 font-bold truncate ${t.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseCurrency(t.value)}</td>
                             <td className="px-4 py-3 truncate"><span className="px-2 py-1 rounded text-xs text-white shadow-sm inline-block truncate max-w-full" style={{ backgroundColor: tagColor }}>{t.type}</span></td>
                             <td className="px-4 py-3 text-slate-500 truncate">{t.account}</td>
                             <td className="px-4 py-3 text-center truncate"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatus(t) === 'Realizado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{getStatus(t)}</span></td>
                             
                             <td className={`px-4 py-3 text-right sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors ${selectedIds.has(t.id) ? '!bg-blue-50 dark:!bg-blue-900/20' : ''}`}>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={(e) => handleDuplicateSingle(e, t.id)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Duplicar"><Copy size={16}/></button>
                                    <button type="button" onClick={(e) => handleEdit(e, t)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button type="button" onClick={(e) => handleDeleteSingle(e, t.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                             </td>
                         </tr>
                     )})}
                 </tbody>
             </table>
         </div>
         {/* Mobile view... */}
         <div className="md:hidden h-full overflow-y-auto p-2 space-y-2">
             {sortedTransactions.map(t => {
                 const tagColor = tags.find(tag => tag.name === t.type)?.color || '#94a3b8';
                 const displayDate = (t.isRealized && t.dateRealized) ? t.dateRealized : t.dateExpected;
                 const status = getStatus(t);
                 return (
                     <div key={t.id} className={`bg-white dark:bg-slate-700 p-3 rounded-xl border border-slate-100 dark:border-slate-600 shadow-sm relative ${selectedIds.has(t.id) ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleEdit({ stopPropagation: () => {} } as any, t)}>
                         <div className="flex justify-between items-start mb-1">
                             <div className="flex items-center gap-2">
                                <button type="button" onClick={(e) => {e.stopPropagation(); handleToggleSelect(t.id)}} className="text-slate-400">{selectedIds.has(t.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}</button>
                                <span className="font-bold text-slate-800 dark:text-white line-clamp-1">{t.description}</span>
                             </div>
                             <span className={`font-bold ${t.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>{parseCurrency(t.value)}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-300">
                             <span>{parseDate(displayDate)}</span>
                             <span className="px-2 py-0.5 rounded text-[10px] text-white" style={{ backgroundColor: tagColor }}>{t.type}</span>
                         </div>
                         <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-600">
                             <div className="flex items-center gap-2 text-xs">
                                 <span className="opacity-70">{t.account}</span>
                                 {status === 'Realizado' && <Check size={12} className="text-green-500"/>}
                             </div>
                             <div className="flex gap-3">
                                 <button onClick={(e) => handleDuplicateSingle(e, t.id)} className="text-indigo-500"><Copy size={16}/></button>
                                 <button onClick={(e) => handleDeleteSingle(e, t.id)} className="text-red-500"><Trash2 size={16}/></button>
                             </div>
                         </div>
                     </div>
                 )
             })}
         </div>
      </div>
      
      {/* Modals... */}
      {isDuplicateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold dark:text-white text-lg flex items-center gap-2"><Copy size={20}/> Duplicar Transações</h3>
                      <button onClick={() => setIsDuplicateModalOpen(false)}><X className="text-slate-400"/></button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      Selecione a data para as <strong>{itemsToDuplicate.length}</strong> transações duplicadas:
                  </p>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nova Data</label>
                  <input type="date" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium mb-6"/>
                  <button onClick={handleConfirmDuplicate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-colors">Confirmar Duplicação</button>
              </div>
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold dark:text-white">{editingId ? 'Editar' : 'Nova'} Transação</h3>
                  <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tipo de Operação</label>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button onClick={() => setOperationType('expense')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${operationType === 'expense' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm' : 'text-slate-500'}`}><TrendingDown size={16}/> Despesa</button>
                    <button onClick={() => setOperationType('income')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${operationType === 'income' ? 'bg-white dark:bg-slate-600 text-green-600 shadow-sm' : 'text-slate-500'}`}><TrendingUp size={16}/> Receita</button>
                </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
                  <input type="text" placeholder="Ex: Compras Supermercado" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label>
                  <input type="number" placeholder="0,00" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Data</label>
                      <input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.dateExpected} onChange={e => setFormData({...formData, dateExpected: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Conta Bancária</label>
                      <select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})}>{activeAccounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select>
                  </div>
              </div>

              <div ref={categoryWrapperRef} className="relative">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                  <div className="relative">
                      <input 
                        type="text" 
                        className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                        value={categorySearch}
                        placeholder="Selecione ou crie..."
                        onFocus={() => setIsCategoryDropdownOpen(true)}
                        onChange={(e) => {
                            setCategorySearch(e.target.value);
                            setFormData({...formData, type: e.target.value});
                            setIsCategoryDropdownOpen(true);
                        }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          {isCategoryDropdownOpen ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}
                      </div>
                  </div>
                  
                  {isCategoryDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {filteredTags.length > 0 ? (
                              filteredTags.map(t => (
                                  <div 
                                    key={t.name} 
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer flex items-center justify-between"
                                    onClick={() => {
                                        setFormData({...formData, type: t.name});
                                        setCategorySearch(t.name);
                                        setIsCategoryDropdownOpen(false);
                                    }}
                                  >
                                      <span>{t.name}</span>
                                      {t.name === formData.type && <Check size={14} className="text-blue-500"/>}
                                  </div>
                              ))
                          ) : (
                             <div 
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-blue-600 font-medium flex items-center gap-2"
                                onClick={handleCreateCategory}
                             >
                                <Plus size={14} /> Criar "{categorySearch}"
                             </div>
                          )}
                      </div>
                  )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="isRealized" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" checked={formData.isRealized} onChange={e => setFormData({...formData, isRealized: e.target.checked})} />
                  <label htmlFor="isRealized" className="dark:text-white select-none cursor-pointer">Marcar como Realizado</label>
              </div>
              
              <button onClick={handleSave} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all mt-4">Salvar Transação</button>
          </div>
        </div>
      )}

      {isBulkEditOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4">
                  <h3 className="font-bold dark:text-white text-lg">Edição em Massa</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-slate-500 block mb-1">Mudar Conta</label><select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" onChange={e => setBulkData({...bulkData, account: e.target.value})}><option value="">-- Manter --</option>{activeAccounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                      <div><label className="text-xs font-bold text-slate-500 block mb-1">Mudar Categoria</label><select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" onChange={e => setBulkData({...bulkData, type: e.target.value})}><option value="">-- Manter --</option>{tags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</select></div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4"><button onClick={() => setIsBulkEditOpen(false)} className="px-4 py-2 border rounded dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button><button onClick={handleExecuteBulkEdit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Aplicar</button></div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Transactions;