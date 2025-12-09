import React, { useState, useEffect } from 'react';
import { 
  BusinessTransaction, BusinessAccount, BusinessCategory, BusinessPartner, Project, Client, ServiceInvoice 
} from '../../businessTypes'; 
import { parseCurrency, generateUUID } from '../../utils';
import { 
  X, TrendingDown, TrendingUp, Landmark, Briefcase, Building, Users, Save, FileText, Link 
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: any) => void;
  initialData?: any;
  isBulk?: boolean;
  accounts: BusinessAccount[];
  categories: BusinessCategory[];
  projects: Project[];
  clients: Client[];
  partners: BusinessPartner[];
  invoices: ServiceInvoice[];
}

const MIXED = '__MIXED__';

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen, onClose, onSave, initialData, isBulk = false,
  accounts, categories, projects, clients, partners, invoices
}) => {
  const [formData, setFormData] = useState<any>({
    description: '', value: 0, date: '', type: 'expense', status: 'pending', accountId: '', categoryId: '', invoiceId: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        const defaultAcc = accounts.find(a => a.type === 'checking') || accounts[0];
        setFormData({
          id: generateUUID(),
          description: '', value: 0, date: new Date().toISOString().split('T')[0],
          type: 'expense', status: 'pending', 
          accountId: defaultAcc?.id || '', 
          categoryId: categories[0]?.id || '',
          invoiceId: ''
        });
      }
    }
  }, [isOpen, initialData, accounts, categories]);

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        setFormData(prev => ({
            ...prev,
            invoiceId: invoiceId,
            clientId: invoice.clientId || prev.clientId,
            projectId: invoice.projectId || prev.projectId,
            // Só muda valor/descrição se não for bulk (para não sobrescrever valores mistos sem querer)
            value: isBulk ? prev.value : (prev.value || invoice.netValue || invoice.amount), 
            description: isBulk ? prev.description : (prev.description || `Recebimento NF ${invoice.invoiceNumber || invoice.number} - ${invoice.clientName}`),
            type: 'income',
            status: invoice.status === 'paid' ? 'paid' : 'pending',
            date: invoice.paymentDate || invoice.dueDate || prev.date
        }));
    } else {
        setFormData(prev => ({ ...prev, invoiceId: '' }));
    }
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    setFormData(prev => ({
        ...prev, 
        projectId, 
        clientId: project?.clientId || prev.clientId
    }));
  };

  const handleSubmit = () => {
    if (!isBulk && (!formData.description || !formData.value || !formData.accountId)) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    const acc = accounts.find(a => a.id === formData.accountId);
    const cat = categories.find(c => c.id === formData.categoryId);
    
    let finalDatePaid = formData.datePaid;
    if (formData.status === 'paid' && !finalDatePaid && formData.date !== MIXED) {
        finalDatePaid = formData.date;
    }

    const payload = { 
        ...formData, 
        datePaid: finalDatePaid,
        accountName: acc?.name || '', 
        categoryName: cat?.name || ''   
    };

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh]">
          <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                  {isBulk ? 'Edição em Massa' : (initialData ? 'Editar Lançamento' : 'Novo Lançamento')}
              </h3>
              <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isBulk && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm mb-4">
                      <strong>Modo em Massa:</strong> Campos marcados com <em>&lt;vários&gt;</em> têm valores diferentes nos itens selecionados. Alterar um campo aplicará o novo valor a <strong>todos</strong> os itens.
                  </div>
              )}

              {/* Tipo de Operação */}
              <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg flex gap-1">
                  <button onClick={() => setFormData({...formData, type: 'expense'})} className={`flex-1 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 ${formData.type === 'expense' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-sm' : formData.type === MIXED ? 'text-slate-400' : 'text-slate-500'}`}><TrendingDown size={16}/> {formData.type === MIXED ? '<vários>' : 'Despesa'}</button>
                  <button onClick={() => setFormData({...formData, type: 'income'})} className={`flex-1 py-2 rounded-md font-bold text-sm flex items-center justify-center gap-2 ${formData.type === 'income' ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm' : formData.type === MIXED ? 'text-slate-400' : 'text-slate-500'}`}><TrendingUp size={16}/> {formData.type === MIXED ? '<vários>' : 'Receita'}</button>
              </div>

              {/* Valor */}
              <div>
                  <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Valor (R$)</label>
                  <input 
                      type={formData.value === MIXED ? "text" : "number"}
                      className="w-full p-4 text-2xl font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      value={formData.value === MIXED ? "" : formData.value}
                      onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})}
                      placeholder={formData.value === MIXED ? "<vários>" : "0,00"}
                  />
              </div>

              {/* Descrição */}
              <div>
                  <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Descrição</label>
                  <input 
                      className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white outline-none"
                      value={formData.description === MIXED ? "" : formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder={formData.description === MIXED ? "<vários>" : "Ex: Pagamento Fornecedor XYZ"}
                  />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Data de Competência</label>
                      <input 
                        type={formData.date === MIXED ? "text" : "date"}
                        onFocus={(e) => (e.target.type = "date")}
                        className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" 
                        value={formData.date === MIXED ? "" : formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        placeholder={formData.date === MIXED ? "<vários>" : ""}
                      />
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Data de Pagamento</label>
                      <input 
                        type={formData.datePaid === MIXED ? "text" : "date"} 
                        onFocus={(e) => (e.target.type = "date")}
                        className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" 
                        value={formData.datePaid === MIXED ? "" : (formData.datePaid || formData.date)} 
                        onChange={e => setFormData({...formData, datePaid: e.target.value})} 
                        placeholder={formData.datePaid === MIXED ? "<vários>" : ""}
                      />
                  </div>
              </div>

              {/* Categoria e Conta */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Categoria</label>
                      <select className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" value={formData.categoryId === MIXED ? "" : formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                          {formData.categoryId === MIXED && <option value="">&lt;vários&gt;</option>}
                          <option value="">Selecione...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Conta Bancária</label>
                      <select className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white" value={formData.accountId === MIXED ? "" : formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                          {formData.accountId === MIXED && <option value="">&lt;vários&gt;</option>}
                          <option value="">Selecione...</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                  </div>
              </div>

              {/* --- VÍNCULOS INTELIGENTES --- */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                  <h4 className="font-bold text-sm text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2"><Link size={16}/> Vínculos (Opcional)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                      {/* NOTA FISCAL */}
                      <div className="col-span-2">
                          <label className="text-[10px] font-bold uppercase text-indigo-600/70 dark:text-indigo-400 mb-1 block flex items-center gap-1"><FileText size={12}/> Vincular Nota Fiscal</label>
                          <select 
                              className="w-full p-2 border border-indigo-200 dark:border-indigo-800 rounded bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              value={formData.invoiceId === MIXED ? "" : formData.invoiceId || ''}
                              onChange={e => handleInvoiceChange(e.target.value)}
                          >
                              {formData.invoiceId === MIXED && <option value="">&lt;vários&gt;</option>}
                              <option value="">-- Nenhuma --</option>
                              {invoices
                                  .filter(inv => inv.status !== 'cancelled')
                                  .map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                      NF {inv.invoiceNumber || inv.number} - {inv.clientName} ({parseCurrency(inv.netValue || inv.amount)})
                                  </option>
                              ))}
                          </select>
                      </div>

                      {/* PROJETO */}
                      <div>
                          <label className="text-[10px] font-bold uppercase text-indigo-600/70 dark:text-indigo-400 mb-1 block flex items-center gap-1"><Briefcase size={12}/> Projeto</label>
                          <select 
                              className="w-full p-2 border border-indigo-200 dark:border-indigo-800 rounded bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              value={formData.projectId === MIXED ? "" : formData.projectId || ''}
                              onChange={e => handleProjectChange(e.target.value)}
                          >
                              {formData.projectId === MIXED && <option value="">&lt;vários&gt;</option>}
                              <option value="">-- Nenhum --</option>
                              {projects.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                          </select>
                      </div>

                      {/* CLIENTE */}
                      <div>
                          <label className="text-[10px] font-bold uppercase text-indigo-600/70 dark:text-indigo-400 mb-1 block flex items-center gap-1"><Building size={12}/> Cliente / Fonte</label>
                          <select 
                              className="w-full p-2 border border-indigo-200 dark:border-indigo-800 rounded bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              value={formData.clientId === MIXED ? "" : formData.clientId || ''}
                              onChange={e => setFormData({...formData, clientId: e.target.value})}
                          >
                              {formData.clientId === MIXED && <option value="">&lt;vários&gt;</option>}
                              <option value="">-- Nenhum --</option>
                              {clients.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                      </div>

                      {/* COLABORADOR */}
                      <div className="col-span-2">
                          <label className="text-[10px] font-bold uppercase text-indigo-600/70 dark:text-indigo-400 mb-1 block flex items-center gap-1"><Users size={12}/> Colaborador / Sócio</label>
                          <select 
                              className="w-full p-2 border border-indigo-200 dark:border-indigo-800 rounded bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                              value={formData.partnerId === MIXED ? "" : formData.partnerId || ''}
                              onChange={e => setFormData({...formData, partnerId: e.target.value})}
                          >
                              {formData.partnerId === MIXED && <option value="">&lt;vários&gt;</option>}
                              <option value="">-- Nenhum --</option>
                              {partners.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} ({p.role === 'partner' ? 'Sócio' : 'Colab.'})</option>
                              ))}
                          </select>
                      </div>
                  </div>
              </div>

              <div className="flex items-center gap-2">
                  <select 
                      className="p-2 border rounded dark:bg-slate-700 dark:text-white text-sm font-medium"
                      value={formData.status === MIXED ? "" : formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                      {formData.status === MIXED && <option value="">&lt;vários&gt;</option>}
                      <option value="pending">Pendente</option>
                      <option value="paid">Efetivado (Pago/Recebido)</option>
                  </select>
                  <label className="text-sm font-medium dark:text-white select-none">Status</label>
              </div>
          </div>

          <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl flex justify-end gap-3">
              <button onClick={onClose} className="px-6 py-3 border rounded-xl font-bold text-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={handleSubmit} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><Save size={18}/> Salvar {isBulk ? 'Alterações' : ''}</button>
          </div>
      </div>
    </div>
  );
};