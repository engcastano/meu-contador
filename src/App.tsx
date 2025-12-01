import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Transaction, CardTransaction, CardConfig, Account, Tag,
  FilterState, TabType, SharingRule, Partner, SharedAccount, SharingMode, BudgetTarget, User as UserType 
} from '../types';
import { generateUUID } from '../utils';
import { MONTH_NAMES } from '../constants';
import { Login } from '../Login';
import { Dashboard } from './components/Dashboard';
import Transactions from './components/Transactions'; 
import { Cards } from './components/Cards';
import { Settings } from './components/Settings';
import { SharedFinances } from './components/SharedFinances';
import { BudgetFlow } from './components/BudgetFlow';
import { Moon, Sun, LayoutDashboard, List, CreditCard, Settings as SettingsIcon, Wallet, Users, LogOut, Calendar, CheckCircle, AlertTriangle, BarChart3, Filter, Tag as TagIcon, Loader2, CloudOff, NotebookPen, Menu, X } from 'lucide-react';
import { subscribeToCollection, saveData, deleteData, saveBatchData, getCollectionName, saveUserPreferences } from './api';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [enabledModules, setEnabledModules] = useState({ cards: false, shared: false, budget: true });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cardTransactions, setCardTransactions] = useState<CardTransaction[]>([]);
  const [budgetTargets, setBudgetTargets] = useState<BudgetTarget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sharedAccounts, setSharedAccounts] = useState<SharedAccount[]>([]);
  const [sharingModes, setSharingModes] = useState<SharingMode[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [cardConfigs, setCardConfigs] = useState<CardConfig[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [sharingRules, setSharingRules] = useState<SharingRule[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [filters, setFilters] = useState<FilterState>({ year: new Date().getFullYear(), months: [new Date().getMonth()], accountId: 'all', viewMode: 'accounts', status: 'all', category: 'all', responsible: 'all' });

  // Listener Autenticação
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          username: firebaseUser.displayName || 'Usuário',
          role: 'user',
          preferences: {}
        });
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoadingData(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listener Dados Realtime
  useEffect(() => {
    if (!user || !user.id) return;
    
    const unsubs = [
      subscribeToCollection(user.id, getCollectionName('Transactions'), (data) => setTransactions(data)),
      subscribeToCollection(user.id, getCollectionName('CardTransactions'), (data) => setCardTransactions(data)),
      subscribeToCollection(user.id, getCollectionName('Accounts'), (data) => {
          setAccounts(data);
          if (data.length === 0) {
             const defAcc = { id: generateUUID(), name: 'Conta Corrente', archived: false, bank: '', agency: '', number: '', pixKey: '', userId: user.id };
             saveData(user.id, getCollectionName('Accounts'), defAcc);
          }
      }),
      subscribeToCollection(user.id, getCollectionName('CardConfigs'), (data) => setCardConfigs(data)),
      subscribeToCollection(user.id, getCollectionName('SharedAccounts'), (data) => setSharedAccounts(data)),
      subscribeToCollection(user.id, getCollectionName('SharingModes'), (data) => {
          setSharingModes(data);
          if (data.length === 0) {
              const defaults = [
                  { id: generateUUID(), name: 'Meio a Meio', myPercentage: 50, partnerPercentage: 50, color: '#3b82f6', userId: user.id },
                  { id: generateUUID(), name: 'Tudo Eu', myPercentage: 100, partnerPercentage: 0, color: '#10b981', userId: user.id },
                  { id: generateUUID(), name: 'Tudo Parceiro', myPercentage: 0, partnerPercentage: 100, color: '#ef4444', userId: user.id }
              ];
              saveBatchData(user.id, getCollectionName('SharingModes'), defaults);
          }
      }),
      subscribeToCollection(user.id, getCollectionName('Tags'), (data) => {
          setTags(data);
          if (data.length === 0) {
              const defaults = [
                   { id: generateUUID(), name: 'Alimentação', color: '#ef4444', userId: user.id }, 
                   { id: generateUUID(), name: 'Moradia', color: '#3b82f6', userId: user.id }, 
                   { id: generateUUID(), name: 'Lazer', color: '#f59e0b', userId: user.id }, 
                   { id: generateUUID(), name: 'Transporte', color: '#10b981', userId: user.id }, 
                   { id: generateUUID(), name: 'Outros', color: '#64748b', userId: user.id }
              ];
              saveBatchData(user.id, getCollectionName('Tags'), defaults);
          }
      }),
      subscribeToCollection(user.id, getCollectionName('BudgetTargets'), (data) => setBudgetTargets(data)),
    ];

    setTimeout(() => setIsLoadingData(false), 800);

    return () => unsubs.forEach(unsub => unsub());
  }, [user]);

  useEffect(() => { if (theme === 'dark') document.body.classList.add('dark'); else document.body.classList.remove('dark'); }, [theme]);

  const tabs = useMemo(() => {
      const t = [{ id: 'dashboard', label: 'Dash', icon: LayoutDashboard }];
      if(enabledModules.budget) t.push({ id: 'budget', label: 'Fluxo', icon: BarChart3 });
      t.push({ id: 'transactions', label: 'Contas', icon: List });
      if(enabledModules.cards) t.push({ id: 'cards', label: 'Cartão', icon: CreditCard });
      if(enabledModules.shared) t.push({ id: 'shared', label: 'Shared', icon: Users });
      t.push({ id: 'settings', label: 'Ajustes', icon: SettingsIcon });
      return t;
  }, [enabledModules]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => { setNotification({ message, type }); setTimeout(() => setNotification(null), 3000); };

  const handleSaveTransaction = async (tx: Transaction) => {
    await saveData(user!.id, getCollectionName('Transactions'), { ...tx, userId: user!.id });
    showToast('Salvo!');
  };

  const handleBatchSaveTransactions = async (newTxs: Transaction[]) => {
    const items = newTxs.map(t => ({...t, userId: user!.id}));
    await saveBatchData(user!.id, getCollectionName('Transactions'), items);
    showToast(`${items.length} itens salvos!`);
  };

  const handleDeleteTransaction = (id: string) => requestConfirm('Excluir', 'Tem certeza?', async () => {
    await deleteData(user!.id, getCollectionName('Transactions'), id);
    showToast('Excluído.');
  });

  const handleBulkEditTransactions = async (ids: string[], updates: Partial<Transaction>) => {
    const itemsToUpdate = transactions.filter(t => ids.includes(t.id)).map(t => ({ ...t, ...updates }));
    await saveBatchData(user!.id, getCollectionName('Transactions'), itemsToUpdate);
    showToast('Atualizado.');
  };

  const handleDeleteTransactionsById = (ids: string[]) => requestConfirm('Excluir', `Excluir ${ids.length} itens?`, async () => {
    const promises = ids.map(id => deleteData(user!.id, getCollectionName('Transactions'), id));
    await Promise.all(promises);
    showToast('Excluídos.');
  });

  const handleBatchSaveCardTransactions = async (newTxs: CardTransaction[]) => {
    const items = newTxs.map(t => ({...t, userId: user!.id}));
    await saveBatchData(user!.id, getCollectionName('CardTransactions'), items);
    showToast('Salvo!');
  };

  const handleDeleteCardTransactionsById = (ids: string[]) => requestConfirm('Excluir', `Excluir ${ids.length} compras?`, async () => {
    const promises = ids.map(id => deleteData(user!.id, getCollectionName('CardTransactions'), id));
    await Promise.all(promises);
  });

  const handleBulkEditCardTransactions = async (ids: string[], updates: Partial<CardTransaction>) => {
    const items = cardTransactions.filter(t => ids.includes(t.id)).map(t => ({ ...t, ...updates }));
    await saveBatchData(user!.id, getCollectionName('CardTransactions'), items);
  };

  const handleLaunchInvoice = (totalValue: number, cardName: string, date: string, targetAccount: string) => { 
    requestConfirm('Lançar Fatura', `Lançar fatura de R$ ${totalValue}?`, async () => { 
      const tx = { id: generateUUID(), description: `Fatura ${cardName}`, value: -Math.abs(totalValue), dateExpected: date, dateRealized: date, account: targetAccount, category: 'Pagamento de Cartão', type: 'Pagamento', isRealized: true, userId: user?.id };
      await saveData(user!.id, getCollectionName('Transactions'), tx);
      showToast('Fatura lançada!'); 
    }); 
  };

  const handleLaunchSharedInvoice = async (invoiceTx: Transaction | Transaction[]) => { 
    const newTxs = Array.isArray(invoiceTx) ? invoiceTx : [invoiceTx];
    const items = newTxs.map(t => ({...t, userId: user!.id}));
    await saveBatchData(user!.id, getCollectionName('Transactions'), items);
    showToast('Fatura lançada!'); 
  };

  const handleImport = async (data: any[], targetAccount: string) => { 
    const items = data.map((d:any)=>({...d, account: targetAccount, id: generateUUID(), userId: user?.id}));
    await saveBatchData(user!.id, getCollectionName('Transactions'), items);
    showToast('Importado.'); 
  };

  const handleImportCard = async (data: any[], targetCardId: string) => { 
    const items = data.map((d:any) => ({...d, userId: user?.id}));
    await saveBatchData(user!.id, getCollectionName('CardTransactions'), items);
    showToast('Importado.'); 
  }

  const handleDeleteTag = (tagName: string) => requestConfirm('Excluir', 'Tem certeza?', async () => {
    const tag = tags.find(t => t.name === tagName);
    if(tag) await deleteData(user!.id, getCollectionName('Tags'), tag.id);
  });

  const handleAddTag = async (tagName: string) => {
      if (!tagName.trim()) return;
      if (tags.some(t => t.name.toLowerCase() === tagName.toLowerCase())) { showToast(`Categoria "${tagName}" já existe.`, 'error'); return; }
      const newTag: Tag = { id: generateUUID(), name: tagName, color: '#64748b', userId: user?.id };
      await saveData(user!.id, getCollectionName('Tags'), newTag);
      showToast(`Categoria "${tagName}" criada!`);
  };

  // -- HANDLERS GENÉRICOS DE SALVAMENTO PARA SETTINGS --
  // Esses handlers recebem o objeto já modificado e salvam no Firestore
  const handleSaveItem = (collectionName: string) => async (item: any) => {
      if (!user?.id) return;
      // Se o item vier com isNew, remove antes de salvar
      const itemToSave = { ...item, userId: user.id };
      delete itemToSave.isNew;
      await saveData(user.id, collectionName, itemToSave);
      showToast('Salvo!');
  };

  const hardDeleteAccount = (id: string) => requestConfirm('Excluir Conta', 'Apagar tudo?', async () => { 
      await deleteData(user!.id, getCollectionName('Accounts'), id);
  });
  
  const hardDeleteCard = (id: string) => requestConfirm('Excluir Cartão', 'Apagar tudo?', async () => { 
      await deleteData(user!.id, getCollectionName('CardConfigs'), id);
  });

  const hardDeleteShared = (id: string) => requestConfirm('Excluir', 'Tem certeza?', async () => { 
      await deleteData(user!.id, getCollectionName('SharedAccounts'), id);
  });

  const hardDeleteMode = (id: string) => requestConfirm('Excluir', 'Tem certeza?', async () => { 
      await deleteData(user!.id, getCollectionName('SharingModes'), id);
  });

  const handleUpdateTarget = async (target: BudgetTarget) => {
      await saveData(user!.id, getCollectionName('BudgetTargets'), { ...target, userId: user!.id });
  };

  const handleLaunchSettlement = async (tx: Transaction) => { 
      await saveData(user!.id, getCollectionName('Transactions'), { ...tx, userId: user?.id });
      showToast("Acerto lançado!"); 
  };

  const handleLogout = async () => { await signOut(auth); };
  const handleSavePreferences = async () => {
      if (!user) return;
      await saveUserPreferences(user.id, { enabledModules });
      showToast('Preferências salvas!');
  };

  const requestConfirm = (title: string, message: string, action: () => void) => { setConfirmModal({ isOpen: true, title, message, onConfirm: action }); };
  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
  const executeConfirm = () => { confirmModal.onConfirm(); closeConfirm(); };
  const toggleMonth = (idx: number) => setFilters(prev => { if (prev.months.includes(idx)) return { ...prev, months: prev.months.filter(m => m !== idx) }; return { ...prev, months: [...prev.months, idx] }; });
  const selectAllMonths = () => setFilters(p => ({ ...p, months: [0,1,2,3,4,5,6,7,8,9,10,11] }));
  const clearMonths = () => setFilters(p => ({ ...p, months: [] }));

  // Filters Mobile Drawer Content
  const FiltersContent = () => (
      <div className="space-y-6">
          <div><div className="flex justify-between items-center mb-2"><label className="text-xs text-slate-500 font-bold uppercase flex items-center gap-1"><Calendar size={12}/> Meses</label><div className="flex gap-1"><button onClick={selectAllMonths} className="text-[10px] text-blue-600 hover:underline">Todos</button><span className="text-[10px] text-slate-300">|</span><button onClick={clearMonths} className="text-[10px] text-slate-400 hover:underline">Limpar</button></div></div><div className="grid grid-cols-3 gap-2">{MONTH_NAMES.map((m, idx) => (<button key={m} onClick={() => toggleMonth(idx)} className={`text-xs py-2 rounded-md transition-colors ${filters.months.includes(idx) ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>{m}</button>))}</div></div>
          <div><label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Ano</label><select value={filters.year} onChange={e => setFilters({...filters, year: parseInt(e.target.value)})} className="w-full p-2 rounded border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm">{[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          <hr className="border-slate-100 dark:border-slate-800"/>
          {activeTab !== 'budget' && activeTab !== 'dashboard' && activeTab !== 'settings' && (<><div className="flex justify-between items-center"><label className="text-xs text-slate-400 font-bold uppercase">Filtros</label><button onClick={() => setFilters(p => ({...p, status: 'all', category: 'all', responsible: 'all'}))} className="text-[10px] text-red-500 hover:underline">Limpar</button></div>{(activeTab === 'transactions' || activeTab === 'cards') && (<div><label className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center gap-1"><Filter size={12}/> Status</label><select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value as any})} className="w-full p-2 rounded border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"><option value="all">Todos</option>{activeTab === 'transactions' ? <><option value="realized">Realizado</option><option value="predicted">Previsto</option></> : <><option value="open">Fatura Aberta</option><option value="closed">Fatura Fechada</option></>}</select></div>)}{activeTab === 'shared' && (<div><label className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center gap-1"><Users size={12}/> Responsável</label><select value={filters.responsible} onChange={e => setFilters({...filters, responsible: e.target.value})} className="w-full p-2 rounded border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"><option value="all">Todos</option><option value="me">Eu</option><option value="partner">Parceiro(a)</option></select></div>)}<div><label className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center gap-1"><TagIcon size={12}/> Categoria</label><select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="w-full p-2 rounded border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white text-sm"><option value="all">Todas</option>{tags.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</select></div></>)}
      </div>
  );

  if (isAuthenticated && isLoadingData) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 flex-col gap-4"><Loader2 className="animate-spin text-blue-600 w-10 h-10"/><span className="text-slate-500">Sincronizando dados...</span></div>;
  if (!isAuthenticated) return <Login onLogin={() => {}} />;

  return (
    <div className="flex flex-col min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
      {isSaving && <div className="fixed top-4 right-4 z-[100] bg-blue-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2 animate-pulse shadow-lg"><Loader2 size={12} className="animate-spin"/> Salvando...</div>}
      {saveError && <div className="fixed top-4 right-4 z-[100] bg-red-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-lg"><CloudOff size={12}/> Erro ao Salvar</div>}
      {notification && (<div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full shadow-lg text-white text-sm font-bold flex items-center gap-2 animate-fadeIn ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{notification.type === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}{notification.message}</div>)}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 overflow-y-auto gap-6">
             <div className="flex items-center gap-3 px-2 mb-2"><div className="bg-blue-600 p-2 rounded-lg"><NotebookPen className="text-white w-5 h-5" /></div><h1 className="text-lg font-bold leading-tight dark:text-white">Financeiro</h1></div>
             <div className="space-y-1">
                {tabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}><tab.icon size={18} /> {tab.label}</button>))}
             </div>
             <hr className="border-slate-100 dark:border-slate-800"/>
             <FiltersContent />
             <div className="mt-auto"><button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"><LogOut size={16}/> Sair</button></div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900 relative lg:overflow-hidden pb-20 lg:pb-0">
             <div className="lg:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-40">
                 <div className="flex items-center gap-2"><div className="bg-blue-600 p-1.5 rounded"><NotebookPen className="text-white w-4 h-4" /></div><span className="font-bold dark:text-white">Financeiro</span></div>
                 <div className="flex items-center gap-3">
                     <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} className="text-slate-500 dark:text-slate-400"><Moon size={18}/></button>
                     <button onClick={() => setIsMobileFilterOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-blue-600 dark:text-blue-400 relative"><Filter size={18}/><span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span></button>
                 </div>
             </div>

             <div className="flex-1 lg:overflow-y-auto p-4 lg:p-6">
                {activeTab === 'dashboard' && <Dashboard transactions={transactions} year={filters.year} allTransactions={transactions} accounts={accounts} cardTransactions={cardTransactions} cardConfigs={cardConfigs} sharedAccounts={sharedAccounts} filters={filters} setFilters={setFilters} enabledModules={enabledModules} tags={tags} budgetTargets={budgetTargets}/>}
                {activeTab === 'budget' && <BudgetFlow accounts={accounts} cardConfigs={cardConfigs} sharedAccounts={sharedAccounts} tags={tags} transactions={transactions} cardTransactions={cardTransactions} budgetTargets={budgetTargets} onUpdateTarget={handleUpdateTarget} year={filters.year} enabledModules={enabledModules}/>}
                {activeTab === 'transactions' && <Transactions transactions={transactions} displayedTransactions={filteredTransactions} onSave={handleSaveTransaction} onDelete={handleDeleteTransaction} accounts={accounts} tags={tags} onAddTag={handleAddTag} onBulkEdit={handleBulkEditTransactions} onBulkDelete={handleDeleteTransactionsById} onImport={handleImport} onBulkDeleteByDate={() => {}} activeFilterAccount={filters.accountId} onFilterAccountChange={(id) => setFilters({...filters, accountId: id})} onBatchSave={handleBatchSaveTransactions}/>}
                {activeTab === 'cards' && <Cards accounts={accounts} cardTransactions={cardTransactions} setCardTransactions={setCardTransactions} cardConfigs={cardConfigs} tags={tags} onAddTag={handleAddTag} onLaunchInvoice={handleLaunchInvoice} currentFilterYear={filters.year} currentFilterMonths={filters.months} onBulkDelete={handleDeleteCardTransactionsById} onBulkEdit={handleBulkEditCardTransactions} onImport={handleImportCard} sharedAccounts={sharedAccounts} sharingModes={sharingModes} onLaunchSharedInvoice={handleLaunchSharedInvoice} globalFilters={filters} onBatchSave={handleBatchSaveCardTransactions}/>}
                {activeTab === 'shared' && <SharedFinances transactions={transactions} setTransactions={setTransactions} cardTransactions={cardTransactions} cardConfigs={cardConfigs} sharingModes={sharingModes} sharedAccounts={sharedAccounts} accounts={accounts} year={filters.year} months={filters.months} onLaunchSettlement={handleLaunchSettlement} onBulkEdit={handleBulkEditTransactions} onBulkDelete={handleDeleteTransactionsById} tags={tags} onAddTag={handleAddTag} globalFilters={filters} onBatchSave={handleBatchSaveTransactions}/>}
                {activeTab === 'settings' && <Settings 
                    accounts={accounts} 
                    setAccounts={handleSaveItem(getCollectionName('Accounts'))} 
                    onHardDeleteAccount={hardDeleteAccount} 
                    tags={tags} 
                    setTags={handleSaveItem(getCollectionName('Tags'))} 
                    onDeleteTag={handleDeleteTag} 
                    cardConfigs={cardConfigs} 
                    setCardConfigs={handleSaveItem(getCollectionName('CardConfigs'))} 
                    onHardDeleteCard={hardDeleteCard} 
                    sharedAccounts={sharedAccounts} 
                    setSharedAccounts={handleSaveItem(getCollectionName('SharedAccounts'))} 
                    hardDeleteSharedAccount={hardDeleteShared} 
                    sharingModes={sharingModes} 
                    setSharingModes={handleSaveItem(getCollectionName('SharingModes'))} 
                    hardDeleteMode={hardDeleteMode} 
                    sharingRules={sharingRules} 
                    setSharingRules={() => {}} 
                    partners={partners} 
                    setPartners={() => {}} 
                    onDeletePartner={() => {}} 
                    onConfirmImport={() => {}} 
                    onBulkDelete={() => 0} 
                    onToggleArchiveAccount={async (id) => { const acc = accounts.find(a=>a.id===id); if(acc) await saveData(user!.id, getCollectionName('Accounts'), {...acc, archived: !acc.archived}); }} 
                    onToggleArchiveCard={async (id) => { const c = cardConfigs.find(x=>x.id===id); if(c) await saveData(user!.id, getCollectionName('CardConfigs'), {...c, archived: !c.archived}); }} 
                    onToggleArchiveShared={async (id) => { const s = sharedAccounts.find(x=>x.id===id); if(s) await saveData(user!.id, getCollectionName('SharedAccounts'), {...s, archived: !s.archived}); }} 
                    enabledModules={enabledModules} 
                    setEnabledModules={setEnabledModules} 
                    onSavePreferences={handleSavePreferences}
                />}
             </div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 z-50 px-2 pb-safe">
          {tabs.slice(0, 5).map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === tab.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}><tab.icon size={20} className={activeTab === tab.id ? 'fill-current opacity-20' : ''} /><span className="text-[10px] font-medium">{tab.label}</span></button>))}
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}><SettingsIcon size={20}/><span className="text-[10px]">Ajustes</span></button>
      </nav>

      {isMobileFilterOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex justify-end" onClick={() => setIsMobileFilterOpen(false)}>
              <div className="w-80 h-full bg-white dark:bg-slate-900 p-6 overflow-y-auto shadow-2xl animate-slideLeft" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg dark:text-white">Filtros</h3><button onClick={() => setIsMobileFilterOpen(false)}><X/></button></div>
                  <FiltersContent />
              </div>
          </div>
      )}
    </div>
  );
}