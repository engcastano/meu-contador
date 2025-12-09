import React, { useState, useEffect, useMemo } from 'react';
import { 
  BusinessInvoice, 
  Client, 
  User as UserType 
} from '../types';
import { 
  parseCurrency, 
  generateUUID, 
  parseDate 
} from '../utils';
import { 
  Plus, Users, Edit2, Trash2, Search, X, 
  FileText, TrendingUp, TrendingDown, DollarSign, 
  Building2, Calendar, CheckCircle, AlertCircle, Save,
  Calculator
} from 'lucide-react';
import { 
  subscribeToCollection, 
  saveData, 
  deleteData, 
  getCollectionName 
} from '../api';
import { where } from 'firebase/firestore';

interface BusinessProps {
  user: UserType;
}

export const Business: React.FC<BusinessProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'clients'>('invoices');
  
  // Data States
  const [invoices, setInvoices] = useState<BusinessInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<Partial<BusinessInvoice> | null>(null);
  
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientData, setClientData] = useState<Partial<Client> | null>(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user?.id) return;
    
    // Carrega Clientes (sem filtro de data)
    const unsubClients = subscribeToCollection(
      user.id,
      getCollectionName('Clients'),
      (data) => setClients(data)
    );

    // Carrega Invoices do Ano Selecionado
    const startYear = `${year}-01-01`;
    const endYear = `${year}-12-31`;
    
    const unsubInvoices = subscribeToCollection(
      user.id,
      getCollectionName('BusinessInvoices'),
      (data) => setInvoices(data),
      where('issuanceDate', '>=', startYear),
      where('issuanceDate', '<=', endYear)
    );

    setIsLoading(false);

    return () => {
      unsubClients();
      unsubInvoices();
    };
  }, [user, year]);

  // --- CALCULATIONS & HELPERS ---

  // Recalcula o valor líquido baseado nos impostos
  const calculateNetValue = (data: Partial<BusinessInvoice>) => {
    if (!data.grossValue) return 0;
    const taxes = data.retainedTaxes || { irrf: 0, csll: 0, cofins: 0, pis: 0, iss: 0, inss: 0 };
    const totalTaxes = Object.values(taxes).reduce((acc, val) => acc + (Number(val) || 0), 0);
    return data.grossValue - totalTaxes;
  };

  const updateTax = (taxName: keyof typeof invoiceData.retainedTaxes, value: number) => {
    if (!invoiceData) return;
    const newTaxes = { ...invoiceData.retainedTaxes, [taxName]: value };
    const newNet = (invoiceData.grossValue || 0) - Object.values(newTaxes).reduce((a, b) => a + (Number(b) || 0), 0);
    setInvoiceData({ ...invoiceData, retainedTaxes: newTaxes as any, netValue: newNet });
  };

  // Helper para aplicar alíquotas padrão (facilitador)
  const applyTaxRate = (taxName: keyof typeof invoiceData.retainedTaxes, rate: number) => {
    if (!invoiceData || !invoiceData.grossValue) return;
    const taxValue = Number((invoiceData.grossValue * rate).toFixed(2));
    updateTax(taxName, taxValue);
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalGross = invoices.reduce((acc, inv) => acc + (inv.grossValue || 0), 0);
    const totalNet = invoices.reduce((acc, inv) => acc + (inv.netValue || 0), 0);
    const totalRetained = totalGross - totalNet;
    const pending = invoices.filter(inv => inv.status === 'issued').reduce((acc, inv) => acc + (inv.netValue || 0), 0);
    return { totalGross, totalNet, totalRetained, pending };
  }, [invoices]);

  // --- HANDLERS ---

  const handleSaveInvoice = async () => {
    if (!invoiceData || !invoiceData.clientId || !invoiceData.description) {
      alert("Preencha os campos obrigatórios (Cliente, Descrição e Valor).");
      return;
    }
    
    // Garante que temos um ID
    const invoiceToSave: BusinessInvoice = {
      id: invoiceData.id || generateUUID(),
      userId: user.id,
      invoiceNumber: invoiceData.invoiceNumber || '',
      clientId: invoiceData.clientId,
      clientName: clients.find(c => c.id === invoiceData.clientId)?.name || 'Cliente Desconhecido',
      description: invoiceData.description,
      issuanceDate: invoiceData.issuanceDate || new Date().toISOString().split('T')[0],
      dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
      grossValue: Number(invoiceData.grossValue) || 0,
      retainedTaxes: invoiceData.retainedTaxes || { irrf: 0, csll: 0, cofins: 0, pis: 0, iss: 0, inss: 0 },
      netValue: Number(invoiceData.netValue) || 0,
      status: invoiceData.status || 'draft',
      paymentDate: invoiceData.status === 'paid' ? (invoiceData.paymentDate || new Date().toISOString().split('T')[0]) : undefined
    };

    await saveData(user.id, getCollectionName('BusinessInvoices'), invoiceToSave);
    setIsInvoiceModalOpen(false);
    setInvoiceData(null);
  };

  const handleSaveClient = async () => {
    if (!clientData || !clientData.name) return;
    
    const clientToSave: Client = {
      id: clientData.id || generateUUID(),
      userId: user.id,
      name: clientData.name,
      document: clientData.document || '',
      email: clientData.email || '',
      phone: clientData.phone || '',
      notes: clientData.notes || '',
      active: true
    };

    await saveData(user.id, getCollectionName('Clients'), clientToSave);
    setIsClientModalOpen(false);
    setClientData(null);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta nota?")) {
      await deleteData(user.id, getCollectionName('BusinessInvoices'), id);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm("Excluir cliente?")) {
      await deleteData(user.id, getCollectionName('Clients'), id);
    }
  };

  const openNewInvoice = () => {
    setInvoiceData({
      grossValue: 0,
      netValue: 0,
      retainedTaxes: { irrf: 0, csll: 0, cofins: 0, pis: 0, iss: 0, inss: 0 },
      issuanceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      status: 'draft'
    });
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn bg-slate-50 dark:bg-slate-900">
       {/* --- HEADER SUPERIOR --- */}
       <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10 shadow-sm">
           <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                   <Building2 className="text-indigo-600 dark:text-indigo-400" size={24}/>
               </div>
               <div>
                   <h1 className="text-xl font-bold dark:text-white leading-none">Gestão Empresarial</h1>
                   <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Faturamento e Notas Fiscais</p>
               </div>
           </div>

           <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-full md:w-auto">
               <button onClick={() => setActiveTab('invoices')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-200' : 'text-slate-500'}`}>Notas Fiscais</button>
               <button onClick={() => setActiveTab('clients')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'clients' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-200' : 'text-slate-500'}`}>Clientes</button>
               <button onClick={() => setActiveTab('dashboard')} className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-200' : 'text-slate-500'}`}>Indicadores</button>
           </div>
       </div>

       {/* --- CONTEÚDO PRINCIPAL --- */}
       <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6">
           
           {/* DASHBOARD TAB */}
           {activeTab === 'dashboard' && (
               <div className="space-y-6 animate-fadeIn">
                   <div className="flex justify-between items-center">
                       <h2 className="font-bold text-lg dark:text-white">Resumo Anual ({year})</h2>
                       <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-white dark:bg-slate-800 border dark:border-slate-600 rounded p-2 text-sm">
                           {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                       </select>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp size={60} /></div>
                           <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Faturamento Bruto</h3>
                           <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{parseCurrency(stats.totalGross)}</div>
                           <div className="text-[10px] text-slate-400 mt-2">Base para Imposto DAS</div>
                       </div>
                       
                       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingDown size={60} /></div>
                           <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Impostos Retidos</h3>
                           <div className="text-2xl font-bold text-red-500">{parseCurrency(stats.totalRetained)}</div>
                           <div className="text-[10px] text-slate-400 mt-2">IRRF, CSLL, PIS, COFINS</div>
                       </div>

                       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                           <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><DollarSign size={60} /></div>
                           <h3 className="text-xs font-bold text-slate-500 uppercase mb-1">Receita Líquida</h3>
                           <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{parseCurrency(stats.totalNet)}</div>
                           <div className="text-[10px] text-slate-400 mt-2">Efetivamente no Caixa</div>
                       </div>

                       <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
                           <h3 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase mb-1">A Receber</h3>
                           <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{parseCurrency(stats.pending)}</div>
                           <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 mt-2">Notas Emitidas Pendentes</div>
                       </div>
                   </div>
               </div>
           )}

           {/* INVOICES TAB */}
           {activeTab === 'invoices' && (
               <div className="flex flex-col h-full space-y-4 animate-fadeIn">
                   <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 shadow-sm">
                       <div className="flex items-center gap-4 flex-1">
                           <div className="relative group max-w-xs w-full">
                               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                               <input 
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  placeholder="Buscar nota, cliente..." 
                                  className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-700 dark:text-white rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-indigo-500"
                               />
                           </div>
                           <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm outline-none">
                               {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                           </select>
                       </div>
                       <button onClick={openNewInvoice} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                           <Plus size={18}/> Nova Nota
                       </button>
                   </div>

                   <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                       <div className="overflow-auto flex-1">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
                                   <tr>
                                       <th className="p-4">Emissão</th>
                                       <th className="p-4">Cliente / Descrição</th>
                                       <th className="p-4 text-right">Bruto</th>
                                       <th className="p-4 text-right">Retenções</th>
                                       <th className="p-4 text-right">Líquido</th>
                                       <th className="p-4 text-center">Status</th>
                                       <th className="p-4 text-right w-24">Ações</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                   {invoices.filter(i => 
                                      i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                      i.description.toLowerCase().includes(searchTerm.toLowerCase())
                                   ).map(inv => {
                                       const retainedTotal = (inv.grossValue - inv.netValue);
                                       return (
                                           <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group transition-colors">
                                               <td className="p-4 text-slate-500 whitespace-nowrap">
                                                   <div className="font-medium dark:text-white">{parseDate(inv.issuanceDate)}</div>
                                                   <div className="text-[10px]">Venc: {parseDate(inv.dueDate)}</div>
                                               </td>
                                               <td className="p-4">
                                                   <div className="font-bold dark:text-white flex items-center gap-2">
                                                       {inv.clientName}
                                                       {inv.invoiceNumber && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">NF {inv.invoiceNumber}</span>}
                                                   </div>
                                                   <div className="text-xs text-slate-500 truncate max-w-[250px]">{inv.description}</div>
                                               </td>
                                               <td className="p-4 text-right font-medium dark:text-slate-300">{parseCurrency(inv.grossValue)}</td>
                                               <td className="p-4 text-right text-red-500 text-xs">
                                                   {retainedTotal > 0 ? `-${parseCurrency(retainedTotal)}` : '-'}
                                               </td>
                                               <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{parseCurrency(inv.netValue)}</td>
                                               <td className="p-4 text-center">
                                                   <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                                                       inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                       inv.status === 'issued' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                       'bg-slate-100 text-slate-600 border-slate-200'
                                                   }`}>
                                                       {inv.status === 'paid' ? 'Recebido' : inv.status === 'issued' ? 'Emitida' : 'Rascunho'}
                                                   </span>
                                               </td>
                                               <td className="p-4 text-right">
                                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                       <button onClick={() => { setInvoiceData(inv); setIsInvoiceModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16}/></button>
                                                       <button onClick={() => handleDeleteInvoice(inv.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                                                   </div>
                                               </td>
                                           </tr>
                                       )
                                   })}
                               </tbody>
                           </table>
                       </div>
                   </div>
               </div>
           )}

           {/* CLIENTS TAB */}
           {activeTab === 'clients' && (
               <div className="flex flex-col h-full space-y-4 animate-fadeIn">
                   <div className="flex justify-end">
                       <button onClick={() => { setClientData({ name: '', active: true }); setIsClientModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                           <Plus size={18}/> Novo Cliente
                       </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {clients.map(client => (
                           <div key={client.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
                               <div className="flex justify-between items-start mb-3">
                                   <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg"><Building2 size={24} className="text-slate-500"/></div>
                                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => { setClientData(client); setIsClientModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                       <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                   </div>
                               </div>
                               <h3 className="font-bold text-lg dark:text-white mb-1">{client.name}</h3>
                               <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                   <p>CNPJ: {client.document || 'Não informado'}</p>
                                   <p>Email: {client.email || '-'}</p>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}
       </div>

       {/* --- MODAL INVOICE (SMART FORM) --- */}
       {isInvoiceModalOpen && invoiceData && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
               <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
                   <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                       <div>
                           <h3 className="text-xl font-bold dark:text-white flex items-center gap-2"><FileText size={24} className="text-indigo-600"/> {invoiceData.id ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}</h3>
                           <p className="text-xs text-slate-500">Preencha os dados e impostos para cálculo automático.</p>
                       </div>
                       <button onClick={() => setIsInvoiceModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-6 space-y-8">
                       {/* Seção 1: Dados Gerais */}
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                               <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Cliente</label>
                                   <select 
                                      value={invoiceData.clientId || ''} 
                                      onChange={e => setInvoiceData({...invoiceData, clientId: e.target.value})}
                                      className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600 outline-none focus:border-indigo-500"
                                   >
                                       <option value="">Selecione...</option>
                                       {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                   </select>
                               </div>
                               <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrição do Serviço</label>
                                   <textarea 
                                      value={invoiceData.description || ''} 
                                      onChange={e => setInvoiceData({...invoiceData, description: e.target.value})}
                                      className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white dark:border-slate-600 outline-none focus:border-indigo-500 h-24 resize-none"
                                      placeholder="Ex: Consultoria BIM referente medição 01..."
                                   />
                               </div>
                           </div>
                           
                           <div className="space-y-4">
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Número NF</label>
                                       <input 
                                          type="text"
                                          value={invoiceData.invoiceNumber || ''}
                                          onChange={e => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                                          className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none"
                                          placeholder="0000"
                                       />
                                   </div>
                                   <div>
                                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Status</label>
                                       <select 
                                          value={invoiceData.status || 'draft'} 
                                          onChange={e => setInvoiceData({...invoiceData, status: e.target.value as any})}
                                          className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none"
                                       >
                                           <option value="draft">Rascunho</option>
                                           <option value="issued">Emitida</option>
                                           <option value="paid">Recebida/Paga</option>
                                           <option value="cancelled">Cancelada</option>
                                       </select>
                                   </div>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Emissão (Competência)</label>
                                       <input 
                                          type="date"
                                          value={invoiceData.issuanceDate}
                                          onChange={e => setInvoiceData({...invoiceData, issuanceDate: e.target.value})}
                                          className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none"
                                       />
                                   </div>
                                   <div>
                                       <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Vencimento</label>
                                       <input 
                                          type="date"
                                          value={invoiceData.dueDate}
                                          onChange={e => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                                          className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none"
                                       />
                                   </div>
                               </div>
                           </div>
                       </div>

                       <hr className="border-slate-100 dark:border-slate-700" />

                       {/* Seção 2: A Mágica Tributária */}
                       <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                           <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2"><Calculator size={18}/> Cálculo de Retenções e Líquido</h4>
                           
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                               {/* Coluna 1: Valor Bruto */}
                               <div>
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Valor Bruto (R$)</label>
                                   <div className="relative">
                                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                                       <input 
                                          type="number"
                                          value={invoiceData.grossValue}
                                          onChange={e => {
                                              const gross = parseFloat(e.target.value);
                                              // Ao mudar o bruto, recalculamos o líquido mantendo os valores de impostos atuais fixos (ou poderíamos recalcular % se quiséssemos ser mais agressivos)
                                              // Por enquanto, apenas atualiza bruto e recalcula líquido.
                                              const currentTaxes = Object.values(invoiceData.retainedTaxes || {}).reduce((a,b) => a + Number(b), 0);
                                              setInvoiceData({ ...invoiceData, grossValue: gross, netValue: gross - currentTaxes });
                                          }}
                                          className="w-full p-4 pl-10 text-xl font-bold border rounded-xl dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                          placeholder="0.00"
                                       />
                                   </div>
                                   <p className="text-[10px] text-slate-400 mt-2">Valor total da nota fiscal emitida.</p>
                               </div>

                               {/* Coluna 2: Impostos Retidos (Toggles) */}
                               <div className="lg:col-span-2">
                                   <label className="text-xs font-bold text-slate-500 uppercase block mb-3">Impostos Retidos na Fonte</label>
                                   <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                       
                                       {/* IRRF */}
                                       <div className={`p-3 rounded-lg border transition-all ${Number(invoiceData.retainedTaxes?.irrf) > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                           <div className="flex justify-between items-center mb-2">
                                               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">IRRF (1.5%)</span>
                                               <button onClick={() => applyTaxRate('irrf', 0.015)} className="text-[10px] text-blue-600 hover:underline">Auto</button>
                                           </div>
                                           <input 
                                              type="number" 
                                              value={invoiceData.retainedTaxes?.irrf} 
                                              onChange={e => updateTax('irrf', parseFloat(e.target.value))}
                                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 text-right font-medium text-sm outline-none focus:border-red-500"
                                           />
                                       </div>

                                       {/* CSLL */}
                                       <div className={`p-3 rounded-lg border transition-all ${Number(invoiceData.retainedTaxes?.csll) > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                           <div className="flex justify-between items-center mb-2">
                                               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">CSLL (1%)</span>
                                               <button onClick={() => applyTaxRate('csll', 0.01)} className="text-[10px] text-blue-600 hover:underline">Auto</button>
                                           </div>
                                           <input 
                                              type="number" 
                                              value={invoiceData.retainedTaxes?.csll} 
                                              onChange={e => updateTax('csll', parseFloat(e.target.value))}
                                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 text-right font-medium text-sm outline-none focus:border-red-500"
                                           />
                                       </div>

                                       {/* COFINS */}
                                       <div className={`p-3 rounded-lg border transition-all ${Number(invoiceData.retainedTaxes?.cofins) > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                           <div className="flex justify-between items-center mb-2">
                                               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">COFINS (3%)</span>
                                               <button onClick={() => applyTaxRate('cofins', 0.03)} className="text-[10px] text-blue-600 hover:underline">Auto</button>
                                           </div>
                                           <input 
                                              type="number" 
                                              value={invoiceData.retainedTaxes?.cofins} 
                                              onChange={e => updateTax('cofins', parseFloat(e.target.value))}
                                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 text-right font-medium text-sm outline-none focus:border-red-500"
                                           />
                                       </div>

                                       {/* PIS */}
                                       <div className={`p-3 rounded-lg border transition-all ${Number(invoiceData.retainedTaxes?.pis) > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                           <div className="flex justify-between items-center mb-2">
                                               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">PIS (0.65%)</span>
                                               <button onClick={() => applyTaxRate('pis', 0.0065)} className="text-[10px] text-blue-600 hover:underline">Auto</button>
                                           </div>
                                           <input 
                                              type="number" 
                                              value={invoiceData.retainedTaxes?.pis} 
                                              onChange={e => updateTax('pis', parseFloat(e.target.value))}
                                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 text-right font-medium text-sm outline-none focus:border-red-500"
                                           />
                                       </div>

                                       {/* ISS */}
                                       <div className={`p-3 rounded-lg border transition-all ${Number(invoiceData.retainedTaxes?.iss) > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                           <div className="flex justify-between items-center mb-2">
                                               <span className="text-xs font-bold text-slate-600 dark:text-slate-300">ISS (Retido)</span>
                                           </div>
                                           <input 
                                              type="number" 
                                              value={invoiceData.retainedTaxes?.iss} 
                                              onChange={e => updateTax('iss', parseFloat(e.target.value))}
                                              placeholder="0.00"
                                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 text-right font-medium text-sm outline-none focus:border-red-500"
                                           />
                                       </div>

                                       {/* PCC GROUP BUTTON */}
                                       <div className="flex items-center justify-center">
                                            <button 
                                                onClick={() => {
                                                    applyTaxRate('csll', 0.01);
                                                    applyTaxRate('cofins', 0.03);
                                                    applyTaxRate('pis', 0.0065);
                                                }}
                                                className="text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 border border-blue-200 rounded px-3 py-2 transition-colors"
                                            >
                                                Aplicar PCC (4.65%)
                                            </button>
                                       </div>

                                   </div>
                               </div>
                           </div>

                           {/* Resultado Líquido */}
                           <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
                               <div>
                                   <div className="text-xs text-slate-500 uppercase font-bold">Total Retido</div>
                                   <div className="text-xl font-bold text-red-500">{parseCurrency((invoiceData.grossValue || 0) - (invoiceData.netValue || 0))}</div>
                               </div>
                               <div className="text-right">
                                   <div className="text-sm text-slate-500 uppercase font-bold mb-1">Valor Líquido a Receber</div>
                                   <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{parseCurrency(invoiceData.netValue || 0)}</div>
                               </div>
                           </div>
                       </div>
                   </div>

                   <div className="p-6 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                       <button onClick={() => setIsInvoiceModalOpen(false)} className="px-6 py-3 border border-slate-300 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors">Cancelar</button>
                       <button onClick={handleSaveInvoice} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
                           <Save size={20}/> Salvar Nota
                       </button>
                   </div>
               </div>
           </div>
       )}

       {/* --- MODAL CLIENT --- */}
       {isClientModalOpen && clientData && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
               <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
                   <h3 className="font-bold text-lg dark:text-white">Gerenciar Cliente</h3>
                   
                   <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome Fantasia</label><input autoFocus value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"/></div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">CNPJ / CPF</label><input value={clientData.document} onChange={e => setClientData({...clientData, document: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"/></div>
                   <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label><input value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"/></div>
                       <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Telefone</label><input value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white"/></div>
                   </div>
                   
                   <div className="flex justify-end gap-2 mt-4">
                       <button onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 border rounded text-slate-600">Cancelar</button>
                       <button onClick={handleSaveClient} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold">Salvar</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};