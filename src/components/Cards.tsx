import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CardTransaction, CardConfig, Transaction, Tag, Account, SharedAccount, SharingMode, FilterState } from '../types';
import { parseCurrency, parseDate, calculateInvoiceDate, formatMonthYear, generateUUID, processCardCSV } from '../utils';
import { Plus, Edit2, Trash2, Layers, Upload, X, Eye, CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown, Share2, EyeOff, ShoppingBag, RotateCcw, Search, CreditCard, Check, Calendar, Copy } from 'lucide-react';

interface CardsProps {
  accounts: Account[]; 
  cardTransactions: CardTransaction[]; 
  setCardTransactions: React.Dispatch<React.SetStateAction<CardTransaction[]>>; 
  cardConfigs: CardConfig[]; 
  tags: Tag[]; 
  onAddTag?: (tagName: string) => void;
  onLaunchInvoice: (total: number, cardName: string, date: string, targetAccount: string) => void;
  currentFilterYear: number; 
  currentFilterMonths: number[];
  onBulkDelete: (ids: string[]) => void; 
  onBulkEdit: (ids: string[], updates: Partial<CardTransaction>) => void; 
  onImport: (data: any[], targetCard: string) => void;
  sharedAccounts: SharedAccount[]; 
  sharingModes: SharingMode[]; 
  onLaunchSharedInvoice: (invoiceTx: Transaction[]) => void;
  globalFilters: FilterState;
  onBatchSave?: (newTxs: CardTransaction[]) => void; // Nova prop
}

export const Cards: React.FC<CardsProps> = ({ 
  accounts, cardTransactions = [], setCardTransactions, cardConfigs = [], tags = [], onAddTag, onLaunchInvoice,
  currentFilterYear, currentFilterMonths, onBulkDelete, onImport,
  sharedAccounts = [], sharingModes = [], onLaunchSharedInvoice, globalFilters, onBatchSave
}) => {
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCards = cardConfigs.filter(c => !c.archived);
  const [selectedCardId, setSelectedCardId] = useState<string>('all'); 
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'datePurchase', direction: 'desc' });

  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({
    select: 48, datePurchase: 120, description: 300, value: 130, type: 150, dateInvoice: 120, mode: 120, status: 100, actions: 120
  });
  const resizingRef = useRef<{ col: string, startX: number, startWidth: number } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false); 
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Duplicação
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [itemsToDuplicate, setItemsToDuplicate] = useState<string[]>([]);
  const [duplicateDate, setDuplicateDate] = useState(new Date().toISOString().split('T')[0]);

  const [previewImportData, setPreviewImportData] = useState<any[]>([]);
  const [importTargetDate, setImportTargetDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ description: '', value: '', datePurchase: '', dateInvoice: '', type: 'Geral', installments: 1, cardId: '', paidBy: 'me', sharingModeId: '' });
  const [operationType, setOperationType] = useState<'purchase' | 'reversal'>('purchase');
  const [payInvoiceData, setPayInvoiceData] = useState({ accountId: '', date: new Date().toISOString().split('T')[0] });
  
  const [launchPayer, setLaunchPayer] = useState<string>('me');
  const [launchDate, setLaunchDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryWrapperRef = useRef<HTMLDivElement>(null);

  const [bulkData, setBulkData] = useState({ cardId: '', type: '', dateInvoice: '', operation: 'no_change', sharingModeId: '' });
  const currentConfig = cardConfigs.find(c => c.id === selectedCardId);

  // --- LÓGICA DE DUPLICAÇÃO ---
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
      const newTransactions: CardTransaction[] = [];
      
      itemsToDuplicate.forEach(id => {
          const original = cardTransactions.find(t => t.id === id);
          if (original) {
              const card = cardConfigs.find(c => c.id === original.cardName);
              // Recalcula fatura com base na nova data de compra
              const newInvoiceDate = card ? calculateInvoiceDate(duplicateDate, card.closingDay) : original.dateInvoice;
              
              newTransactions.push({
                  ...original,
                  id: generateUUID(),
                  datePurchase: duplicateDate,
                  dateInvoice: newInvoiceDate
              });
          }
      });

      onBatchSave(newTransactions);
      setIsDuplicateModalOpen(false);
      setItemsToDuplicate([]);
      setSelectedIds(new Set());
  };
  // -----------------------------

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const newWidth = Math.max(50, startWidth + (e.clientX - startX));
    setColumnWidths(prev => ({ ...prev, [col]: newWidth }));
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const startResize = (e: React.MouseEvent, col: string) => {
    e.preventDefault();
    resizingRef.current = { col, startX: e.clientX, startWidth: columnWidths[col] || 100 };
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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

  const requestSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'desc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
      setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
      if (!sortConfig || sortConfig.key !== columnName) return <ArrowUpDown size={14} className="ml-1 opacity-30 inline" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-blue-600 inline" /> : <ArrowDown size={14} className="ml-1 text-blue-600 inline" />;
  };

  const filteredTransactions = useMemo(() => {
      return cardTransactions.filter(t => {
          if (selectedCardId !== 'all' && t.cardName !== selectedCardId) return false;
          if (!t.dateInvoice || typeof t.dateInvoice !== 'string') return false;
          if (globalFilters.category !== 'all' && t.type !== globalFilters.category) return false;
          let y, m;
          if (t.dateInvoice.includes('-')) { const parts = t.dateInvoice.split('-'); y = Number(parts[0]); m = Number(parts[1]); } else { return false; }
          if (!y || !m) return false;
          const matchesDate = y === currentFilterYear && currentFilterMonths.includes(m - 1);
          if (!matchesDate) return false;
          if (searchTerm) {
             const lowerSearch = searchTerm.toLowerCase();
             const matchesDesc = t.description.toLowerCase().includes(lowerSearch);
             const matchesVal = t.value.toString().includes(lowerSearch);
             const matchesType = t.type.toLowerCase().includes(lowerSearch);
             return matchesDesc || matchesVal || matchesType;
          }
          return true;
      });
  }, [cardTransactions, selectedCardId, currentFilterYear, currentFilterMonths, globalFilters, searchTerm]);

  const sortedTransactions = useMemo(() => {
      let sortable = [...filteredTransactions];
      if (sortConfig !== null) {
          sortable.sort((a, b) => {
              let aValue: any = a[sortConfig.key as keyof CardTransaction];
              let bValue: any = b[sortConfig.key as keyof CardTransaction];
              if (sortConfig.key === 'datePurchase' || sortConfig.key === 'dateInvoice' || sortConfig.key === 'description' || sortConfig.key === 'type') {
                  aValue = String(aValue || '').toLowerCase(); bValue = String(bValue || '').toLowerCase();
              }
              if (sortConfig.key === 'value') { aValue = Math.abs(Number(a.value)); bValue = Math.abs(Number(b.value)); }
              if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return sortable;
  }, [filteredTransactions, sortConfig]);

  const totalInvoice = filteredTransactions.reduce((acc, t) => acc + (Number(t.value) || 0), 0);
  
  const getInvoiceStatus = (tx: CardTransaction) => {
      const card = cardConfigs.find(c => c.id === tx.cardName);
      if (!card) return 'Aberta'; 
      const [y, m] = tx.dateInvoice.split('-').map(Number);
      const dueDate = new Date(y, m - 1, card.dueDay);
      const today = new Date(); today.setHours(0,0,0,0);
      if (today > dueDate) return 'Fechada';
      return 'Aberta';
  };

  const splitPreview = useMemo(() => {
      let myTotalShare = 0; let partnerTotalShare = 0;
      filteredTransactions.forEach(t => {
          const mode = sharingModes.find(m => m.id === t.sharingModeId) || { myPercentage: 50, partnerPercentage: 50 };
          const val = Math.abs(Number(t.value) || 0);
          myTotalShare += val * (mode.myPercentage / 100);
          partnerTotalShare += val * (mode.partnerPercentage / 100);
      });
      return { myTotalShare, partnerTotalShare, total: myTotalShare + partnerTotalShare };
  }, [filteredTransactions, sharingModes]);

  const handleOpenPayInvoice = () => { if (selectedCardId === 'all') return alert("Selecione um cartão específico para pagar a fatura."); if (totalInvoice <= 0) return alert("Fatura zerada ou negativa."); setPayInvoiceData({ accountId: accounts[0]?.name || '', date: new Date().toISOString().split('T')[0] }); setIsPayInvoiceModalOpen(true); };
  const handleConfirmPayInvoice = () => { if (!currentConfig) return; onLaunchInvoice(totalInvoice, currentConfig.name, payInvoiceData.date, payInvoiceData.accountId); setIsPayInvoiceModalOpen(false); };
  
  const handleOpenLaunchModal = () => { 
      if (!currentConfig || !currentConfig.isShared || !currentConfig.linkedSharedAccountId) { alert("Cartão não vinculado."); return; } 
      if (totalInvoice <= 0) return alert("Fatura zerada."); 
      setLaunchDate(new Date().toISOString().split('T')[0]); 
      setIsLaunchModalOpen(true); 
  };

  const handleConfirmLaunch = () => {
      if (!currentConfig || !currentConfig.linkedSharedAccountId) return;
      const { myTotalShare, partnerTotalShare } = splitPreview;
      const launchDateIso = launchDate;
      const refMonth = formatMonthYear(filteredTransactions[0]?.dateInvoice);
      
      const modeAllMe = sharingModes.find(m => m.myPercentage === 100 && m.partnerPercentage === 0);
      const modeAllPartner = sharingModes.find(m => m.myPercentage === 0 && m.partnerPercentage === 100);

      const txMyPart: Transaction = { 
          id: generateUUID(), 
          description: `Fatura ${currentConfig.name} (${refMonth}) - Minha Parte`, 
          value: -Math.abs(myTotalShare), 
          dateExpected: launchDateIso, 
          dateRealized: launchDateIso, 
          account: currentConfig.linkedSharedAccountId, 
          category: 'Cartão de Crédito', 
          type: 'Compartilhado', 
          isRealized: true, 
          isShared: true, 
          paidBy: launchPayer, 
          sharingModeId: modeAllMe ? modeAllMe.id : undefined,
          customSplit: modeAllMe ? undefined : { myPercentage: 100, partnerPercentage: 0 }, 
          excludeFromBudget: true 
      };

      const txPartnerPart: Transaction = { 
          id: generateUUID(), 
          description: `Fatura ${currentConfig.name} (${refMonth}) - Parte Parceiro`, 
          value: -Math.abs(partnerTotalShare), 
          dateExpected: launchDateIso, 
          dateRealized: launchDateIso, 
          account: currentConfig.linkedSharedAccountId, 
          category: 'Cartão de Crédito', 
          type: 'Compartilhado', 
          isRealized: true, 
          isShared: true, 
          paidBy: launchPayer, 
          sharingModeId: modeAllPartner ? modeAllPartner.id : undefined,
          customSplit: modeAllPartner ? undefined : { myPercentage: 0, partnerPercentage: 100 }, 
          excludeFromBudget: true 
      };
      
      if (onLaunchSharedInvoice) onLaunchSharedInvoice([txMyPart, txPartnerPart]);
      setIsLaunchModalOpen(false);
  };

  const handleToggleSelect = (id: string) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet); };
  const handleSelectAll = () => { if (selectedIds.size === filteredTransactions.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredTransactions.map(t => t.id))); };
  const handleDeleteSelected = (e: React.MouseEvent) => { e.stopPropagation(); onBulkDelete(Array.from(selectedIds)); setSelectedIds(new Set()); };
  const handleDeleteSingle = (e: React.MouseEvent, id: string) => { e.stopPropagation(); onBulkDelete([id]); };
  
  const handleEdit = (e: React.MouseEvent, t: CardTransaction) => { 
      e.stopPropagation(); setEditingId(t.id); 
      setOperationType(t.value >= 0 ? 'purchase' : 'reversal');
      setFormData({ description: t.description, value: String(Math.abs(t.value)), datePurchase: t.datePurchase, dateInvoice: t.dateInvoice, type: t.type, installments: 1, cardId: t.cardName, paidBy: t.paidBy || 'me', sharingModeId: t.sharingModeId || '' }); 
      setCategorySearch(t.type);
      setIsModalOpen(true); 
  };
  
  const handleCreateCategory = () => { if (onAddTag && categorySearch.trim() !== '') { onAddTag(categorySearch); setFormData({ ...formData, type: categorySearch }); setIsCategoryDropdownOpen(false); } };
  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const handleSaveLogic = () => {
      const targetCard = cardConfigs.find(c => c.id === formData.cardId);
      if (!targetCard) { alert("Selecione um cartão válido."); return; }
      let invoiceDate = formData.dateInvoice;
      if (!invoiceDate) invoiceDate = calculateInvoiceDate(formData.datePurchase, targetCard.closingDay);
      const valNum = parseFloat(formData.value.replace(',', '.'));
      const finalValue = operationType === 'purchase' ? Math.abs(valNum) : -Math.abs(valNum);
      const commonData = { description: formData.description, type: formData.type, cardName: formData.cardId, paidBy: formData.paidBy, sharingModeId: formData.sharingModeId };
      if (editingId) { setCardTransactions(prev => prev.map(t => t.id === editingId ? { ...t, ...commonData, value: finalValue, dateInvoice: invoiceDate, datePurchase: formData.datePurchase } : t)); } 
      else {
          const newTxs = []; const valPerInst = finalValue / formData.installments;
          for(let i=0; i<formData.installments; i++) {
              let invDateObj = new Date(invoiceDate + 'T00:00:00'); invDateObj.setMonth(invDateObj.getMonth() + i);
              const isoInvoice = invDateObj.toISOString().split('T')[0].substring(0, 7) + '-01'; 
              newTxs.push({ id: generateUUID(), ...commonData, description: formData.installments > 1 ? `${formData.description} (${i+1}/${formData.installments})` : formData.description, value: valPerInst, datePurchase: formData.datePurchase, dateInvoice: isoInvoice });
          }
          setCardTransactions(prev => [...prev, ...newTxs]);
      }
      setIsModalOpen(false);
  };

  const handleExecuteBulkEdit = () => {
      setCardTransactions(prev => prev.map(t => {
          if (!selectedIds.has(t.id)) return t;
          let newVal = t.value;
          if (bulkData.operation === 'purchase') newVal = Math.abs(t.value);
          if (bulkData.operation === 'reversal') newVal = -Math.abs(t.value);
          return { ...t, cardName: bulkData.cardId || t.cardName, type: bulkData.type || t.type, dateInvoice: bulkData.dateInvoice ? bulkData.dateInvoice + '-01' : t.dateInvoice, sharingModeId: bulkData.sharingModeId || t.sharingModeId, value: newVal };
      }));
      setIsBulkEditOpen(false); setSelectedIds(new Set());
  };
  
  const handleImportClick = () => { if (selectedCardId === 'all') { alert('⚠️ Selecione um cartão específico.'); return; } fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !currentConfig) return; const reader = new FileReader(); reader.onload = (event) => { if (event.target?.result) { const raw = processCardCSV(event.target.result as string, currentConfig.name, currentConfig.closingDay); if (raw.length > 0) { setPreviewImportData(raw); const suggestedDate = raw[0].dateInvoice ? raw[0].dateInvoice.substring(0, 7) : new Date().toISOString().substring(0, 7); setImportTargetDate(suggestedDate); setIsImportModalOpen(true); } else { alert("Nenhuma transação válida encontrada no CSV."); } } }; reader.readAsText(file); e.target.value = ''; };
  const handleConfirmImport = () => { if (!currentConfig || !importTargetDate) return; const refined = previewImportData.map(t => ({ ...t, id: generateUUID(), cardName: currentConfig.id, dateInvoice: importTargetDate + '-01' })); setCardTransactions(prev => [...prev, ...refined]); setIsImportModalOpen(false); setPreviewImportData([]); alert(`${refined.length} transações importadas.`); };
  const handleOpenNew = () => { setEditingId(null); setOperationType('purchase'); const today = new Date().toISOString().split('T')[0]; const initialType = tags[0]?.name || 'Geral'; setFormData({ description: '', value: '', datePurchase: today, dateInvoice: '', type: initialType, installments: 1, cardId: selectedCardId !== 'all' ? selectedCardId : activeCards[0]?.id || '', paidBy: 'me', sharingModeId: sharingModes[0]?.id || '' }); setCategorySearch(initialType); setIsModalOpen(true); }

  const ResizableHeader = ({ label, colKey, sortKey }: { label: string, colKey: string, sortKey?: string }) => (
    <th className="px-4 py-3 relative group select-none border-b dark:border-slate-600" style={{ width: columnWidths[colKey] }}>
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
            <button onClick={() => setSelectedCardId('all')} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border ${selectedCardId === 'all' ? 'bg-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-start"><span className="font-bold text-lg">Todos os Cartões</span><Layers size={24}/></div>
                <div className="text-right"><span className="text-xs opacity-70 block mb-1">Fatura Total (Filtro)</span><span className="text-2xl font-bold">{parseCurrency(totalInvoice)}</span></div>
            </button>
            {activeCards.map(card => {
                const cardTotal = sortedTransactions.filter(t => t.cardName === card.id).reduce((acc,t)=>acc + (Number(t.value) || 0), 0);
                return (
                <button key={card.id} onClick={() => setSelectedCardId(card.id)} className={`snap-center flex-shrink-0 w-72 h-40 rounded-2xl p-4 flex flex-col justify-between transition-all border relative ${selectedCardId === card.id ? 'bg-blue-600 text-white' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start w-full">
                        <div className="flex flex-col items-start"><span className="font-bold truncate pr-2 text-lg">{card.name}</span>{card.isShared && <span className="text-[10px] bg-white/20 px-2 rounded mt-1">Compartilhado</span>}</div>
                        <div onClick={(e) => { e.stopPropagation(); setShowDetailsId(showDetailsId === card.id ? null : card.id); }} className="cursor-pointer hover:opacity-80">{showDetailsId === card.id ? <EyeOff size={24}/> : <Eye size={24}/>}</div>
                    </div>
                    {showDetailsId === card.id ? (
                        <div className="grid grid-cols-2 gap-2 text-xs opacity-90 mt-2 bg-white/10 p-2 rounded text-left"><span>Fecha: <strong>{card.closingDay}</strong></span><span>Vence: <strong>{card.dueDay}</strong></span><span className="col-span-2">Limite: <strong>{parseCurrency(card.limit || 0)}</strong></span></div>
                    ) : (
                        <div className="text-right mt-auto"><span className="text-xs opacity-70 block">Fatura Mês</span><span className="text-2xl font-bold">{parseCurrency(cardTotal)}</span></div>
                    )}
                </button>
                )
            })}
          </div>
          
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 gap-4">
            <div className="flex items-center gap-2 flex-1">
                <button onClick={handleSelectAll} className="text-slate-500">{selectedIds.size > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}</button>
                <div className="relative group max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input type="text" placeholder="Buscar fatura..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-700 dark:text-white rounded-lg text-sm w-full border-transparent focus:border-blue-500 focus:ring-0 transition-all outline-none"/>
                    {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={14} /></button>)}
                </div>
                <span className="text-sm font-medium dark:text-slate-300 ml-2">{selectedIds.size > 0 && `${selectedIds.size} selecionados`}</span>
                {selectedIds.size > 0 && (
                    <>
                        <button onClick={() => setIsBulkEditOpen(true)} className="text-sm text-blue-600 flex items-center gap-1 ml-2 hover:underline"><Edit2 size={14}/> Editar</button>
                        <button type="button" onClick={handleDuplicateSelected} className="text-sm text-indigo-600 flex items-center gap-1 ml-2"><Copy size={14}/> Duplicar</button>
                        <button onClick={handleDeleteSelected} className="text-sm text-red-600 flex items-center gap-1 ml-2 hover:underline"><Trash2 size={14}/> Excluir</button>
                    </>
                )}
            </div>
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                {currentConfig?.isShared && selectedCardId !== 'all' && totalInvoice > 0 && (<button onClick={handleOpenLaunchModal} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors"><Share2 size={16}/> Dividir Fatura</button>)}
                {selectedCardId !== 'all' && totalInvoice > 0 && (<button onClick={handleOpenPayInvoice} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"><CreditCard size={16}/> Pagar Fatura</button>)}
                <button onClick={handleImportClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${selectedCardId === 'all' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 dark:bg-slate-700 dark:text-white'}`} title={selectedCardId === 'all' ? "Selecione um cartão acima" : "Importar CSV"}><Upload size={16}/> {selectedCardId === 'all' ? 'Selecione...' : 'Importar'}</button>
                <button onClick={() => { handleOpenNew(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"><Plus size={16} /> Nova Compra</button>
            </div>
          </div>
      </div>
      
      <div className="flex-1 overflow-x-auto overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
        <table className="min-w-full text-sm text-left table-fixed">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="p-4 border-b dark:border-slate-600" style={{ width: columnWidths.select }}></th>
                    <ResizableHeader label="Compra" colKey="datePurchase" sortKey="datePurchase" />
                    <ResizableHeader label="Descrição" colKey="description" sortKey="description" />
                    <ResizableHeader label="Valor" colKey="value" sortKey="value" />
                    <ResizableHeader label="Categoria" colKey="type" sortKey="type" />
                    <ResizableHeader label="Fatura" colKey="dateInvoice" sortKey="dateInvoice" />
                    {currentConfig?.isShared ? <ResizableHeader label="Modo" colKey="mode" /> : null}
                    <ResizableHeader label="Status" colKey="status" />
                    <ResizableHeader label="Ações" colKey="actions" />
                </tr>
            </thead>
            <tbody>
                {sortedTransactions.map(t => { 
                    const tagColor = tags.find(tag => tag.name === t.type)?.color || '#94a3b8'; 
                    const valueColor = t.value < 0 ? 'text-green-600' : 'text-red-600';
                    return ( <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 ${selectedIds.has(t.id) ? 'bg-blue-50' : ''}`}><td className="p-4 truncate"><button type="button" onClick={() => handleToggleSelect(t.id)} className="text-slate-400">{selectedIds.has(t.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18}/>}</button></td><td className="px-4 py-3 text-slate-500 truncate">{parseDate(t.datePurchase)}</td><td className="px-4 py-3 font-medium dark:text-white truncate" title={t.description}>{t.description}</td><td className={`px-4 py-3 font-bold truncate ${valueColor}`}>{parseCurrency(t.value)}</td><td className="px-4 py-3 truncate"><span className="px-2 py-1 rounded text-xs text-white shadow-sm truncate inline-block max-w-full" style={{ backgroundColor: tagColor }}>{t.type}</span></td><td className="px-4 py-3 text-xs text-slate-500 truncate">{formatMonthYear(t.dateInvoice)}</td>{currentConfig?.isShared && <td className="px-4 py-3 text-xs truncate">{sharingModes.find(m => m.id === t.sharingModeId)?.name || '-'}</td>}<td className="px-4 py-3 text-center truncate"><span className={`px-2 py-1 rounded text-xs ${getInvoiceStatus(t) === 'Aberta' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{getInvoiceStatus(t)}</span></td>
                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button type="button" onClick={(e) => handleDuplicateSingle(e, t.id)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Duplicar"><Copy size={16}/></button>
                        <button type="button" onClick={(e) => handleEdit(e, t)} className="p-1 text-blue-600"><Edit2 size={16}/></button>
                        <button type="button" onClick={(e) => handleDeleteSingle(e, t.id)} className="p-1 text-red-500"><Trash2 size={16}/></button>
                    </td></tr> )
                })}
            </tbody>
        </table>
      </div>
      
      {/* MODAL DUPLICAR */}
      {isDuplicateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold dark:text-white text-lg flex items-center gap-2"><Copy size={20}/> Duplicar Compras</h3>
                      <button onClick={() => setIsDuplicateModalOpen(false)}><X className="text-slate-400"/></button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      Selecione a nova data de compra para os <strong>{itemsToDuplicate.length}</strong> itens. A fatura será recalculada automaticamente.
                  </p>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nova Data de Compra</label>
                  <input type="date" value={duplicateDate} onChange={e => setDuplicateDate(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium mb-6"/>
                  <button onClick={handleConfirmDuplicate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg transition-colors">Confirmar Duplicação</button>
              </div>
          </div>
      )}

      {isImportModalOpen && (<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><Upload size={20}/> Confirmar Importação</h3><button onClick={() => setIsImportModalOpen(false)}><X className="text-slate-400"/></button></div><div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg"><p className="text-sm text-slate-600 dark:text-slate-300">Foram encontradas <strong>{previewImportData.length}</strong> transações no arquivo. Selecione abaixo para qual fatura elas devem ser importadas:</p></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fatura de Destino</label><input type="month" value={importTargetDate} onChange={(e) => setImportTargetDate(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium"/></div><button onClick={handleConfirmImport} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg">Confirmar Importação</button></div></div>)}

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md space-y-4 shadow-2xl">
                 <div className="flex justify-between items-center mb-2"><h3 className="text-lg font-bold dark:text-white">{editingId ? 'Editar' : 'Nova'} Movimentação</h3><button onClick={() => setIsModalOpen(false)}><X className="text-slate-400"/></button></div>
                 <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Tipo de Operação</label><div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg"><button onClick={() => setOperationType('purchase')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${operationType === 'purchase' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm' : 'text-slate-500'}`}><ShoppingBag size={16}/> Compra (+)</button><button onClick={() => setOperationType('reversal')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-bold transition-all ${operationType === 'reversal' ? 'bg-white dark:bg-slate-600 text-green-600 shadow-sm' : 'text-slate-500'}`}><RotateCcw size={16}/> Estorno (-)</button></div></div>
                 <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Descrição</label><input placeholder="Ex: Netflix, Ifood..." className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}/></div>
                 <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Valor (R$)</label><input placeholder="0,00" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})}/></div>
                 <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Data da Compra</label><input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.datePurchase} onChange={e => setFormData({...formData, datePurchase: e.target.value})}/></div><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Cartão</label><select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.cardId} onChange={e => setFormData({...formData, cardId: e.target.value})}>{activeCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
                 <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Fatura de Referência</label><input type="month" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.dateInvoice.substring(0, 7)} onChange={e => setFormData({...formData, dateInvoice: e.target.value + '-01'})}/></div></div>
                 <div ref={categoryWrapperRef} className="relative"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Categoria</label><div className="relative"><input type="text" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none pr-8" value={categorySearch} placeholder="Selecione ou crie..." onFocus={() => setIsCategoryDropdownOpen(true)} onChange={(e) => { setCategorySearch(e.target.value); setFormData({...formData, type: e.target.value}); setIsCategoryDropdownOpen(true); }} /><div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">{isCategoryDropdownOpen ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}</div></div>{isCategoryDropdownOpen && (<div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">{filteredTags.length > 0 ? (filteredTags.map(t => (<div key={t.name} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer flex items-center justify-between" onClick={() => { setFormData({...formData, type: t.name}); setCategorySearch(t.name); setIsCategoryDropdownOpen(false); }}><span>{t.name}</span>{t.name === formData.type && <Check size={14} className="text-blue-500"/>}</div>))) : (<div className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-blue-600 font-medium flex items-center gap-2" onClick={handleCreateCategory}><Plus size={14} /> Criar "{categorySearch}"</div>)}</div>)}</div>
                 {cardConfigs.find(c => c.id === formData.cardId)?.isShared && (<div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded"><label className="text-xs font-bold text-indigo-800 dark:text-indigo-200 mb-1 block">Modo de Divisão</label><select value={formData.sharingModeId} onChange={e => setFormData({...formData, sharingModeId: e.target.value})} className="w-full p-2 border rounded text-sm dark:bg-slate-800 dark:text-white"><option value="">Selecione...</option>{sharingModes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>)}
                 {!editingId && (<div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Parcelas</label><input type="number" min="1" max="24" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.installments} onChange={e => setFormData({...formData, installments: parseInt(e.target.value)})}/></div>)}
                 <button onClick={handleSaveLogic} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg mt-2">Salvar</button>
             </div>
          </div>
      )}
      
      {isBulkEditOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4"><div className="flex justify-between items-center"><h3 className="text-lg font-bold dark:text-white">Edição em Massa</h3><button onClick={() => setIsBulkEditOpen(false)}><X className="text-slate-400"/></button></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 mb-1 block">Mover para Cartão</label><select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" onChange={e => setBulkData({...bulkData, cardId: e.target.value})}><option value="">-- Manter --</option>{activeCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label className="text-xs font-bold text-slate-500 mb-1 block">Nova Categoria</label><select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" onChange={e => setBulkData({...bulkData, type: e.target.value})}><option value="">-- Manter --</option>{tags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-500 mb-1 block">Mover Fatura</label><input type="month" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" onChange={e => setBulkData({...bulkData, dateInvoice: e.target.value})}/></div><div><label className="text-xs font-bold text-slate-500 mb-1 block">Tipo Operação</label><select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" onChange={e => setBulkData({...bulkData, operation: e.target.value})}><option value="no_change">-- Manter --</option><option value="purchase">Virar Compra (+)</option><option value="reversal">Virar Estorno (-)</option></select></div></div>{sharingModes.length > 0 && (<div><label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1 block">Alterar Modo de Divisão</label><select className="w-full p-2 border border-indigo-200 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600" onChange={e => setBulkData({...bulkData, sharingModeId: e.target.value})}><option value="">-- Manter Atual --</option>{sharingModes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>)}<button onClick={handleExecuteBulkEdit} className="w-full py-2 bg-indigo-600 text-white rounded font-bold mt-4">Aplicar Mudanças</button></div></div>)}
      {isPayInvoiceModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><CreditCard size={20}/> Pagar Fatura</h3><button onClick={() => setIsPayInvoiceModalOpen(false)}><X className="text-slate-400"/></button></div><div className="space-y-4"><div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center"><div className="text-sm text-slate-600 dark:text-slate-300 mb-1">Valor Total da Fatura</div><div className="text-3xl font-bold text-green-700 dark:text-green-400">{parseCurrency(totalInvoice)}</div></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Debitar da Conta</label><select value={payInvoiceData.accountId} onChange={e => setPayInvoiceData({...payInvoiceData, accountId: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium">{accounts.filter(a => !a.archived).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data do Pagamento</label><input type="date" value={payInvoiceData.date} onChange={e => setPayInvoiceData({...payInvoiceData, date: e.target.value})} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium"/></div><button onClick={handleConfirmPayInvoice} className="w-full py-3 bg-green-600 text-white rounded-lg font-bold shadow-lg hover:bg-green-700 transition-colors">Confirmar Pagamento</button></div></div></div>)}
      {isLaunchModalOpen && (<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in"><div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><Share2 size={20}/> Dividir Fatura</h3><button onClick={() => setIsLaunchModalOpen(false)}><X className="text-slate-400"/></button></div><div className="space-y-4"><div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quem pagou a fatura total?</label><select value={launchPayer} onChange={e => setLaunchPayer(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium"><option value="me">Eu (Vou ser reembolsado)</option><option value="partner">Parceiro (Vou reembolsar)</option></select></div><div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg space-y-2"><div className="flex justify-between text-sm dark:text-white"><span>Minha Parte</span><span className="font-bold">{parseCurrency(splitPreview.myTotalShare)}</span></div><div className="flex justify-between text-sm dark:text-white"><span>Parte Dele(a)</span><span className="font-bold">{parseCurrency(splitPreview.partnerTotalShare)}</span></div><div className="border-t border-slate-300 dark:border-slate-600 pt-2 flex justify-between font-bold dark:text-white"><span>Total Fatura</span><span>{parseCurrency(splitPreview.total)}</span></div></div>
      
      {/* Campo de Data Adicionado */}
      <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Data dos Lançamentos</label><input type="date" value={launchDate} onChange={e => setLaunchDate(e.target.value)} className="w-full p-3 border rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white font-medium"/></div>
      
      </div><div className="flex gap-3 mt-6"><button onClick={() => setIsLaunchModalOpen(false)} className="flex-1 py-2.5 border rounded-lg font-bold text-slate-500 dark:text-white">Cancelar</button><button onClick={handleConfirmLaunch} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-lg">Confirmar Lançamento</button></div></div></div>)}
    </div>
  );
};
