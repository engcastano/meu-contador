import React, { useState } from 'react';
import { CardConfig, Account, Tag, SharedAccount, SharingMode } from '../types';
import { Trash2, Plus, Users, CreditCard, Landmark, Tag as TagIcon, X, Edit2, Save, Archive, ArchiveRestore, Percent, Layout, CheckSquare, Square, BarChart3, Loader2 } from 'lucide-react';
import { generateUUID } from '../utils';

interface SettingsProps {
  accounts: Account[]; setAccounts: (item: any) => void; // Changed to generic handler
  tags: Tag[]; setTags: (item: any) => void;
  onDeleteTag: (name: string) => void;
  cardConfigs: CardConfig[]; setCardConfigs: (item: any) => void;
  sharedAccounts: SharedAccount[]; setSharedAccounts: (item: any) => void;
  hardDeleteSharedAccount: (id: string) => void;
  sharingModes: SharingMode[]; setSharingModes: (item: any) => void;
  hardDeleteMode: (id: string) => void;
  onConfirmImport: (target: string, data: any[]) => void;
  onBulkDelete: (start: string, end: string, target: string) => number;
  onHardDeleteAccount: (id: string) => void;
  onToggleArchiveAccount: (id: string) => void;
  onHardDeleteCard: (id: string) => void;
  onToggleArchiveCard: (id: string) => void;
  onToggleArchiveShared: (id: string) => void;
  enabledModules: { cards: boolean; shared: boolean; budget: boolean; };
  setEnabledModules: React.Dispatch<React.SetStateAction<{ cards: boolean; shared: boolean; budget: boolean; }>>;
  onSavePreferences: () => void;
  sharingRules?: any; setSharingRules?: any; partners?: any; setPartners?: any; onDeletePartner?: any;
}

export const Settings: React.FC<SettingsProps> = ({ 
  accounts, setAccounts, tags, setTags, onDeleteTag, cardConfigs, setCardConfigs, 
  sharedAccounts, setSharedAccounts, hardDeleteSharedAccount,
  sharingModes, setSharingModes, hardDeleteMode,
  onHardDeleteAccount, onHardDeleteCard, onToggleArchiveAccount, onToggleArchiveCard, onToggleArchiveShared,
  enabledModules, setEnabledModules, onSavePreferences
}) => {

  const [modalType, setModalType] = useState<'account' | 'card' | 'sharedAccount' | 'mode' | 'tag' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null); 
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const openNew = (type: 'account' | 'card' | 'sharedAccount' | 'mode' | 'tag') => {
    setModalType(type);
    if (type === 'account') setEditingItem({ id: generateUUID(), name: '', bank: '', agency: '', number: '', pixKey: '', isNew: true });
    if (type === 'card') setEditingItem({ id: generateUUID(), name: '', closingDay: 1, dueDay: 10, limit: 0, cardNumber: '', expiry: '', cvv: '', isShared: false, linkedSharedAccountId: '', isNew: true });
    if (type === 'sharedAccount') setEditingItem({ id: generateUUID(), name: '', partnerName: '', partnerPix: '', partnerBank: '', partnerAgency: '', partnerAccount: '', isNew: true });
    if (type === 'mode') setEditingItem({ id: generateUUID(), name: '', myPercentage: 50, partnerPercentage: 50, color: '#3b82f6', isNew: true });
    if (type === 'tag') setEditingItem({ id: generateUUID(), name: '', color: '#3b82f6', isNew: true });
  };

  const openEdit = (item: any, type: any) => { setModalType(type); setEditingItem({ ...item, isNew: false }); };
  const closeModal = () => { setModalType(null); setEditingItem(null); };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem.name) return alert('Nome obrigatório');
      const itemToSave = { ...editingItem };
      delete itemToSave.isNew;

      // Chama os handlers passados pelo App (que salvam no Firestore)
      if (modalType === 'account') setAccounts(itemToSave);
      if (modalType === 'card') setCardConfigs(itemToSave);
      if (modalType === 'sharedAccount') setSharedAccounts(itemToSave);
      if (modalType === 'mode') setSharingModes(itemToSave);
      if (modalType === 'tag') setTags(itemToSave);

      closeModal();
  };

  const handleSaveModules = () => { setIsSavingPrefs(true); onSavePreferences(); setTimeout(() => setIsSavingPrefs(false), 1000); };

  const toggleModule = (module: 'cards' | 'shared' | 'budget') => {
      const newState = !enabledModules[module];
      setEnabledModules(p => ({...p, [module]: newState}));
      if (newState) {
          if (module === 'cards' && cardConfigs.length === 0) setTimeout(() => openNew('card'), 200);
          if (module === 'shared' && sharedAccounts.length === 0) setTimeout(() => openNew('sharedAccount'), 200);
      }
  };

  const getModalTitle = () => {
      const prefix = editingItem?.isNew ? 'Nova' : 'Editar';
      const prefixM = editingItem?.isNew ? 'Novo' : 'Editar';
      switch(modalType) {
          case 'account': return `${prefix} Conta`;
          case 'card': return `${prefixM} Cartão`;
          case 'sharedAccount': return `${prefix} Conta Compartilhada`;
          case 'mode': return `${prefixM} Modo de Divisão`;
          case 'tag': return `${prefix} Categoria`;
          default: return 'Editar';
      }
  };

  return (
    <div className="space-y-10 pb-20 animate-fadeIn max-w-5xl mx-auto">
      <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><Layout className="text-slate-500"/> Módulos do Sistema</h3><button onClick={handleSaveModules} disabled={isSavingPrefs} className="bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors disabled:opacity-50">{isSavingPrefs ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Salvar Preferências</button></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 ${enabledModules.cards ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-slate-200 opacity-60'}`} onClick={() => toggleModule('cards')}><div className={`p-2 rounded-full ${enabledModules.cards ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}><CreditCard size={20}/></div><div><div className="font-bold dark:text-white">Cartões de Crédito</div><div className="text-xs text-slate-500">{enabledModules.cards ? 'Habilitado' : 'Desabilitado'}</div></div>{enabledModules.cards && <CheckSquare className="ml-auto text-blue-500" size={20}/>}</div>
            <div className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 ${enabledModules.shared ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' : 'bg-slate-50 border-slate-200 opacity-60'}`} onClick={() => toggleModule('shared')}><div className={`p-2 rounded-full ${enabledModules.shared ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-500'}`}><Users size={20}/></div><div><div className="font-bold dark:text-white">Contas Compartilhadas</div><div className="text-xs text-slate-500">{enabledModules.shared ? 'Habilitado' : 'Desabilitado'}</div></div>{enabledModules.shared && <CheckSquare className="ml-auto text-purple-500" size={20}/>}</div>
            <div className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 ${enabledModules.budget ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 opacity-60'}`} onClick={() => toggleModule('budget')}><div className={`p-2 rounded-full ${enabledModules.budget ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}><BarChart3 size={20}/></div><div><div className="font-bold dark:text-white">Fluxo Orçamentário</div><div className="text-xs text-slate-500">{enabledModules.budget ? 'Ativo' : 'Inativo'}</div></div>{enabledModules.budget && <CheckSquare className="ml-auto text-emerald-500" size={20}/>}</div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><Landmark className="text-emerald-500"/> Contas Bancárias</h3><button onClick={() => openNew('account')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-emerald-700"><Plus size={16}/> Adicionar</button></div>
        <div className="space-y-3">{accounts.map(acc => (<div key={acc.id} className={`p-4 border rounded-lg flex justify-between items-center transition-colors ${acc.archived ? 'bg-slate-100 opacity-60 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">{acc.name.substring(0,2).toUpperCase()}</div><div><div className="font-bold dark:text-white">{acc.name} {acc.archived && '(Arquivado)'}</div><div className="text-xs text-slate-500">{acc.bank} | Ag: {acc.agency} CC: {acc.number}</div></div></div><div className="flex gap-2"><button onClick={() => openEdit(acc, 'account')} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button><button onClick={(e) => { e.stopPropagation(); onToggleArchiveAccount(acc.id); }} className="p-2 text-slate-500 hover:bg-slate-200 rounded">{acc.archived ? <ArchiveRestore size={16}/> : <Archive size={16}/>}</button><button onClick={(e) => { e.stopPropagation(); onHardDeleteAccount(acc.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button></div></div>))}</div>
      </section>

      {enabledModules.cards && (
      <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><CreditCard className="text-blue-500"/> Cartões de Crédito</h3><button onClick={() => openNew('card')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"><Plus size={16}/> Adicionar</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{cardConfigs.map(card => (<div key={card.id} className={`p-4 border rounded-xl relative bg-gradient-to-br ${card.archived ? 'from-slate-100 to-slate-200 opacity-60 grayscale' : 'from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800'}`}><div className="flex justify-between items-start mb-4"><span className="font-bold text-lg dark:text-white">{card.name}</span><CreditCard className="text-slate-400"/></div><div className="text-sm text-slate-600 dark:text-slate-300 space-y-1 mb-4"><p>Final: •••• {card.cardNumber?.slice(-4) || '????'}</p><div className="flex justify-between text-xs opacity-80"><span>Fecha dia: <strong>{card.closingDay}</strong></span><span>Vence dia: <strong>{card.dueDay}</strong></span></div></div><div className="flex justify-end gap-2 border-t pt-2 border-slate-200 dark:border-slate-600"><button onClick={() => openEdit(card, 'card')} className="text-xs flex items-center gap-1 text-blue-600 font-bold px-2 py-1 hover:bg-blue-50 rounded">EDITAR</button><button onClick={(e) => { e.stopPropagation(); onToggleArchiveCard(card.id); }} className="text-xs flex items-center gap-1 text-slate-600 font-bold px-2 py-1 hover:bg-slate-200 rounded">{card.archived ? 'ATIVAR' : 'ARQUIVAR'}</button><button onClick={(e) => { e.stopPropagation(); onHardDeleteCard(card.id); }} className="text-xs flex items-center gap-1 text-red-600 font-bold px-2 py-1 hover:bg-red-50 rounded">EXCLUIR</button></div></div>))}</div>
      </section>
      )}

      {enabledModules.shared && (
      <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><Users className="text-indigo-500"/> Contas Compartilhadas</h3><button onClick={() => openNew('sharedAccount')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-700"><Plus size={16}/> Adicionar</button></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{sharedAccounts.map(acc => (<div key={acc.id} className={`p-4 border rounded-lg ${acc.archived ? 'bg-slate-100 opacity-60' : 'bg-slate-50 dark:bg-slate-700/50'} dark:border-slate-600`}><div className="flex justify-between items-start mb-2"><div className="font-bold dark:text-white text-lg">{acc.name}</div><div className="flex gap-2"><button onClick={() => openEdit(acc, 'sharedAccount')} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit2 size={16}/></button><button onClick={(e) => { e.stopPropagation(); onToggleArchiveShared(acc.id); }} className="p-1 text-slate-500 hover:bg-slate-200 rounded"><Archive size={16}/></button><button onClick={(e) => { e.stopPropagation(); hardDeleteSharedAccount(acc.id); }} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 size={16}/></button></div></div><div className="text-sm text-slate-600 dark:text-slate-300"><p>Parceiro: <strong>{acc.partnerName}</strong></p><p className="text-xs mt-1 opacity-80">Pix: {acc.partnerPix || '-'}</p><p className="text-xs opacity-80">{acc.partnerBank} | Ag: {acc.partnerAgency} CC: {acc.partnerAccount}</p></div></div>))}</div>
      </section>
      )}

      {enabledModules.shared && (
      <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><Percent className="text-purple-500"/> Modos de Divisão</h3><button onClick={() => openNew('mode')} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm">Adicionar</button></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{sharingModes.map(mode => (<div key={mode.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-700/50 relative"><div className="flex justify-between items-center mb-2"><span className="font-bold dark:text-white">{mode.name}</span><div className="flex gap-1"><button onClick={() => openEdit(mode, 'mode')} className="text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button><button onClick={(e) => {e.stopPropagation(); hardDeleteMode(mode.id)}} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button></div></div><div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex mb-1 border border-slate-300 relative"><div className="h-full flex items-center justify-center text-[8px] font-bold text-white" style={{width: `${mode.myPercentage}%`, backgroundColor: mode.color || '#3b82f6'}}>EU {mode.myPercentage}%</div><div className="h-full flex items-center justify-center text-[8px] font-bold text-slate-600 bg-slate-300 flex-1">PARCEIRO {mode.partnerPercentage}%</div></div></div>))}</div>
      </section>
      )}

      <section className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold dark:text-white flex items-center gap-2"><TagIcon className="text-pink-500"/> Categorias</h3><button onClick={() => openNew('tag')} className="bg-pink-600 text-white px-3 py-1.5 rounded-lg text-sm">Adicionar</button></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{tags.map(tag => (<div key={tag.name} className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: tag.color}}></div><span className="font-bold text-sm dark:text-white">{tag.name}</span></div><div className="flex gap-1"><button onClick={() => openEdit(tag, 'tag')} className="text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button><button onClick={(e) => {e.stopPropagation(); onDeleteTag(tag.name)}} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button></div></div>))}</div>
      </section>

      {modalType && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <h3 className="font-bold text-lg dark:text-white capitalize">{getModalTitle()}</h3>
                    <button onClick={closeModal}><X className="text-slate-400"/></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="settingsForm" onSubmit={handleSubmit} className="space-y-4">
                        {modalType === 'account' && <><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Nome da Conta</label><input required className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Banco</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.bank} onChange={e => setEditingItem({...editingItem, bank: e.target.value})}/></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Agência</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.agency} onChange={e => setEditingItem({...editingItem, agency: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Conta</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.number} onChange={e => setEditingItem({...editingItem, number: e.target.value})}/></div></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Chave Pix</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.pixKey} onChange={e => setEditingItem({...editingItem, pixKey: e.target.value})}/></div></>}
                        {modalType === 'card' && <><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Apelido do Cartão</label><input required className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})}/></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Fecha Dia</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.closingDay} onChange={e => setEditingItem({...editingItem, closingDay: parseInt(e.target.value)})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Vence Dia</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.dueDay} onChange={e => setEditingItem({...editingItem, dueDay: parseInt(e.target.value)})}/></div></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Limite (R$)</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.limit} onChange={e => setEditingItem({...editingItem, limit: parseFloat(e.target.value)})}/></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Final (4 díg)</label><input maxLength={4} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.cardNumber} onChange={e => setEditingItem({...editingItem, cardNumber: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">CVC</label><input maxLength={3} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.cvv} onChange={e => setEditingItem({...editingItem, cvv: e.target.value})}/></div></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Validade</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.expiry} onChange={e => setEditingItem({...editingItem, expiry: e.target.value})}/></div>{enabledModules.shared && <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded mt-2"><div className="flex gap-2"><input type="checkbox" checked={editingItem.isShared} onChange={e => setEditingItem({...editingItem, isShared: e.target.checked})}/><label className="text-sm font-bold text-indigo-800 dark:text-indigo-200">Cartão Compartilhado?</label></div>{editingItem.isShared && <select value={editingItem.linkedSharedAccountId || ''} onChange={e => setEditingItem({...editingItem, linkedSharedAccountId: e.target.value})} className="w-full p-2 border rounded mt-1 dark:bg-slate-800 dark:text-white"><option value="">Vincular a Conta...</option>{sharedAccounts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}</div>}</>}
                        {modalType === 'sharedAccount' && <><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Nome do Grupo</label><input required className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Nome do Parceiro(a)</label><input required className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.partnerName} onChange={e => setEditingItem({...editingItem, partnerName: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Chave Pix Parceiro</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.partnerPix} onChange={e => setEditingItem({...editingItem, partnerPix: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Banco Parceiro</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.partnerBank} onChange={e => setEditingItem({...editingItem, partnerBank: e.target.value})}/></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Agência</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.partnerAgency} onChange={e => setEditingItem({...editingItem, partnerAgency: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Conta</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.partnerAccount} onChange={e => setEditingItem({...editingItem, partnerAccount: e.target.value})}/></div></div></>}
                        {modalType === 'mode' && <><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Nome da Regra</label><input required className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Cor</label><input type="color" className="w-full h-10 p-1 border rounded cursor-pointer" value={editingItem.color} onChange={e => setEditingItem({...editingItem, color: e.target.value})}/></div><div className="bg-slate-100 dark:bg-slate-700 p-4 rounded mt-2"><label className="text-xs font-bold uppercase text-slate-500 mb-3 block">Regra de Divisão (%)</label><div className="flex justify-between text-xs font-bold mb-1"><span className="text-blue-600">EU: {editingItem.myPercentage}%</span><span className="text-slate-600">PARCEIRO: {editingItem.partnerPercentage}%</span></div><input type="range" min="0" max="100" step="5" value={editingItem.partnerPercentage !== undefined ? editingItem.partnerPercentage : 50} onChange={e => { const val = parseInt(e.target.value); setEditingItem({...editingItem, partnerPercentage: val, myPercentage: 100 - val}); }} className="w-full mb-2 cursor-pointer accent-blue-600"/></div></>}
                        {modalType === 'tag' && <><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Nome da Categoria</label><input required className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})}/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Cor</label><input type="color" className="w-full h-10 p-1 border rounded cursor-pointer" value={editingItem.color} onChange={e => setEditingItem({...editingItem, color: e.target.value})}/></div></>}
                    </form>
                </div>
                <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex gap-3 shrink-0">
                    <button onClick={closeModal} className="flex-1 py-3 border rounded-xl font-bold text-slate-600">Cancelar</button>
                    <button type="submit" form="settingsForm" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Salvar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};