import React, { useState } from 'react';
import { BusinessAccount, AccountType, BusinessTransaction } from '../../businessTypes';
import { generateUUID, parseCurrency } from '../../utils';
import { Plus, Landmark, CreditCard, PieChart, Edit2, Trash2, ArrowRightLeft, X, Wallet, TrendingUp } from 'lucide-react';

interface AccountingAccountsProps {
  accounts: BusinessAccount[];
  transactions: BusinessTransaction[]; // Recebe transações para cálculo em tempo real
  onAddAccount: (acc: Omit<BusinessAccount, 'id'>) => void;
  onUpdateAccount: (id: string, acc: Partial<BusinessAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onAddTransaction: (tx: any) => void;
}

export const AccountingAccounts: React.FC<AccountingAccountsProps> = ({
  accounts, transactions, onAddAccount, onUpdateAccount, onDeleteAccount, onAddTransaction
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<AccountType>('checking');
  
  const [formData, setFormData] = useState<Partial<BusinessAccount>>({});
  const [transferForm, setTransferForm] = useState({
      type: 'transfer' as 'transfer' | 'apply' | 'redeem',
      from: '', to: '', value: 0, date: new Date().toISOString().split('T')[0]
  });

  // --- CÁLCULO DE SALDO REAL (IGNORA PENDENTES) ---
  const getCalculatedBalance = (accountId: string, initialBalance: number = 0) => {
      let balance = Number(initialBalance) || 0;
      
      transactions.forEach(t => {
          if (t.accountId !== accountId) return;
          
          // REGRA DE OURO: Apenas transações PAGAS afetam o saldo atual
          if (t.status !== 'paid') return; 

          const val = Math.abs(t.value);
          if (t.type === 'income') balance += val;
          else if (t.type === 'expense') balance -= val;
      });

      return balance;
  };

  const getCardBalance = (cardId: string) => {
      let invoiceTotal = 0;
      transactions.forEach(t => {
          if (t.accountId !== cardId) return;
          
          // No cartão, consideramos compras já efetivadas (pagas pelo cartão)
          if (t.status === 'paid') {
             if (t.type === 'expense') invoiceTotal += Math.abs(t.value);
             else if (t.type === 'income') invoiceTotal -= Math.abs(t.value); // Estorno
          }
      });
      return -invoiceTotal; // Exibe como negativo (dívida)
  };

  const handleOpen = (type: AccountType, acc?: BusinessAccount) => {
    setFormType(type);
    if (acc) {
      setEditingId(acc.id);
      setFormData(acc);
    } else {
      setEditingId(null);
      setFormData({ 
        name: '', type, initialBalance: 0, 
        bank: '', agency: '', accountNumber: '', 
        limit: 0, closingDay: 1, dueDay: 10, yieldRate: '', liquidity: 'daily' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return alert("Nome obrigatório");
    const payload = { ...formData, type: formType } as any;
    if (editingId) onUpdateAccount(editingId, payload);
    else onAddAccount({ ...payload, id: generateUUID(), currentBalance: formData.initialBalance || 0 });
    setIsModalOpen(false);
  };

  const handleTransfer = () => {
      if(!transferForm.from || !transferForm.to || !transferForm.value) return alert('Preencha tudo');
      const fromAcc = accounts.find(a => a.id === transferForm.from);
      const toAcc = accounts.find(a => a.id === transferForm.to);
      const desc = transferForm.type === 'apply' ? 'Aplicação' : transferForm.type === 'redeem' ? 'Resgate' : 'Transferência';
      
      // Cria transações já como PAGAS para afetar o saldo imediatamente
      onAddTransaction({ 
          id: generateUUID(), accountId: transferForm.from, accountName: fromAcc?.name, 
          description: `SAÍDA: ${desc}`, value: -transferForm.value, 
          date: transferForm.date, datePaid: transferForm.date, 
          type: 'expense', status: 'paid', categoryName: 'Transferência', categoryId: 'transfer_system' 
      });
      
      onAddTransaction({ 
          id: generateUUID(), accountId: transferForm.to, accountName: toAcc?.name, 
          description: `ENTRADA: ${desc}`, value: transferForm.value, 
          date: transferForm.date, datePaid: transferForm.date, 
          type: 'income', status: 'paid', categoryName: 'Transferência', categoryId: 'transfer_system' 
      });
      
      setIsTransferModalOpen(false);
      alert('Transferência realizada!');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
        {/* Contas Correntes */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Landmark size={20} className="text-emerald-500"/> Contas Bancárias</h3>
                <button onClick={() => handleOpen('checking')} className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><Plus size={14}/> Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accounts.filter(a => a.type === 'checking').map(acc => {
                    const realBalance = getCalculatedBalance(acc.id, acc.initialBalance);
                    return (
                        <div key={acc.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group cursor-pointer hover:border-indigo-300 transition-all" onClick={() => handleOpen('checking', acc)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                        {acc.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-800 dark:text-white block">{acc.name}</span>
                                        <span className="text-[10px] text-slate-500 uppercase">{acc.bank}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteAccount(acc.id); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={14}/></button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500">Saldo Atual (Real)</span>
                                    <span className={`font-bold text-lg ${realBalance >= 0 ? 'text-slate-800 dark:text-white' : 'text-red-500'}`}>{parseCurrency(realBalance)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-1">
                                    <span className="text-[10px] text-slate-400">Saldo Inicial</span>
                                    <span className="text-xs font-medium text-slate-500">{parseCurrency(acc.initialBalance || 0)}</span>
                                </div>
                            </div>

                            <div className="text-[10px] text-slate-400 font-mono">
                                Ag: {acc.agency || '-'} • CC: {acc.accountNumber || '-'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Cartões */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><CreditCard size={20} className="text-blue-500"/> Cartões</h3>
                <button onClick={() => handleOpen('credit_card')} className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><Plus size={14}/> Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accounts.filter(a => a.type === 'credit_card').map(acc => {
                    const cardBalance = getCardBalance(acc.id);
                    return (
                        <div key={acc.id} className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => handleOpen('credit_card', acc)}>
                            <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={100}/></div>
                            
                            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-lg">{acc.name}</span>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteAccount(acc.id); }} className="text-white/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                </div>
                                
                                <div>
                                    <div className="text-xs opacity-70 mb-1">Gasto Atual (Fatura)</div>
                                    <div className="text-2xl font-bold">{parseCurrency(Math.abs(cardBalance))}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs opacity-90 border-t border-white/10 pt-3">
                                    <div>
                                        <span className="block opacity-60 text-[10px] uppercase">Limite</span>
                                        <span className="font-medium">{parseCurrency(acc.limit || 0)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block opacity-60 text-[10px] uppercase">Datas</span>
                                        <span>Fecha {acc.closingDay} • Vence {acc.dueDay}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Aplicações */}
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><PieChart size={20} className="text-amber-500"/> Aplicações</h3>
                <button onClick={() => handleOpen('investment')} className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><Plus size={14}/> Adicionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {accounts.filter(a => a.type === 'investment').map(acc => {
                    const investBalance = getCalculatedBalance(acc.id, acc.initialBalance);
                    return (
                        <div key={acc.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group cursor-pointer hover:border-amber-300 transition-all" onClick={() => handleOpen('investment', acc)}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600"><TrendingUp size={18}/></div>
                                    <div>
                                        <span className="font-bold text-slate-800 dark:text-white block">{acc.name}</span>
                                        <span className="text-[10px] text-slate-500">{acc.liquidity === 'daily' ? 'Liquidez Diária' : 'No Vencimento'}</span>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteAccount(acc.id); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                            
                            <div className="mb-4">
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{parseCurrency(investBalance)}</div>
                                <div className="text-xs text-slate-500 mt-1">Rendimento: <strong>{acc.yieldRate || '-'}</strong></div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                <button onClick={(e) => { e.stopPropagation(); setTransferForm({...transferForm, type: 'apply', from: '', to: acc.id}); setIsTransferModalOpen(true); }} className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                                    <Plus size={12}/> Aplicar
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setTransferForm({...transferForm, type: 'redeem', from: acc.id, to: ''}); setIsTransferModalOpen(true); }} className="flex items-center justify-center gap-1 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                                    <ArrowRightLeft size={12}/> Resgatar
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Modais */}
        {isModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold text-lg dark:text-white">{editingId ? 'Editar' : 'Nova'} Conta</h3><button onClick={() => setIsModalOpen(false)}><X className="text-slate-400"/></button></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Nome</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>{formType === 'checking' && <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Banco</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.bank} onChange={e => setFormData({...formData, bank: e.target.value})} /></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Agência</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.agency} onChange={e => setFormData({...formData, agency: e.target.value})} /></div><div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Conta Corrente</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} /></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Saldo Inicial</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value)})} /></div></div>}{formType === 'credit_card' && <div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Dia Fechamento</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.closingDay} onChange={e => setFormData({...formData, closingDay: parseInt(e.target.value)})} /></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Dia Vencimento</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.dueDay} onChange={e => setFormData({...formData, dueDay: parseInt(e.target.value)})} /></div><div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Limite (R$)</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.limit} onChange={e => setFormData({...formData, limit: parseFloat(e.target.value)})} /></div></div>}{formType === 'investment' && <div className="grid grid-cols-2 gap-2"><div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Rentabilidade</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.yieldRate} onChange={e => setFormData({...formData, yieldRate: e.target.value})} placeholder="Ex: 100% do CDI"/></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Liquidez</label><select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.liquidity} onChange={e => setFormData({...formData, liquidity: e.target.value as any})}><option value="daily">Diária</option><option value="maturity">No Vencimento</option></select></div><div><label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Saldo Inicial</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: parseFloat(e.target.value)})} /></div></div>}<button onClick={handleSave} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold mt-2">Salvar</button></div></div>)}
        {isTransferModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold text-lg dark:text-white"><ArrowRightLeft className="inline mr-2" size={18}/> Transferência</h3><button onClick={() => setIsTransferModalOpen(false)}><X className="text-slate-400"/></button></div><select value={transferForm.from} onChange={e => setTransferForm({...transferForm, from: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"><option value="">Origem</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select value={transferForm.to} onChange={e => setTransferForm({...transferForm, to: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"><option value="">Destino</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><input type="number" placeholder="Valor" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={transferForm.value} onChange={e => setTransferForm({...transferForm, value: parseFloat(e.target.value)})}/><input type="date" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={transferForm.date} onChange={e => setTransferForm({...transferForm, date: e.target.value})}/><button onClick={handleTransfer} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Confirmar</button></div></div>)}
    </div>
  );
};