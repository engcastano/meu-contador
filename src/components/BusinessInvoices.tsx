import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Search, FileText, 
  Trash2, Edit2, Check, X, 
  Ban, CheckSquare, Square, Calculator, Copy,
  Wand2, UserCheck, Briefcase, Clock, Layers, Filter, Upload, HelpCircle,
  ArrowUpDown, TrendingDown, Landmark, Wallet, List, AlertCircle
} from 'lucide-react';
import { ServiceInvoice, CompanySettings, Client, Project, InvoiceTaxes } from '../businessTypes';
import { generateInvoiceDescriptionBody } from '../utils/businessCalculations';
import { InvoiceViewer } from './InvoiceViewer';

interface BusinessInvoicesProps {
  invoices: ServiceInvoice[];
  companySettings: CompanySettings;
  clients: Client[];
  projects: Project[];
  onAddInvoice: (invoice: Omit<ServiceInvoice, 'id'>) => void;
  onUpdateInvoice: (id: string, invoice: Partial<ServiceInvoice>) => void;
  onDeleteInvoice: (id: string) => void;
  onImportCSV: (invoices: Omit<ServiceInvoice, 'id'>[]) => void;
  onViewInvoice: (invoice: ServiceInvoice) => void;
}

const safeFloat = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  if (typeof value === 'string') {
    const clean = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Normalização
const normalizeInvoice = (raw: any): ServiceInvoice => {
  let taxes: InvoiceTaxes = raw.taxes ? { ...raw.taxes } : {
    iss: { amount: 0, rate: 0, retained: false },
    irrf: { amount: 0, rate: 0, retained: true },
    pis: { amount: 0, rate: 0, retained: true },
    cofins: { amount: 0, rate: 0, retained: true },
    csll: { amount: 0, rate: 0, retained: true },
    inss: { amount: 0, rate: 0, retained: false },
  };

  if (!raw.taxes && (raw.retainedTaxes || raw.retention)) {
    const legacy = raw.retainedTaxes || raw.retention || {};
    taxes = {
        iss: { amount: safeFloat(legacy.iss), rate: 0, retained: !!legacy.iss },
        irrf: { amount: safeFloat(legacy.irrf || legacy.irpj), rate: 0, retained: true },
        pis: { amount: safeFloat(legacy.pis), rate: 0, retained: true },
        cofins: { amount: safeFloat(legacy.cofins), rate: 0, retained: true },
        csll: { amount: safeFloat(legacy.csll), rate: 0, retained: true },
        inss: { amount: safeFloat(legacy.inss), rate: 0, retained: false },
    };
  }

  Object.keys(taxes).forEach(key => { const k = key as keyof InvoiceTaxes; if (taxes[k]) taxes[k].amount = safeFloat(taxes[k].amount); });

  const amount = safeFloat(raw.amount || raw.grossValue || raw.value);
  const number = typeof raw.number === 'string' ? parseInt(raw.number, 10) : raw.number;
  
  // Default isTaxable to true if undefined
  const isTaxable = raw.isTaxable !== undefined ? raw.isTaxable : true;

  return {
    ...raw,
    id: raw.id,
    number: number || 0,
    amount: amount,
    taxes: taxes,
    isTaxable,
    issueDate: raw.issueDate || raw.date || new Date().toISOString().split('T')[0],
    status: raw.status || 'issued',
    description: raw.description || '',
    clientName: raw.clientName || 'Cliente não identificado'
  };
};

export const BusinessInvoices: React.FC<BusinessInvoicesProps> = ({
  invoices,
  companySettings,
  clients,
  projects,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onImportCSV,
  onViewInvoice
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isImportHelpOpen, setIsImportHelpOpen] = useState(false);
  
  const [editingInvoice, setEditingInvoice] = useState<ServiceInvoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<ServiceInvoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pickers
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  
  const [rawDescription, setRawDescription] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'technical' | 'final'>('technical');
  const [hasFederalRetention, setHasFederalRetention] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ServiceInvoice | 'netValue'; direction: 'asc' | 'desc' }>({ key: 'number', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState({
    status: 'all',
    taxable: 'all', 
    startDate: '',
    endDate: '',
    clientName: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    number: 0,
    issueDate: new Date().toISOString().split('T')[0],
    serviceCode: '17.01',
    description: '',
    amount: 0,
    clientId: '',
    clientName: '', 
    projectId: '',
    projectName: '', 
    notes: '',
    status: 'issued' as 'issued' | 'cancelled' | 'paid',
    isTaxable: true,
    taxes: {
      iss: { amount: 0, rate: 5.00, retained: false },
      irrf: { amount: 0, rate: 1.50, retained: true },
      pis: { amount: 0, rate: 0.65, retained: true },
      cofins: { amount: 0, rate: 3.00, retained: true },
      csll: { amount: 0, rate: 1.00, retained: true },
      inss: { amount: 0, rate: 0, retained: false },
    }
  });

  const [bulkFormData, setBulkFormData] = useState({
    issueDate: '', serviceCode: '', status: '', clientName: '', projectName: '', federalRetention: '' 
  });

  // Calculate Next Number
  useEffect(() => {
    if (isModalOpen && !editingInvoice) {
      const maxNumber = invoices.reduce((max, raw) => {
        const inv = normalizeInvoice(raw);
        return Math.max(max, inv.number);
      }, 0);
      setFormData(prev => ({ ...prev, number: maxNumber + 1 }));
      setRawDescription('');
      setHasFederalRetention(true);
      setActiveTab('technical'); 
    }
  }, [isModalOpen, editingInvoice, invoices]);

  // Load Invoice
  useEffect(() => {
    if (editingInvoice) {
      const safeInv = normalizeInvoice(editingInvoice);
      const hasRetention = safeInv.taxes.irrf.retained || safeInv.taxes.pis.retained; 
      setHasFederalRetention(hasRetention);

      setFormData({
        number: safeInv.number,
        issueDate: safeInv.issueDate,
        serviceCode: safeInv.serviceCode || '17.01',
        description: safeInv.description,
        amount: safeInv.amount,
        clientId: safeInv.clientId || '',
        clientName: safeInv.clientName || '',
        projectId: safeInv.projectId || '',
        projectName: safeInv.projectName || '',
        notes: safeInv.notes || '',
        status: safeInv.status,
        isTaxable: safeInv.isTaxable !== undefined ? safeInv.isTaxable : true,
        taxes: safeInv.taxes
      });
      setRawDescription(safeInv.description.split('\n\n')[0] || '');
      setActiveTab('final');
    }
  }, [editingInvoice]);

  // Tax Logic
  useEffect(() => {
    const gross = formData.amount;
    const newTaxes = { ...formData.taxes };

    if (!formData.isTaxable) {
        Object.keys(newTaxes).forEach(k => {
            newTaxes[k as keyof InvoiceTaxes].amount = 0;
        });
    } else {
        if (hasFederalRetention) {
          newTaxes.iss = { rate: 5.00, retained: false, amount: gross * 0.05 };
          newTaxes.irrf = { rate: 1.50, retained: true, amount: gross * 0.015 };
          newTaxes.csll = { rate: 1.00, retained: true, amount: gross * 0.01 };
          newTaxes.cofins = { rate: 3.00, retained: true, amount: gross * 0.03 };
          newTaxes.pis = { rate: 0.65, retained: true, amount: gross * 0.0065 };
        } else {
          newTaxes.iss = { rate: 5.00, retained: false, amount: gross * 0.05 };
          newTaxes.irrf = { rate: 0, retained: false, amount: 0 };
          newTaxes.csll = { rate: 0, retained: false, amount: 0 };
          newTaxes.cofins = { rate: 0, retained: false, amount: 0 };
          newTaxes.pis = { rate: 0, retained: false, amount: 0 };
        }
    }

    setFormData(prev => ({ ...prev, taxes: newTaxes }));
  }, [formData.amount, hasFederalRetention, formData.isTaxable]);

  const generateDescription = () => {
    const tempInvoice = { ...formData, id: 'temp', taxes: formData.taxes } as unknown as ServiceInvoice;
    const fullText = generateInvoiceDescriptionBody(tempInvoice, companySettings, rawDescription);
    setFormData(prev => ({ ...prev, description: fullText }));
    setActiveTab('final'); 
  };

  const handleCopyText = () => {
    if (!formData.description) return;
    const textArea = document.createElement("textarea");
    textArea.value = formData.description;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); } catch (err) {}
    document.body.removeChild(textArea);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, month: formData.issueDate.substring(0, 7) };
    if (editingInvoice) onUpdateInvoice(editingInvoice.id, payload);
    else onAddInvoice(payload);
    setIsModalOpen(false);
    setEditingInvoice(null);
  };

  const handleBulkUpdate = () => {
    selectedIds.forEach(id => {
      const updates: any = {};
      if (bulkFormData.issueDate) {
          updates.issueDate = bulkFormData.issueDate;
          updates.month = bulkFormData.issueDate.substring(0, 7);
      }
      if (bulkFormData.serviceCode) updates.serviceCode = bulkFormData.serviceCode;
      if (bulkFormData.status) updates.status = bulkFormData.status;
      if (bulkFormData.clientName) updates.clientName = bulkFormData.clientName;
      if (bulkFormData.projectName) updates.projectName = bulkFormData.projectName;
      
      if (Object.keys(updates).length > 0) {
        onUpdateInvoice(id, updates);
      }
    });
    setIsBulkEditModalOpen(false);
    setSelectedIds(new Set());
    setBulkFormData({ issueDate: '', serviceCode: '', status: '', clientName: '', projectName: '', federalRetention: '' });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const newInvoices: Omit<ServiceInvoice, 'id'>[] = [];

      const delimiter = lines[0].includes(';') ? ';' : ',';

      lines.forEach((line, index) => {
        if (index === 0 || !line.trim()) return; 
        
        const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 6) return;

        const number = parseInt(cols[0]) || 0;
        let status: 'issued' | 'paid' | 'cancelled' = 'issued';
        const rawStatus = cols[1]?.toLowerCase();
        if (rawStatus === 'paga' || rawStatus === 'pago') status = 'paid';
        if (rawStatus === 'cancelada' || rawStatus === 'cancelado') status = 'cancelled';

        const clientName = cols[2] || 'Cliente Importado';
        const projectName = cols[3] || '';

        const dateStr = cols[4];
        const issueDate = dateStr?.includes('/') 
            ? dateStr.split('/').reverse().join('-') 
            : (dateStr || new Date().toISOString().split('T')[0]);

        const amountStr = cols[5]?.replace('.', '').replace(',', '.');
        const amount = parseFloat(amountStr) || 0;
        const isRetained = cols[6]?.toUpperCase() === 'S' || cols[6]?.toUpperCase() === 'SIM';
        
        const taxes: InvoiceTaxes = {
            iss: { amount: amount * 0.05, rate: 5.00, retained: false },
            irrf: { amount: 0, rate: 0, retained: false },
            pis: { amount: 0, rate: 0, retained: false },
            cofins: { amount: 0, rate: 0, retained: false },
            csll: { amount: 0, rate: 0, retained: false },
            inss: { amount: 0, rate: 0, retained: false },
        };

        if (isRetained) {
            taxes.irrf = { rate: 1.50, retained: true, amount: amount * 0.015 };
            taxes.csll = { rate: 1.00, retained: true, amount: amount * 0.01 };
            taxes.cofins = { rate: 3.00, retained: true, amount: amount * 0.03 };
            taxes.pis = { rate: 0.65, retained: true, amount: amount * 0.0065 };
        }
        taxes.iss.amount = amount * 0.05;

        newInvoices.push({
            number,
            status,
            clientName,
            projectName,
            clientId: '', 
            issueDate,
            month: issueDate.substring(0, 7),
            amount,
            taxes,
            serviceCode: '17.01',
            description: 'Importado via CSV',
        });
      });

      if (newInvoices.length > 0) {
          onImportCSV(newInvoices);
          alert(`${newInvoices.length} notas importadas com sucesso!`);
      } else {
          alert('Nenhuma nota válida encontrada. Verifique o formato do CSV.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSort = (key: keyof ServiceInvoice | 'netValue') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices.map(normalizeInvoice);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(inv => 
        (inv.clientName?.toLowerCase() || '').includes(term) ||
        (inv.description?.toLowerCase() || '').includes(term) ||
        inv.number.toString().includes(term)
      );
    }

    if (filterConfig.status !== 'all') {
      result = result.filter(inv => inv.status === filterConfig.status);
    }
    if (filterConfig.taxable !== 'all') {
        const isTaxable = filterConfig.taxable === 'yes';
        result = result.filter(inv => inv.isTaxable === isTaxable);
    }
    if (filterConfig.clientName) {
      result = result.filter(inv => inv.clientName.toLowerCase().includes(filterConfig.clientName.toLowerCase()));
    }
    if (filterConfig.startDate) {
      result = result.filter(inv => inv.issueDate >= filterConfig.startDate);
    }
    if (filterConfig.endDate) {
      result = result.filter(inv => inv.issueDate <= filterConfig.endDate);
    }

    result.sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof ServiceInvoice];
      let valB: any = b[sortConfig.key as keyof ServiceInvoice];
      if (sortConfig.key === 'netValue') {
        const getNet = (inv: ServiceInvoice) => {
            const retained = Object.values(inv.taxes).reduce((acc, t) => t.retained ? acc + t.amount : acc, 0);
            return inv.amount - retained;
        };
        valA = getNet(a);
        valB = getNet(b);
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, searchTerm, sortConfig, filterConfig]);

  const tableTotals = useMemo(() => {
    const RATES = { ISS: 0.05, PIS: 0.0065, COFINS: 0.03, IRPJ: 0.048, CSLL: 0.0288 };
    return filteredInvoices.reduce((acc, inv) => {
        if (inv.status === 'cancelled') return acc;
        const gross = inv.amount;
        let retainedSum = 0;
        
        if (inv.isTaxable !== false) {
            const taxes = inv.taxes;
            if (taxes.iss?.retained) retainedSum += taxes.iss.amount;
            if (taxes.pis?.retained) retainedSum += taxes.pis.amount;
            if (taxes.cofins?.retained) retainedSum += taxes.cofins.amount;
            if (taxes.irrf?.retained) retainedSum += taxes.irrf.amount;
            if (taxes.csll?.retained) retainedSum += taxes.csll.amount;
            if (taxes.inss?.retained) retainedSum += taxes.inss.amount;
        }

        let toPaySum = 0;
        if (inv.isTaxable !== false) {
            const calcTax = (rate: number, retainedAmount: number = 0) => Math.max(0, (gross * rate) - retainedAmount);
            toPaySum += calcTax(RATES.ISS, inv.taxes.iss?.retained ? inv.taxes.iss.amount : 0);
            toPaySum += calcTax(RATES.PIS, inv.taxes.pis?.retained ? inv.taxes.pis.amount : 0);
            toPaySum += calcTax(RATES.COFINS, inv.taxes.cofins?.retained ? inv.taxes.cofins.amount : 0);
            toPaySum += calcTax(RATES.IRPJ, inv.taxes.irrf?.retained ? inv.taxes.irrf.amount : 0);
            toPaySum += calcTax(RATES.CSLL, inv.taxes.csll?.retained ? inv.taxes.csll.amount : 0);
        }

        const netReal = gross - retainedSum - toPaySum;
        return {
            gross: acc.gross + gross,
            retained: acc.retained + retainedSum,
            toPay: acc.toPay + toPaySum,
            netReal: acc.netReal + netReal
        };
    }, { gross: 0, retained: 0, toPay: 0, netReal: 0 });
  }, [filteredInvoices]);

  const StatusBadge = ({ status, isTaxable }: { status: string, isTaxable?: boolean }) => {
    let bg = 'bg-slate-100 text-slate-500';
    let icon = <Clock size={12} />;
    let label = 'EMITIDA';

    if (status === 'paid') { bg = 'bg-emerald-100 text-emerald-700'; icon = <Check size={12} />; label = 'PAGA'; }
    if (status === 'cancelled') { bg = 'bg-slate-100 text-slate-500 line-through'; icon = <Ban size={12} />; label = 'CANCELADA'; }

    return (
        <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${bg}`}>
                {icon} {label}
            </span>
            {isTaxable === false && (
                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 w-fit">
                    Não Tributável
                </span>
            )}
        </div>
    );
  };

  const RetentionBadge = ({ taxes }: { taxes: InvoiceTaxes }) => {
    const hasRetention = taxes.irrf.retained || taxes.pis.retained;
    return hasRetention ? 
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">SIM</span> : 
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">NÃO</span>;
  };

  // --- ACTIONS (Definição Completa) ---
  const handleCancelInvoice = (invoice: ServiceInvoice) => { if (confirm(`Deseja cancelar a Nota Fiscal #${invoice.number}?`)) onUpdateInvoice(invoice.id, { status: 'cancelled' }); };
  const handleMarkAsPaid = (invoice: ServiceInvoice) => { onUpdateInvoice(invoice.id, { status: 'paid' }); };
  const handleMarkAsIssued = (invoice: ServiceInvoice) => { onUpdateInvoice(invoice.id, { status: 'issued' }); };
  const toggleSelection = (id: string) => { const newSelection = new Set(selectedIds); if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id); setSelectedIds(newSelection); };
  
  const toggleSelectAll = () => { 
      if (selectedIds.size === filteredInvoices.length) setSelectedIds(new Set()); 
      else setSelectedIds(new Set(filteredInvoices.map(inv => inv.id))); 
  };
  
  const handleBulkDelete = () => { if (confirm(`Excluir ${selectedIds.size} notas?`)) { selectedIds.forEach(id => onDeleteInvoice(id)); setSelectedIds(new Set()); } };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
           <h2 className="text-xl font-bold text-slate-800 dark:text-white">Notas Fiscais</h2>
           <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
             {filteredInvoices.length} notas
           </span>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {selectedIds.size > 0 && (
             <>
               <button onClick={() => setIsBulkEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">
                 <Layers size={18} />
                 <span className="hidden sm:inline">Editar ({selectedIds.size})</span>
               </button>
               <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium">
                 <Trash2 size={18} />
                 <span className="hidden sm:inline">Excluir ({selectedIds.size})</span>
               </button>
             </>
          )}

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar nota..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className={`p-2 rounded-lg border transition-colors ${
                  Object.values(filterConfig).some(v => v !== 'all' && v !== '') 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
              }`}
              title="Filtros Avançados"
            >
              <Filter size={20} />
            </button>

            {/* IMPORT & HELP */}
            <div className="flex gap-1 bg-emerald-50 border border-emerald-200 rounded-lg p-0.5">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv,.txt" 
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                  title="Importar CSV"
                >
                  <Upload size={20} />
                </button>
                <button 
                  onClick={() => setIsImportHelpOpen(true)}
                  className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/50 rounded transition-colors"
                  title="Ajuda"
                >
                  <HelpCircle size={18} />
                </button>
            </div>
          </div>

          <button 
            onClick={() => {
              setEditingInvoice(null);
              setFormData({
                number: 0, issueDate: new Date().toISOString().split('T')[0], serviceCode: '17.01', description: '', amount: 0,
                clientId: '', clientName: '', projectId: '', projectName: '', notes: '', status: 'issued', isTaxable: true,
                taxes: { iss: { amount: 0, rate: 5.00, retained: false }, irrf: { amount: 0, rate: 1.50, retained: true }, pis: { amount: 0, rate: 0.65, retained: true }, cofins: { amount: 0, rate: 3.00, retained: true }, csll: { amount: 0, rate: 1.00, retained: true }, inss: { amount: 0, rate: 0, retained: false } }
              });
              setRawDescription('');
              setHasFederalRetention(true);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nova Nota</span>
          </button>
        </div>
      </div>

      {/* FILTER MODAL */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Filter size={20} /> Filtrar Notas</h3>
                    <button onClick={() => setIsFilterModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                        <select value={filterConfig.status} onChange={e => setFilterConfig({...filterConfig, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg">
                            <option value="all">Todos</option>
                            <option value="issued">Emitidas</option>
                            <option value="paid">Pagas</option>
                            <option value="cancelled">Canceladas</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tributação</label>
                        <select value={filterConfig.taxable} onChange={e => setFilterConfig({...filterConfig, taxable: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg">
                            <option value="all">Todas</option>
                            <option value="yes">Tributáveis</option>
                            <option value="no">Não Tributáveis</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente</label>
                        <input type="text" placeholder="Nome..." value={filterConfig.clientName} onChange={e => setFilterConfig({...filterConfig, clientName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">De</label><input type="date" value={filterConfig.startDate} onChange={e => setFilterConfig({...filterConfig, startDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg" /></div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Até</label><input type="date" value={filterConfig.endDate} onChange={e => setFilterConfig({...filterConfig, endDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg" /></div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button onClick={() => { setFilterConfig({status: 'all', taxable: 'all', startDate: '', endDate: '', clientName: ''}); setIsFilterModalOpen(false); }} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600">Limpar</button>
                        <button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg">Aplicar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* BULK EDIT MODAL */}
      {isBulkEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Layers size={20} /> Edição em Massa</h3>
                    <button onClick={() => setIsBulkEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                    Editando <strong>{selectedIds.size}</strong> notas. Campos em branco não serão alterados.
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nova Data</label><input type="date" value={bulkFormData.issueDate} onChange={e => setBulkFormData({...bulkFormData, issueDate: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg" /></div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Novo Status</label>
                            <select value={bulkFormData.status} onChange={e => setBulkFormData({...bulkFormData, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg">
                                <option value="">(Manter Atual)</option>
                                <option value="issued">Emitida</option>
                                <option value="paid">Paga</option>
                                <option value="cancelled">Cancelada</option>
                            </select>
                        </div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Novo Cliente</label><input type="text" placeholder="Manter atual..." value={bulkFormData.clientName} onChange={e => setBulkFormData({...bulkFormData, clientName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Novo Projeto</label><input type="text" placeholder="Manter atual..." value={bulkFormData.projectName} onChange={e => setBulkFormData({...bulkFormData, projectName: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg" /></div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código de Serviço</label>
                        <input type="text" placeholder="Manter atual..." value={bulkFormData.serviceCode} onChange={e => setBulkFormData({...bulkFormData, serviceCode: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg" />
                    </div>

                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Retenção Federal</label><select value={bulkFormData.federalRetention} onChange={e => setBulkFormData({...bulkFormData, federalRetention: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border rounded-lg"><option value="">(Manter Atual)</option><option value="yes">Aplicar Retenção (SIM)</option><option value="no">Remover Retenção (NÃO)</option></select></div>
                    <div className="pt-4 flex gap-3">
                        <button onClick={() => setIsBulkEditModalOpen(false)} className="flex-1 py-2 bg-slate-100 rounded-lg text-slate-600">Cancelar</button>
                        <button onClick={handleBulkUpdate} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Aplicar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* IMPORT HELP MODAL */}
      {isImportHelpOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-emerald-800 dark:text-white flex items-center gap-2"><Upload size={20} /> Formato do CSV</h3>
                    <button onClick={() => setIsImportHelpOpen(false)}><X size={20} className="text-slate-500" /></button>
                </div>
                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    <p>Crie um arquivo com as colunas nesta ordem exata:</p>
                    <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg font-mono text-xs overflow-x-auto border border-slate-200 dark:border-slate-700">Numero;Status;Cliente;Projeto;Emissao;Valor;Retencao</div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                        <p className="font-bold text-emerald-800 dark:text-emerald-400 text-xs mb-1">Exemplo:</p>
                        <code className="text-emerald-700 dark:text-emerald-300 text-xs block">215;paga;Bullguer;Loja SP;01/11/2025;7000;S<br/>224;emitida;Appito;Appito ABC;05/12/2025;14080,00;N</code>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Invoice Modal (Editor) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 rounded-t-2xl z-10">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{editingInvoice ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                {/* ... (Conteúdo do Modal mantido) ... */}
                <div className="lg:col-span-7 flex flex-col gap-6 h-full">
                  {editingInvoice && (
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl flex items-center gap-4">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status:</label>
                          <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-sm font-medium outline-none">
                              <option value="issued">Emitida</option><option value="paid">Paga</option><option value="cancelled">Cancelada</option>
                          </select>
                      </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número</label><input type="number" required value={formData.number} onChange={e => setFormData({...formData, number: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" /></div>
                      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código Serviço</label><input type="text" required value={formData.serviceCode} onChange={e => setFormData({...formData, serviceCode: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Emissão</label><input type="date" required value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" /></div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="relative"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente</label><div className="flex gap-2"><input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none" /><UserCheck className="absolute left-3 top-8 text-slate-400" size={18} /><button type="button" onClick={() => setIsClientPickerOpen(true)} className="px-3 bg-slate-100 border rounded-xl"><List size={18}/></button></div>
                      {isClientPickerOpen && <div className="absolute top-full bg-white border rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto w-full">{clients.map(c => <button key={c.id} type="button" onClick={() => { setFormData({...formData, clientId: c.id, clientName: c.tradeName || c.name}); setIsClientPickerOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b">{c.tradeName || c.name}</button>)}</div>}</div>
                      <div className="relative"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Projeto</label><div className="flex gap-2"><input type="text" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none" /><Briefcase className="absolute left-3 top-8 text-slate-400" size={18} /><button type="button" onClick={() => setIsProjectPickerOpen(true)} className="px-3 bg-slate-100 border rounded-xl"><List size={18}/></button></div>
                      {isProjectPickerOpen && <div className="absolute top-full bg-white border rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto w-full">{projects.map(p => <button key={p.id} type="button" onClick={() => { setFormData({...formData, projectId: p.id, projectName: p.name}); setIsProjectPickerOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b">{p.name}</button>)}</div>}</div>
                  </div>
                  <div className="flex-1 flex flex-col min-h-[300px] bg-slate-50 dark:bg-slate-900 rounded-2xl border p-1">
                      <div className="flex p-1 gap-1 bg-white border rounded-xl mb-2">
                          <button type="button" onClick={() => setActiveTab('technical')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab === 'technical' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}>Descrição Técnica</button>
                          <button type="button" onClick={() => setActiveTab('final')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${activeTab === 'final' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500'}`}>Texto Final</button>
                      </div>
                      <div className="flex-1 relative">
                          {activeTab === 'technical' ? (
                              <div className="absolute inset-0 flex flex-col gap-4 p-2"><textarea value={rawDescription} onChange={e => setRawDescription(e.target.value)} className="w-full h-full p-4 bg-white border rounded-xl outline-none resize-none" placeholder="Descreva o serviço..." /><button type="button" onClick={generateDescription} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"><Wand2 size={18} /> Gerar Texto</button></div>
                          ) : (
                              <div className="absolute inset-0 flex flex-col gap-4 p-2"><div className="flex justify-between px-1"><span className="text-xs text-slate-500 uppercase">Prévia</span><button type="button" onClick={handleCopyText} className="text-xs font-bold px-3 py-1.5 bg-slate-100 rounded-lg">{copyFeedback ? 'Copiado!' : 'Copiar'}</button></div><textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="flex-1 w-full p-4 bg-white border rounded-xl outline-none resize-none font-mono text-xs" /></div>
                          )}
                      </div>
                  </div>
                </div>
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-slate-50 p-6 rounded-2xl border space-y-4">
                        <label className="text-sm font-medium">Valor Bruto</label>
                        <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} className="w-full px-4 py-3 bg-white border rounded-xl text-2xl font-bold text-right outline-none" />
                    </div>
                    
                    {/* TRIBUTAÇÃO TOGGLE */}
                    <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${formData.isTaxable ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}><Landmark size={20}/></div>
                            <div>
                                <h4 className="font-bold text-sm">Incide Tributos?</h4>
                                <p className="text-xs text-slate-500">{formData.isTaxable ? 'Sim, impostos serão calculados' : 'Não, isento de impostos'}</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={formData.isTaxable} onChange={e => setFormData({...formData, isTaxable: e.target.checked})} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {formData.isTaxable && (
                        <div className="bg-white border rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3"><div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Calculator size={20}/></div><div><h4 className="font-bold text-sm">Retenção Federal</h4><p className="text-xs text-slate-500">IRRF (1,5%), CSLL, COFINS, PIS</p></div></div>
                            <input type="checkbox" checked={hasFederalRetention} onChange={e => setHasFederalRetention(e.target.checked)} className="w-5 h-5" />
                        </div>
                    )}

                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center"><span className="font-bold text-emerald-800">Líquido Previsto</span><span className="text-xl font-bold text-emerald-600">{(formData.amount - (formData.isTaxable && hasFederalRetention ? (formData.amount * 0.0615) : 0)).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span></div>
                    <div className="mt-auto flex gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl">Salvar</button></div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoices List Container (SCROLLABLE TABLE) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-auto">
          <table className="w-full relative">
            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left w-12"><button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-600">{selectedIds.size > 0 && selectedIds.size === filteredInvoices.length ? <CheckSquare size={18} /> : <Square size={18} />}</button></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 group" onClick={() => handleSort('number')}><div className="flex items-center gap-1">Número <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 group" onClick={() => handleSort('status')}><div className="flex items-center gap-1">Status <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div></th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Retenção</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 group" onClick={() => handleSort('clientName')}><div className="flex items-center gap-1">Cliente <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div></th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 group" onClick={() => handleSort('issueDate')}><div className="flex items-center gap-1">Emissão <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div></th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 group" onClick={() => handleSort('amount')}><div className="flex items-center gap-1 justify-end">Valor Bruto <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div></th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 group" onClick={() => handleSort('netValue')}><div className="flex items-center gap-1 justify-end">Líquido <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100" /></div></th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredInvoices.map((invoice) => {
                const isCancelled = invoice.status === 'cancelled';
                const totalRetainedList = Object.values(invoice.taxes).reduce((acc, curr) => curr.retained ? acc + curr.amount : acc, 0);
                const netAmount = invoice.amount - totalRetainedList;

                // Definir prefixo NFSe ou NTSe
                const prefix = invoice.isTaxable === false ? 'NTSe' : 'NFSe';

                return (
                  <tr key={invoice.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isCancelled ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}>
                    <td className="px-6 py-4"><button onClick={() => toggleSelection(invoice.id)} className={`${selectedIds.has(invoice.id) ? 'text-indigo-600' : 'text-slate-300'} hover:text-indigo-600 transition-colors`}>{selectedIds.has(invoice.id) ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                    <td className="px-6 py-4">
                      <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-slate-400">{prefix}</span>
                          <span className={`text-lg font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                              {invoice.number.toString().padStart(4, '0')}
                          </span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={invoice.status} isTaxable={invoice.isTaxable} /></td>
                    <td className="px-6 py-4 text-center"><RetentionBadge taxes={invoice.taxes} /></td>
                    <td className={`px-6 py-4 ${isCancelled ? 'opacity-50' : ''}`}><div className="flex flex-col"><span className={`font-medium ${isCancelled ? 'line-through' : 'text-slate-800 dark:text-white'}`}>{invoice.clientName}</span>{invoice.projectName && <span className="text-xs text-slate-500">{invoice.projectName}</span>}</div></td>
                    <td className={`px-6 py-4 text-sm text-slate-500 ${isCancelled ? 'opacity-50' : ''}`}>{new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</td>
                    <td className={`px-6 py-4 text-right font-medium ${isCancelled ? 'opacity-50 line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>{invoice.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className={`px-6 py-4 text-right font-medium ${isCancelled ? 'opacity-50 line-through text-slate-400' : 'text-emerald-600'}`}>{netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setViewingInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Visualizar PDF"><FileText size={18} /></button>
                        {invoice.status !== 'cancelled' && (
                            <>
                                <button onClick={() => { setEditingInvoice(invoice); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit2 size={18} /></button>
                                {invoice.status === 'issued' ? (<button onClick={() => handleMarkAsPaid(invoice)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Marcar como Paga"><Check size={18} /></button>) : (<button onClick={() => handleMarkAsIssued(invoice)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Marcar como Emitida/Pendente"><Clock size={18} /></button>)}
                                <button onClick={() => handleCancelInvoice(invoice)} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Cancelar Nota"><Ban size={18} /></button>
                            </>
                        )}
                        {invoice.status === 'cancelled' && (<button onClick={() => { setEditingInvoice(invoice); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar / Reativar"><Edit2 size={18} /></button>)}
                        <button onClick={() => { if (confirm('Excluir esta nota permanentemente?')) onDeleteInvoice(invoice.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir Permanentemente"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* TOTALIZER FOOTER (Sticky at bottom of list container) */}
        <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-start max-w-6xl ml-auto mr-0 gap-8">
                
                {/* Total Bruto */}
                <div className="text-right flex-1">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Total Bruto</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-white">
                        {tableTotals.gross.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                </div>

                {/* Tributos Retidos */}
                <div className="text-right flex-1 border-l border-slate-300 dark:border-slate-600 pl-8">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Impostos Retidos (Total)</span>
                    <div className="flex items-center justify-end gap-2 text-rose-500 dark:text-rose-400">
                        <TrendingDown size={16} />
                        <span className="text-lg font-bold">
                            {tableTotals.retained.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>

                {/* Tributos a Pagar */}
                <div className="text-right flex-1 border-l border-slate-300 dark:border-slate-600 pl-8">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Impostos a Pagar (Guias)</span>
                    <div className="flex items-center justify-end gap-2 text-amber-600 dark:text-amber-400">
                        <Landmark size={16} />
                        <span className="text-lg font-bold">
                            {tableTotals.toPay.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>

                {/* Total Líquido Real */}
                <div className="text-right flex-1 border-l border-slate-300 dark:border-slate-600 pl-8">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Receita Líquida Real</span>
                    <div className="flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400">
                        <Wallet size={16} />
                        <span className="text-2xl font-bold">
                            {tableTotals.netReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {viewingInvoice && (
        <InvoiceViewer 
          invoice={viewingInvoice}
          companySettings={companySettings}
          client={clients.find(c => c.id === viewingInvoice.clientId)}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
};