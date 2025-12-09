import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Transaction, CardTransaction, CardConfig, Account, SharedAccount, SharingMode, Tag, FilterState } from '../types';
import { parseCurrency, generateUUID, processContabilCSV, parseDate } from '../utils';
import { Plus, Edit2, Trash2, CheckSquare, Square, Upload, X, Layers, ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, TrendingDown, TrendingUp, Search, Check, Wallet, Copy } from 'lucide-react';

interface SharedFinancesProps {
  transactions: Transaction[]; 
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  cardTransactions: CardTransaction[]; 
  cardConfigs: CardConfig[]; 
  sharingModes: SharingMode[]; 
  sharedAccounts: SharedAccount[]; 
  accounts: Account[]; 
  year: number; 
  months: number[]; 
  onLaunchSettlement: (tx: Transaction) => void;
  onBulkEdit: (ids: string[], updates: Partial<Transaction>) => void;
  onBulkDelete: (ids: string[]) => void;
  tags: Tag[];
  onAddTag?: (tagName: string) => void; 
  globalFilters: FilterState;
  onBatchSave?: (transactions: Transaction[]) => void;
}

export const SharedFinances: React.FC<SharedFinancesProps> = ({
    transactions = [], setTransactions, cardTransactions = [], cardConfigs = [],
    sharingModes = [], sharedAccounts = [], accounts = [], year, months, onLaunchSettlement,
    onBulkEdit, onBulkDelete, tags = [], onAddTag, globalFilters, onBatchSave
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSharedAccountId, setSelectedSharedAccountId] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  
  // MODO ARQUITETO: Removida a chave 'actions'
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    select: 48, date: 120, value: 130, category: 150, responsible: 120, mode: 120
  });
  
  // MODO ARQUITETO: Largura Mínima = Colunas Fixas + 300px (Descrição) + 100px (Ações)
  const minTableWidth = useMemo(() => Object.values(columnWidths).reduce((acc, w) => acc + w, 0) + 300 + 100, [columnWidths]);

  const resizingRef = useRef<{ col: string, startX: number, startWidth: number } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const newWidth = Math.max(50, startWidth + (e.clientX - startX));
    setColumnWidths(prev => ({ ...prev, [col]: newWidth }));
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false); 
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);
  
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [itemsToDuplicate, setItemsToDuplicate] = useState<string[]>([]);
  const [duplicateDate, setDuplicateDate] = useState(new Date().toISOString().split('T')[0]);

  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(tags[0]?.name || 'Geral');
  const [modeId, setModeId] = useState(sharingModes[0]?.id || '');
  const [paidBy, setPaidBy] = useState<string>('me');
  const [isRealized, setIsRealized] = useState(false);
  const [operationType, setOperationType] = useState<'expense' | 'income'>('expense');
  
  const [settlementConfig, setSettlementConfig] = useState({ accountId: '', date: new Date().toISOString().split('T')[0], amount: 0, type: 'payment' as 'payment' | 'receipt' });
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);
  const [bulkData, setBulkData] = useState({ modeId: '', paidBy: '' });
  const currentSharedAccount = sharedAccounts.find(s => s.id === selectedSharedAccountId);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryWrapperRef.current && !categoryWrapperRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBills = useMemo(() => (transactions || []).filter(t => {
      if (!t.isShared) return false;
      if (selectedSharedAccountId !== 'all' && t.account !== selectedSharedAccountId) return false;
      if (globalFilters.category !== 'all' && t.type !== globalFilters.category) return false;
      if (globalFilters.responsible !== 'all' && t.paidBy !== globalFilters.responsible) return false;
      const dateStr = t.isRealized ? t.dateRealized : t.dateExpected;
      if (!dateStr) return false;
      const [y, m] = dateStr.split('-').map(Number);
      const matchesDate = y === year && months.includes(m - 1);
      if (!matchesDate) return false;
      if (searchTerm) {
         const lowerSearch = searchTerm.toLowerCase();
         const matchesDesc = t.description.toLowerCase().includes(lowerSearch);
         const matchesVal = t.value.toString().includes(lowerSearch);
         const matchesType = t.type.toLowerCase().includes(lowerSearch);
         const account = sharedAccounts.find(a => a.id === t.account);
         const partnerName = account?.partnerName || 'parceiro';
         const matchesPaidBy = t.paidBy === 'me' ? 'eu'.includes(lowerSearch) : partnerName.toLowerCase().includes(lowerSearch);
         return matchesDesc || matchesVal || matchesType || matchesPaidBy;
      }
      return true;
  }), [transactions, year, months, selectedSharedAccountId, globalFilters, searchTerm, sharedAccounts]);

  const sortedBills = useMemo(() => {
      let sortable = [...filteredBills];
      if (sortConfig !== null) {
          sortable.sort((a, b) => {
              let aValue: any = a[sortConfig.key as keyof Transaction];
              let bValue: any = b[sortConfig.key as keyof Transaction];
              if (sortConfig.key === 'date') { aValue = a.isRealized ? a.dateRealized : a.dateExpected; bValue = b.isRealized ? b.dateRealized : b.dateExpected; }
              if (sortConfig.key === 'value') { aValue = Math.abs(a.value); bValue = Math.abs(b.value); }
              if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return sortable;
  }, [filteredBills, sortConfig]);

  const totalShared = filteredBills.reduce((acc, t) => acc + Math.abs(t.value), 0);

  const settlementData = useMemo(() => {
      let myLiability = 0; let myPaid = 0; let partnerPaid = 0; 
      filteredBills.forEach(bill => {
          const amount = Math.abs(bill.value); 
          let myPct = 50;
          if (bill.customSplit) myPct = bill.customSplit.myPercentage;
          else { const mode = sharingModes.find(m => m.id === bill.sharingModeId); if (mode) myPct = mode.myPercentage; }
          myLiability += amount * (myPct / 100);
          if (bill.paidBy === 'me') myPaid += amount; else partnerPaid += amount;
      });
      return { total: myPaid + partnerPaid, myLiability, balance: myPaid - myLiability };
  }, [filteredBills, sharingModes]);

  const requestSort = (key: string) => { let direction: 'asc' | 'desc' = 'desc'; if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc'; setSortConfig({ key, direction }); };
  const getSortIcon = (columnName: string) => { if (!sortConfig || sortConfig.key !== columnName) return <ArrowUpDown size={14} className="ml-1 opacity-30 inline" />; return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-indigo-600 inline" /> : <ArrowDown size={14} className="ml-1 text-indigo-600 inline" />; };

  const handleToggleSelect = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
  const handleSelectAll = () => { if (selectedIds.size === sortedBills.length) setSelectedIds(new Set()); else setSelectedIds(new Set(sortedBills.map(t => t.id))); };
  const handleDeleteSelected = (e: React.MouseEvent) => { e.stopPropagation(); onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); };
  const handleDeleteSingle = (e: React.MouseEvent, id: string) => { e.stopPropagation(); onBulkDelete([id]); };
  
  const handleSaveBill = () => {
      const accountId = selectedSharedAccountId !== 'all' ? selectedSharedAccountId : sharedAccounts[0]?.id;
      if (!description || !value || !accountId) return;
      const valNum = parseFloat(value.replace(',', '.'));
      const finalValue = operationType === 'expense' ? -Math.abs(valNum) : Math.abs(valNum);
      const txData: Transaction = { id: editingId || generateUUID(), description, value: finalValue, dateExpected: date, dateRealized: date, account: accountId, category: 'Compartilhado', type: category, isRealized, isShared: true, paidBy, sharingModeId: modeId };
      if (editingId) setTransactions(prev => prev.map(t => t.id === editingId ? txData : t)); else setTransactions(prev => [...prev, txData]);
      handleCloseModal();
  };

  const handleEdit = (e: React.MouseEvent, bill: Transaction) => { e.stopPropagation(); setEditingId(bill.id); setDescription(bill.description); setOperationType(bill.value < 0 ? 'expense' : 'income'); setValue(Math.abs(bill.value).toString()); setDate(bill.isRealized ? bill.dateRealized : bill.dateExpected); setCategory(bill.type); setCategorySearch(bill.type); setModeId(bill.sharingModeId || ''); setPaidBy(bill.paidBy || 'me'); setIsRealized(bill.isRealized); setIsModalOpen(true); };
  const handleOpenNew = () => { setEditingId(null); setDescription(''); setValue(''); setOperationType('expense'); setDate(new Date().toISOString().split('T')[0]); const initialType = tags[0]?.name || 'Geral'; setCategory(initialType); setCategorySearch(initialType); setModeId(sharingModes[0]?.id || ''); setPaidBy('me'); setIsRealized(false); setIsModalOpen(true); };
  const handleCreateCategory = () => { if (onAddTag && categorySearch.trim() !== '') { onAddTag(categorySearch); setCategory(categorySearch); setIsCategoryDropdownOpen(false); } };
  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const handleOpenSettlement = () => { const balance = settlementData.balance; if (Math.abs(balance) < 0.01) return alert("Não há saldo pendente para acerto."); setSettlementConfig({ accountId: accounts[0]?.name || '', date: new Date().toISOString().split('T')[0], amount: Math.abs(balance), type: balance > 0 ? 'receipt' : 'payment' }); setIsSettlementModalOpen(true); };
  const handleConfirmSettlement = () => { const { amount, type, accountId, date } = settlementConfig; const txValue = type === 'receipt' ? amount : -amount; const desc = type === 'receipt' ? 'Recebimento de Acerto' : 'Pagamento de Acerto'; onLaunchSettlement({ id: generateUUID(), description: desc, value: txValue, dateExpected: date, dateRealized: date, account: accountId, category: 'Acerto', type: 'Transferência', isRealized: true, excludeFromBudget: true }); setIsSettlementModalOpen(false); };
  const handleImportClick = () => { if (selectedSharedAccountId === 'all') { alert('Selecione uma conta específica.'); return; } fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (evt) => { if (evt.target?.result) { const raw = processContabilCSV(evt.target.result as string); const refined = raw.map(t => ({ ...t, id: generateUUID(), account: selectedSharedAccountId, isShared: true, paidBy: 'me', sharingModeId: sharingModes[0]?.id, type: t.type || 'Outros' })); setTransactions(prev => [...prev, ...refined]); } }; reader.readAsText(file); e.target.value = ''; };
  const handleExecuteBulkEdit = () => { const updates: Partial<Transaction> = {}; if(bulkData.modeId) updates.sharingModeId = bulkData.modeId; if(bulkData.paidBy) updates.paidBy = bulkData.paidBy; onBulkEdit(Array.from(selectedIds), updates); setIsBulkEditOpen(false); setSelectedIds(new Set()); };
  const handleCloseModal = () => { setEditingId(null); setDescription(''); setValue(''); setCategory(tags[0]?.name || 'Geral'); setDate(new Date().toISOString().split('T')[0]); setIsRealized(false); setIsModalOpen(false); };

  const ResizableHeader = ({ label, colKey, sortKey }: { label: string, colKey: string, sortKey?: string }) => (
    <th className="px-4 py-3 relative group select-none border-b dark:border-slate-600 bg-slate-50 dark:bg-slate-700" style={{ width: columnWidths[colKey] }}>
        <div className="flex items-center cursor-pointer hover:text-indigo-600" onClick={() => sortKey && requestSort(sortKey)}>
            {label} {sortKey && getSortIcon(sortKey)}
        </div>
        <div onMouseDown={(e) => startResize(e, colKey)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-400 active:bg-indigo-600 z-10"/>
    </th>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fadeIn">
        <div className="flex-shrink-0 space-y-6 pb-4">
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                <button onClick={() => setSelectedSharedAccountId('all')} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border ${selectedSharedAccountId === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>
                    <div className="flex justify-between items-start"><span className="font-bold text-lg">Geral</span><Layers size={24}/></div>
                    <div className="text-right"><span className="text-xs opacity-70 block">Total (Filtro)</span><span className="text-2xl font-bold">{parseCurrency(totalShared)}</span></div>
                </button>
                {sharedAccounts.map(acc => (
                    <button key={acc.id} onClick={() => setSelectedSharedAccountId(acc.id)} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border ${selectedSharedAccountId === acc.id ? 'bg-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
                        <div className="flex justify-between items-start w-full">
                            <div className="flex flex-col items-start"><span className="font-bold text-lg truncate">{acc.name}</span></div>
                            <div onClick={(e) => { e.stopPropagation(); setShowDetailsId(showDetailsId === acc.id ? null : acc.id); }} className="cursor-pointer hover:opacity-80">{showDetailsId === acc.id ? <EyeOff size={24}/> : <Eye size={24}/>}</div>
                        </div>
                        {showDetailsId === acc.id ? (<div className="text-xs opacity-90 mt-2 bg-white/10 p-2 rounded"><div>Parceiro: <strong>{acc.partnerName}</strong></div><div>Pix: {acc.partnerPix || '-'}</div><div>{acc.partnerBank} | Ag: {acc.partnerAgency}</div></div>) : (<div className="text-left mt-auto"><div className="text-xs opacity-70">Parceiro(a)</div><div className="font-bold">{acc.partnerName}</div></div>)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700"><h3 className="text-slate-500 text-xs font-bold uppercase">Total Gasto</h3><div className="text-2xl font-bold dark:text-white">{parseCurrency(settlementData.total)}</div></div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700"><h3 className="text-slate-500 text-xs font-bold uppercase">Minha Parte</h3><div className="text-2xl font-bold text-blue-600">{parseCurrency(settlementData.myLiability)}</div></div>
                <div className={`p-6 rounded-xl shadow border flex flex-col justify-between ${settlementData.balance > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}><div><h3 className="uppercase text-xs font-bold opacity-70">Acerto</h3><div className="text-lg font-bold">{settlementData.balance > 0 ? "Receber" : "Pagar"}</div><div className="text-3xl font-black opacity-80">{parseCurrency(Math.abs(settlementData.balance))}</div></div>{Math.abs(settlementData.balance) > 0.01 && (<button onClick={handleOpenSettlement} className="mt-2 py-2 w-full bg-black/10 hover:bg-black/20 rounded font-bold text-xs transition-colors">Lançar Acerto</button>)}</div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
                <div className="flex items-center gap-2 flex-1">
                    <button onClick={handleSelectAll} className="text-slate-500">{selectedIds.size > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}</button>
                    <div className="relative group max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input type="text" placeholder="Buscar conta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-700 dark:text-white rounded-lg text-sm w-full border-transparent focus:border-blue-500 focus:ring-0 transition-all outline-none"/>
                        {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14} /></button>)}
                    </div>
                    <span className="text-sm font-medium dark:text-slate-300 ml-2">{selectedIds.size > 0 && `${selectedIds.size} selecionados`}</span>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={() => setIsBulkEditOpen(true)} className="text-sm text-blue-600 flex items-center gap-1 ml-2"><Edit2 size={14}/> Editar</button>
                            <button onClick={handleDuplicateSelected} className="text-sm text-indigo-600 flex items-center gap-1 ml-2"><Copy size={14}/> Duplicar</button>
                            <button onClick={handleDeleteSelected} className="text-sm text-red-600 flex items-center gap-1 ml-2"><Trash2 size={14}/> Excluir</button>
                        </>
                    )}
                </div>
                <div className="flex gap-2"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" /><button onClick={handleImportClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${selectedSharedAccountId === 'all' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700 dark:text-white'}`} title={selectedSharedAccountId === 'all' ? "Selecione uma conta..." : "Importar CSV"}><Upload size={16}/> {selectedSharedAccountId === 'all' ? 'Selecione...' : 'Importar'}</button><button onClick={handleOpenNew} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm"><Plus size={16}/> Nova</button></div>
            </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow border dark:border-slate-700 relative">
            {/* MODO ARQUITETO: min-w-full para ocupar 100%, table-fixed para respeitar larguras */}
            <table className="min-w-full text-sm text-left table-fixed" style={{ minWidth: minTableWidth }}>
                <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-700 uppercase sticky top-0 z-30 shadow-sm">
                    <tr>
                        <th className="p-4 border-b dark:border-slate-600" style={{ width: columnWidths.select }}></th>
                        <ResizableHeader label="Data" colKey="date" sortKey="date" />
                        
                        {/* MODO ARQUITETO: Descrição com largura mínima garantida */}
                        <th className="px-4 py-3 border-b dark:border-slate-600 min-w-[300px]">Descrição</th>
                        
                        <ResizableHeader label="Valor" colKey="value" sortKey="value" />
                        <ResizableHeader label="Categoria" colKey="category" sortKey="category" />
                        <ResizableHeader label="Responsável" colKey="responsible" sortKey="paidBy" />
                        <ResizableHeader label="Modo" colKey="mode" />
                        <th className="px-4 py-3 text-right sticky right-0 bg-slate-50 dark:bg-slate-700 z-40 border-b dark:border-slate-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-24">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {sortedBills.map(bill => {
                        const billAccount = sharedAccounts.find(s => s.id === bill.account);
                        const partnerName = billAccount ? billAccount.partnerName : 'Parceiro';
                        const tagColor = tags.find(tag => tag.name === bill.type)?.color || '#94a3b8';
                        const mode = sharingModes.find(m => m.id === bill.sharingModeId);
                        return (
                            <tr key={bill.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700 ${selectedIds.has(bill.id) ? 'bg-indigo-50' : ''}`}>
                                <td className="p-4 truncate"><button onClick={() => handleToggleSelect(bill.id)} className="text-slate-400">{selectedIds.has(bill.id) ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}</button></td>
                                <td className="p-3 text-slate-500 truncate">{parseDate(bill.dateExpected)}</td>
                                
                                {/* MODO ARQUITETO: Descrição com quebra de linha automática */}
                                <td className="p-3 font-medium dark:text-white break-words whitespace-normal min-w-[300px]">
                                    {bill.description}
                                </td>
                                
                                <td className={`p-3 font-bold truncate ${bill.value < 0 ? 'text-red-600' : 'text-green-600'}`}>{parseCurrency(bill.value)}</td>
                                <td className="p-3 truncate"><span className="px-2 py-1 rounded text-xs text-white shadow-sm inline-block truncate max-w-full" style={{backgroundColor: tagColor}}>{bill.type}</span></td>
                                <td className="p-3 truncate"><span className={`px-2 py-1 rounded text-xs font-bold ${bill.paidBy === 'me' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{bill.paidBy === 'me' ? 'Eu' : partnerName}</span></td>
                                <td className="p-3 text-xs text-slate-500 truncate">{bill.customSplit ? 'Customizado' : (mode?.name || '-')}</td>
                                <td className={`px-4 py-3 text-right sticky right-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors ${selectedIds.has(bill.id) ? '!bg-indigo-50 dark:!bg-indigo-900/20' : ''}`}>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={(e) => handleDuplicateSingle(e, bill.id)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Duplicar"><Copy size={16}/></button>
                                        <button onClick={(e) => handleEdit(e, bill)} className="p-1 text-blue-600"><Edit2 size={16}/></button>
                                        <button onClick={(e) => handleDeleteSingle(e, bill.id)} className="p-1 text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* MODAL DUPLICAR */}
        {isDuplicateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold dark:text-white text-lg flex items-center gap-2"><Copy size={20}/> Duplicar Contas</h3>
                        <button onClick={() => setIsDuplicateModalOpen(false)}><X className="text-slate-400"/></button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                        Selecione a nova data para os <strong>{itemsToDuplicate.length}</strong> itens duplicados:
                    </p>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nova Data</label>
                    <input type="date" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium mb-6"/>
                    <button onClick={handleConfirmDuplicate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-colors">Confirmar Duplicação</button>
                </div>
            </div>
        )}

        {isModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold dark:text-white text-lg">{editingId ? 'Editar' : 'Nova'} Conta</h3><button onClick={handleCloseModal}><X className="text-slate-400"/></button></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tipo de Operação</label><div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg"><button onClick={() => setOperationType('expense')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${operationType === 'expense' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm' : 'text-slate-500'}`}><TrendingDown size={16}/> Despesa</button><button onClick={() => setOperationType('income')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${operationType === 'income' ? 'bg-white dark:bg-slate-600 text-green-600 shadow-sm' : 'text-slate-500'}`}><TrendingUp size={16}/> Receita</button></div></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Descrição</label><input placeholder="Ex: Aluguel, Mercado..." value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"/></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label><input type="number" placeholder="0,00" value={value} onChange={e => setValue(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"/></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"/></div><div className="grid grid-cols-2 gap-4"><div ref={categoryWrapperRef} className="relative"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Categoria</label><div className="relative"><input type="text" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none pr-8" value={categorySearch} placeholder="Selecione..." onFocus={() => setIsCategoryDropdownOpen(true)} onChange={(e) => { setCategorySearch(e.target.value); setCategory(e.target.value); setIsCategoryDropdownOpen(true); }} /><div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">{isCategoryDropdownOpen ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}</div></div>{isCategoryDropdownOpen && (<div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">{filteredTags.length > 0 ? (filteredTags.map(t => (<div key={t.name} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer flex items-center justify-between" onClick={() => { setCategory(t.name); setCategorySearch(t.name); setIsCategoryDropdownOpen(false); }}><span>{t.name}</span>{t.name === category && <Check size={14} className="text-indigo-500"/>}</div>))) : (<div className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-indigo-600 font-medium flex items-center gap-2" onClick={handleCreateCategory}><Plus size={14} /> Criar "{categorySearch}"</div>)}</div>)}</div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Quem Pagou?</label><select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"><option value="me">Eu</option><option value="partner">{currentSharedAccount?.partnerName || 'Parceiro'}</option></select></div></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Modo de Divisão</label><select value={modeId} onChange={e => setModeId(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">{sharingModes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div><div className="flex items-center gap-2 mt-2"><input type="checkbox" id="isRealized" checked={isRealized} onChange={e => setIsRealized(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"/><label htmlFor="isRealized" className="dark:text-white text-sm select-none cursor-pointer">Marcar como Pago</label></div><div className="flex justify-end gap-2 mt-4"><button onClick={handleCloseModal} className="px-4 py-2 border rounded dark:text-white">Cancelar</button><button onClick={handleSaveBill} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Salvar</button></div></div></div>)}
        {isSettlementModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-scale-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"><div className="flex justify-between items-center mb-2"><h3 className="font-bold dark:text-white text-lg flex items-center gap-2"><Wallet size={20}/> Confirmar Acerto</h3><button onClick={() => setIsSettlementModalOpen(false)}><X className="text-slate-400"/></button></div><div className={`p-4 rounded-lg text-center ${settlementConfig.type === 'receipt' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}><div className="text-sm font-medium mb-1">{settlementConfig.type === 'receipt' ? 'Você irá RECEBER' : 'Você irá PAGAR'}</div><div className="text-3xl font-bold">{parseCurrency(settlementConfig.amount)}</div></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conta para Lançamento</label><select value={settlementConfig.accountId} onChange={(e) => setSettlementConfig({...settlementConfig, accountId: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none">{accounts.filter(a => !a.archived).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data do Acerto</label><input type="date" value={settlementConfig.date} onChange={(e) => setSettlementConfig({...settlementConfig, date: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"/></div><button onClick={handleConfirmSettlement} className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-transform active:scale-95 ${settlementConfig.type === 'receipt' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Confirmar Lançamento</button></div></div>)}
        {isBulkEditOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4"><h3 className="font-bold dark:text-white text-lg">Edição em Massa</h3><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">Quem Pagou</label><select onChange={e => setBulkData({...bulkData, paidBy: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"><option value="">-- Manter --</option><option value="me">Eu</option><option value="partner">{currentSharedAccount?.partnerName || 'Parceiro'}</option></select></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Modo de Divisão</label><select onChange={e => setBulkData({...bulkData, modeId: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"><option value="">-- Manter --</option>{sharingModes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div></div><div className="flex justify-end gap-2 mt-4"><button onClick={() => setIsBulkEditOpen(false)} className="px-4 py-2 border rounded dark:text-white">Cancelar</button><button onClick={handleExecuteBulkEdit} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Aplicar</button></div></div></div>)}
    </div>
  );
};