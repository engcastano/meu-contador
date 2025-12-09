import React, { useState, useEffect } from 'react';
import { X, Calculator, Save, Copy, Check, FileText, UserPlus } from 'lucide-react';
import { ServiceInvoice, TaxRetention, CompanySettings, Client } from '../businessTypes';
import { calculateRetentions, formatCurrency, generateInvoiceDescriptionBody } from '../utils/businessCalculations';

interface InvoiceFormProps {
  initialData?: ServiceInvoice | null;
  companySettings?: CompanySettings;
  clients?: Client[]; // Lista de clientes para seleção
  onSave: (invoice: ServiceInvoice) => void;
  onCancel: () => void;
}

// Objeto vazio de segurança
const DEFAULT_SETTINGS: CompanySettings = {
    companyName: '', cnpj: '', municipalRegistry: '', address: '',
    bankName: '', bankCode: '', agency: '', account: '', pixKey: '',
    contactName: '', phone: '', email: ''
};

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ 
    initialData, 
    companySettings = DEFAULT_SETTINGS, 
    clients = [], // Default array vazio
    onSave, 
    onCancel 
}) => {
  // Estados do Formulário
  const [formData, setFormData] = useState<Partial<ServiceInvoice>>({
    id: '',
    clientName: '',
    clientId: '',
    projectName: '',
    issueDate: new Date().toISOString().split('T')[0],
    description: '',
    grossValue: 0,
    netValue: 0,
    status: 'PENDING',
    cnpj: '',
    paymentData: { 
        bank: companySettings?.bankName || '', 
        agency: companySettings?.agency || '', 
        account: companySettings?.account || '' 
    }
  });

  const [retentions, setRetentions] = useState<TaxRetention>({
    irrf: 0, csll: 0, cofins: 0, pis: 0, total: 0
  });

  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);

  // Carregar dados se for edição
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setRetentions(initialData.retention);
    }
  }, [initialData]);

  // Atualizar texto gerado sempre que os dados mudarem
  useEffect(() => {
    const tempInvoice = {
        ...formData,
        retention: retentions,
        grossValue: formData.grossValue || 0,
        netValue: (formData.grossValue || 0) - retentions.total
    } as ServiceInvoice;

    if (companySettings && companySettings.companyName) {
        setGeneratedText(generateInvoiceDescriptionBody(tempInvoice, companySettings));
    }
  }, [formData.description, formData.grossValue, retentions, companySettings]);

  // Handler de seleção de cliente
  const handleClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const client = clients.find(c => c.id === selectedId);
    if (client) {
        setFormData(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.tradeName, // Usa o nome fantasia
            cnpj: client.cnpj
        }));
    }
  };

  const handleGrossValueChange = (value: number) => {
    const calculatedRetentions = calculateRetentions(value);
    setRetentions(calculatedRetentions);
    setFormData(prev => ({
      ...prev,
      grossValue: value,
      netValue: value - calculatedRetentions.total
    }));
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.clientName || !formData.grossValue) return;

    const finalInvoice: ServiceInvoice = {
      id: formData.id,
      clientName: formData.clientName,
      clientId: formData.clientId,
      projectName: formData.projectName || '',
      issueDate: formData.issueDate,
      description: formData.description || '',
      cnpj: formData.cnpj || '',
      serviceCode: formData.serviceCode || '02301',
      grossValue: formData.grossValue,
      netValue: formData.grossValue - retentions.total,
      retention: retentions,
      status: formData.status as 'PENDING' | 'PAID' | 'CANCELLED',
      paymentData: formData.paymentData
    };

    onSave(finalInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {initialData ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}
          </h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUNA DA ESQUERDA: DADOS */}
            <div className="space-y-6">
                {/* Linha 1: Identificação */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número NFSe</label>
                    <input 
                        type="text" 
                        required
                        value={formData.id}
                        onChange={e => setFormData({...formData, id: e.target.value})}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: 135"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Emissão</label>
                    <input 
                        type="date" 
                        required
                        value={formData.issueDate}
                        onChange={e => setFormData({...formData, issueDate: e.target.value})}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select 
                        value={formData.status}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                    >
                        <option value="PENDING">Pendente</option>
                        <option value="PAID">Pago</option>
                        <option value="CANCELLED">Cancelado</option>
                    </select>
                    </div>
                </div>

                {/* Linha 2: Cliente */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                            Cliente
                            <span className="text-xs text-indigo-500 cursor-pointer flex items-center gap-1">
                                {clients.length > 0 ? `${clients.length} cadastrados` : 'Nenhum cadastrado'}
                            </span>
                        </label>
                        <div className="flex gap-2">
                            {/* Select de Clientes */}
                            <select 
                                onChange={handleClientSelect}
                                value={formData.clientId || ''}
                                className="w-1/3 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 dark:text-white text-sm"
                            >
                                <option value="">Selecionar...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.tradeName}</option>
                                ))}
                            </select>

                            {/* Input de Texto (Caso não queira usar o select) */}
                            <input 
                                type="text" 
                                required
                                value={formData.clientName}
                                onChange={e => setFormData({...formData, clientName: e.target.value})}
                                className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                                placeholder="Nome do Cliente"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CNPJ do Tomador</label>
                        <input 
                            type="text" 
                            value={formData.cnpj}
                            onChange={e => setFormData({...formData, cnpj: e.target.value})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Projeto</label>
                        <input 
                            type="text" 
                            value={formData.projectName}
                            onChange={e => setFormData({...formData, projectName: e.target.value})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                        />
                    </div>
                </div>

                {/* Linha 3: Valores */}
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                    <Calculator size={20} />
                    Cálculo Financeiro
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Bruto (R$)</label>
                            <input 
                            type="number" 
                            step="0.01"
                            required
                            value={formData.grossValue}
                            onChange={e => handleGrossValueChange(parseFloat(e.target.value) || 0)}
                            className="w-full p-3 text-lg font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Retenções (6,15%):</span>
                            <span className="text-rose-500 font-medium">- {formatCurrency(retentions.total)}</span>
                            </div>
                            
                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center">
                            <span className="font-bold text-slate-700 dark:text-white">Líquido a Receber:</span>
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency((formData.grossValue || 0) - retentions.total)}
                            </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUNA DA DIREITA: DESCRIÇÃO E GERADOR */}
            <div className="flex flex-col h-full space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Descrição do Serviço (Apenas o texto técnico)
                    </label>
                    <textarea 
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Ex: Prestação de serviços de projeto executivo de instalações..."
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <FileText size={16} />
                            Texto Completo para a Nota (Automático)
                        </label>
                        <button
                            type="button"
                            onClick={handleCopyText}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                copied 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                        </button>
                    </div>
                    <div className="relative flex-1">
                        <textarea 
                            readOnly
                            value={generatedText}
                            placeholder="Preencha os dados da empresa para gerar o texto automático..."
                            className="w-full h-full min-h-[300px] p-4 font-mono text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 resize-none"
                        />
                    </div>
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700 mt-auto">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancelar</button>
            <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg">
              <Save size={18} />
              Salvar Nota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};