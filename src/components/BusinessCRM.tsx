import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Client, Project, ProjectService, ProjectExpense, ServiceInvoice 
} from '../businessTypes';
import { 
  Users, Briefcase, ChevronRight, Plus, Search, 
  Trash2, Save, X, Layout, FileText, Upload,
  Calculator, ChevronDown, 
  Edit2, DollarSign, TrendingDown, Copy, Link, ArrowUpDown, GripVertical
} from 'lucide-react';
import { parseCurrency, generateUUID, parseDate } from '../utils';

interface BusinessCRMProps {
  clients: Client[];
  projects: Project[];
  invoices: ServiceInvoice[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (id: string, client: Partial<Client>) => void;
  onDeleteClient: (id: string) => void;
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onUpdateProject: (id: string, project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onUpdateInvoice: (id: string, data: Partial<ServiceInvoice>) => void;
}

// --- Componentes Internos de Card (Acordeão) ---

const ClientCard = ({ client, isSelected, onClick, onEdit, onDelete, kpis }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
        <div 
            onClick={onClick}
            className={`group p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md mb-2 ${
                isSelected 
                ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 dark:bg-indigo-900/20' 
                : 'bg-white border-slate-200 hover:border-indigo-300 dark:bg-slate-700 dark:border-slate-600'
            }`}
        >
            <div className="flex justify-between items-center h-8">
                <div className="font-bold text-slate-800 dark:text-white truncate flex-1 pr-2">{client.name}</div>
                
                <div className="flex items-center gap-1 shrink-0">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded" 
                            title="Editar"
                        >
                            <Edit2 size={14}/>
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm('Excluir cliente e seus projetos?')) onDelete(); }} 
                            className="p-1 text-red-600 hover:bg-red-100 rounded" 
                            title="Excluir"
                        >
                            <Trash2 size={14}/>
                        </button>
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>
            </div>
            
            {isExpanded && (
                <div className="mt-3 space-y-1 text-xs border-t border-slate-100 dark:border-slate-600 pt-2 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Projetos:</span>
                        <span className="font-bold">{parseCurrency(kpis.totalProjects)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Faturado:</span>
                        <span className="font-bold">{parseCurrency(kpis.totalInvoiced)}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                        <span>A Faturar:</span>
                        <span className="font-bold">{parseCurrency(kpis.remaining)}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProjectCard = ({ project, isSelected, onClick, onDuplicate, statusLabel, statusStyles, value }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div 
            onClick={onClick}
            className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md mb-2 ${statusStyles} ${
                isSelected ? 'ring-2 ring-indigo-500 border-transparent' : ''
            }`}
        >
            <div className="flex justify-between items-center h-8">
                <div className="flex flex-col overflow-hidden pr-2">
                    <div className="font-bold text-slate-800 dark:text-white truncate">{project.name}</div>
                    <div className="text-[10px] text-slate-500">{parseDate(project.startDate)}</div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap ${
                        project.status === 'active' ? 'bg-green-100 text-green-700' : 
                        project.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        project.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-slate-200 text-slate-600'
                    }`}>{statusLabel}</span>

                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-600 animate-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-between items-end mb-2">
                         <span className="text-xs text-slate-500">Valor Total</span>
                         <div className="font-bold text-lg text-slate-700 dark:text-slate-200">{parseCurrency(value)}</div>
                    </div>
                    
                    <button 
                        onClick={(e) => onDuplicate(e, project)} 
                        className="w-full text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 py-1.5 rounded flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-800 transition-colors"
                    >
                        <Copy size={12}/> Duplicar Projeto
                    </button>
                </div>
            )}
        </div>
    );
};

// --- Função Helper ---
const calculateProjectPrice = (services: ProjectService[], expenses: ProjectExpense[], taxRateInput: number) => {
  const totalServices = services.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.value) || 0), 0);
  const totalCost = totalServices + totalExpenses;
  
  const rateDecimal = taxRateInput / 100;
  
  if (rateDecimal >= 0.99) return totalCost; 
  
  return totalCost / (1 - rateDecimal);
};

// --- Componente Principal ---
export const BusinessCRM: React.FC<BusinessCRMProps> = ({
  clients,
  projects,
  invoices,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onUpdateInvoice
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectTab, setProjectTab] = useState<'info' | 'invoices'>('info');
  const [isInvoicePickerOpen, setIsInvoicePickerOpen] = useState(false);
  
  // Estado para larguras das colunas (em porcentagem)
  const [columnWidths, setColumnWidths] = useState([25, 30, 45]); // 25% Clientes, 30% Projetos, 45% Detalhes
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado de Ordenação dos Projetos
  const [projectSort, setProjectSort] = useState<'date' | 'value'>('date');

  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState<Partial<Client>>({});
  
  const [projectForm, setProjectForm] = useState<Partial<Project>>({});
  
  const [clientSearch, setClientSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- EFEITOS DE SELEÇÃO --
  
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId(null); 
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setProjectTab('info');
    const safeProject = JSON.parse(JSON.stringify(project));
    if (!safeProject.services) safeProject.services = [];
    if (!safeProject.expenses) safeProject.expenses = [];
    
    safeProject.taxRate = Number(safeProject.taxRate) || 0;
    
    setProjectForm(safeProject);
  };

  const handleLinkInvoice = (invoice: ServiceInvoice) => {
      if (!selectedProjectId || !selectedClientId) return;
      const client = clients.find(c => c.id === selectedClientId);
      const project = projects.find(p => p.id === selectedProjectId);
      
      onUpdateInvoice(invoice.id, {
          projectId: selectedProjectId,
          projectName: project?.name,
          clientId: selectedClientId,
          clientName: client?.name
      });
      setIsInvoicePickerOpen(false);
  };

  const handleUnlinkInvoice = (invoiceId: string) => {
      onUpdateInvoice(invoiceId, {
          projectId: '', 
          projectName: ''
      });
  };

  const handleNewProject = () => {
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    
    const tempId = generateUUID();
    
    const newProject: Project = {
        id: tempId,
        name: 'Novo Projeto',
        clientId: selectedClientId,
        clientName: client?.name || '',
        description: '',
        services: [],
        expenses: [],
        taxRate: 20, 
        value: 0,
        startDate: new Date().toISOString().split('T')[0],
        status: 'pending'
    };
    
    setSelectedProjectId(tempId);
    setProjectForm(newProject);
    setProjectTab('info');
  };

  // --- DUPLICAÇÃO DE PROJETO ---
  const handleDuplicateProject = (e: React.MouseEvent, projectToDuplicate: Project) => {
    e.stopPropagation(); 
    
    if (!confirm(`Deseja criar uma cópia do projeto "${projectToDuplicate.name}"?`)) return;

    const newProject: Project = JSON.parse(JSON.stringify(projectToDuplicate));
    
    const tempId = generateUUID();
    newProject.id = tempId;
    newProject.name = `${newProject.name} (Cópia)`;
    newProject.status = 'pending';
    newProject.startDate = new Date().toISOString().split('T')[0];
    
    delete newProject.proposalFile;
    delete newProject.proposalFileName;
    delete newProject.proposalUrl;

    setSelectedProjectId(tempId);
    setProjectForm(newProject);
    setProjectTab('info');
  };

  const handleSaveProject = () => {
    if (!projectForm.name) return alert("Nome do projeto é obrigatório.");
    
    const finalValue = calculateProjectPrice(
        projectForm.services || [], 
        projectForm.expenses || [],
        projectForm.taxRate || 0
    );
    
    const projectToSave: any = { ...projectForm, value: finalValue };

    Object.keys(projectToSave).forEach(key => {
        if (projectToSave[key] === undefined) {
            delete projectToSave[key];
        }
    });

    const exists = projects.find(p => p.id === projectToSave.id);
    
    if (exists) {
        onUpdateProject(projectToSave.id, projectToSave);
    } else {
        const { id, ...rest } = projectToSave; 
        onAddProject(rest);
        setSelectedProjectId(null); 
    }
    
    const btn = document.getElementById('save-project-btn');
    if(btn) {
        const originalText = btn.innerText;
        btn.innerText = "Salvo!";
        setTimeout(() => btn.innerText = originalText, 2000);
    }
  };

  // -- CLIENTES --

  const handleNewClientClick = () => {
      setClientForm({ name: '', active: true, document: '', email: '' }); 
      setIsEditingClient(true);
  };

  const handleSaveClient = () => {
      if (!clientForm.name) return alert("Nome é obrigatório");
      
      if (clientForm.id) {
          onUpdateClient(clientForm.id, clientForm);
      } else {
          onAddClient(clientForm as Client);
      }
      setIsEditingClient(false);
  };

  // -- SERVIÇOS & DESPESAS --
  const handleAddService = () => {
      setProjectForm(prev => ({
          ...prev,
          services: [...(prev.services || []), { id: generateUUID(), description: 'Novo Serviço', value: 0 }]
      }));
  };
  const handleUpdateService = (id: string, field: keyof ProjectService, value: any) => {
      setProjectForm(prev => ({
          ...prev,
          services: (prev.services || []).map(s => s.id === id ? { ...s, [field]: value } : s)
      }));
  };
  const handleRemoveService = (id: string) => {
      setProjectForm(prev => ({
          ...prev,
          services: (prev.services || []).filter(s => s.id !== id)
      }));
  };

  const handleAddExpense = () => {
      setProjectForm(prev => ({
          ...prev,
          expenses: [...(prev.expenses || []), { id: generateUUID(), description: 'Nova Despesa', value: 0 }]
      }));
  };
  const handleUpdateExpense = (id: string, field: keyof ProjectExpense, value: any) => {
      setProjectForm(prev => ({
          ...prev,
          expenses: (prev.expenses || []).map(e => e.id === id ? { ...e, [field]: value } : e)
      }));
  };
  const handleRemoveExpense = (id: string) => {
      setProjectForm(prev => ({
          ...prev,
          expenses: (prev.expenses || []).filter(e => e.id !== id)
      }));
  };

  // -- UPLOAD --
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 400 * 1024) {
          alert("Máx 400KB. Use link externo para arquivos maiores.");
          return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
          if (evt.target?.result) {
              setProjectForm(prev => ({
                  ...prev,
                  proposalFile: evt.target?.result as string,
                  proposalFileName: file.name
              }));
          }
      };
      reader.readAsDataURL(file);
  };

  const handleDownloadFile = () => {
      if (projectForm.proposalFile) {
          const link = document.createElement('a');
          link.href = projectForm.proposalFile;
          link.download = projectForm.proposalFileName || 'proposta.pdf';
          link.click();
      }
  };

  // -- CALCULADOS --
  const filteredClients = clients.filter(c => 
      (c.name || '').toLowerCase().includes(clientSearch.toLowerCase())
  );
  
  const sortedClientProjects = useMemo(() => {
      const projs = projects.filter(p => p.clientId === selectedClientId);
      return projs.sort((a, b) => {
          if (projectSort === 'date') {
              return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
          } else {
              return (b.value || 0) - (a.value || 0);
          }
      });
  }, [projects, selectedClientId, projectSort]);
  
  const linkedInvoices = invoices.filter(inv => inv.projectId === selectedProjectId && inv.status !== 'cancelled');
  
  const availableInvoices = invoices.filter(inv => 
    (!inv.projectId || inv.projectId !== selectedProjectId) && 
    inv.status !== 'cancelled' &&
    ((inv.clientName || '').toLowerCase().includes(invoiceSearch.toLowerCase()) || 
     inv.number.toString().includes(invoiceSearch) ||
     (inv.description || '').toLowerCase().includes(invoiceSearch))
  );

  const getClientTotals = (clientId: string) => {
      const myProjects = projects.filter(p => p.clientId === clientId && p.status !== 'cancelled');
      const myProjectIds = myProjects.map(p => p.id);
      const myInvoices = invoices.filter(inv => inv.projectId && myProjectIds.includes(inv.projectId) && inv.status !== 'cancelled');
      
      const totalProjects = myProjects.reduce((acc, p) => acc + (p.value || 0), 0);
      const totalInvoiced = myInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
      
      return { totalProjects, totalInvoiced, remaining: totalProjects - totalInvoiced };
  };

  const totalServices = (projectForm.services || []).reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  const totalExpenses = (projectForm.expenses || []).reduce((acc, e) => acc + (Number(e.value) || 0), 0);
  
  const taxRateInput = Number(projectForm.taxRate) || 0;
  const projectPrice = calculateProjectPrice(projectForm.services || [], projectForm.expenses || [], taxRateInput);
  const taxesValue = projectPrice - (totalServices + totalExpenses);

  const projectTotal = projectForm.value || 0;
  const invoicedTotal = linkedInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const remainingTotal = projectTotal - invoicedTotal;

  // -- REDIMENSIONAMENTO DE COLUNAS (Lógica Nova) --
  const handleDrag = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const startX = e.clientX;
    const startWidths = [...columnWidths];
    const containerWidth = containerRef.current.offsetWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const deltaX = currentX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;

      const newWidths = [...startWidths];
      // Ajusta a coluna atual e a próxima
      newWidths[index] = Math.max(10, startWidths[index] + deltaPercent); 
      newWidths[index + 1] = Math.max(10, startWidths[index + 1] - deltaPercent);
      
      setColumnWidths(newWidths);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };

    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="h-[calc(100vh-80px)] w-full bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col">
        {/* Container Principal Flex para Layout Redimensionável */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden w-full h-full relative">
            
            {/* === COLUNA 1: CLIENTES === */}
            <div 
                className="flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-full"
                style={{ width: `${columnWidths[0]}%` }}
            >
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 h-14 shrink-0">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 truncate">
                        <Users size={18}/> <span className="hidden sm:inline">Clientes</span>
                    </h3>
                    <button 
                        onClick={handleNewClientClick}
                        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        title="Novo Cliente"
                    >
                        <Plus size={18}/>
                    </button>
                </div>
                
                <div className="p-2 border-b border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                        <input 
                            value={clientSearch}
                            onChange={e => setClientSearch(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-xs outline-none"
                            placeholder="Buscar cliente..."
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filteredClients.map(client => {
                        const kpis = getClientTotals(client.id);
                        return (
                            <ClientCard 
                                key={client.id}
                                client={client}
                                kpis={kpis}
                                isSelected={selectedClientId === client.id}
                                onClick={() => handleSelectClient(client.id)}
                                onEdit={() => { setClientForm(client); setIsEditingClient(true); }}
                                onDelete={() => onDeleteClient(client.id)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* RESIZER 1 - Ajustado para não ocupar espaço no flex flow */}
            <div 
                onMouseDown={(e) => handleDrag(0, e)}
                className="w-1.5 -ml-1 hover:w-2 hover:-ml-1 z-20 cursor-col-resize flex items-center justify-center group shrink-0 transition-all bg-transparent hover:bg-indigo-400/50 absolute h-full"
                style={{ left: `${columnWidths[0]}%` }}
            >
                <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
            </div>

            {/* === COLUNA 2: PROJETOS === */}
            <div 
                className="flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-full"
                style={{ width: `${columnWidths[1]}%` }}
            >
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 h-14 shrink-0">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 truncate">
                        <Briefcase size={18}/> <span className="hidden sm:inline">Projetos</span>
                    </h3>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setProjectSort(prev => prev === 'date' ? 'value' : 'date')} 
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                            title={projectSort === 'date' ? 'Ordenar por Valor' : 'Ordenar por Data'}
                        >
                            <ArrowUpDown size={16}/>
                        </button>
                        <button 
                            onClick={handleNewProject} 
                            disabled={!selectedClientId}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Novo Projeto"
                        >
                            <Plus size={18}/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {!selectedClientId ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
                            <Users size={24} className="opacity-20"/>
                            Selecione um cliente
                        </div>
                    ) : sortedClientProjects.length === 0 ? (
                        <div className="text-center text-xs text-slate-400 py-10">Nenhum projeto.</div>
                    ) : (
                        sortedClientProjects.map(project => {
                            let statusStyles = 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600';
                            let statusLabel = 'Em Andamento';
                            
                            if (project.status === 'completed') {
                                statusStyles = 'bg-slate-50 border-slate-200 opacity-80';
                                statusLabel = 'Arquivado';
                            } else if (project.status === 'cancelled') {
                                statusStyles = 'bg-red-50 border-red-200 dark:bg-red-900/20';
                                statusLabel = 'Cancelado';
                            } else if (project.status === 'pending') {
                                statusStyles = 'bg-amber-50 border-amber-200 dark:bg-amber-900/20';
                                statusLabel = 'Proposta';
                            }

                            return (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    value={project.value}
                                    statusLabel={statusLabel}
                                    statusStyles={statusStyles}
                                    isSelected={selectedProjectId === project.id}
                                    onClick={() => handleSelectProject(project)}
                                    onDuplicate={handleDuplicateProject}
                                />
                            );
                        })
                    )}
                </div>
            </div>

            {/* RESIZER 2 - Ajustado para não ocupar espaço no flex flow */}
            <div 
                onMouseDown={(e) => handleDrag(1, e)}
                className="w-1.5 -ml-1 hover:w-2 hover:-ml-1 z-20 cursor-col-resize flex items-center justify-center group shrink-0 transition-all bg-transparent hover:bg-indigo-400/50 absolute h-full"
                style={{ left: `${columnWidths[0] + columnWidths[1]}%` }}
            >
                 <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
            </div>

            {/* === COLUNA 3: DETALHES & PRECIFICAÇÃO === */}
            <div 
                className="flex flex-col bg-white dark:bg-slate-800 h-full"
                style={{ width: `${columnWidths[2]}%` }}
            >
                {!selectedProjectId ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-3">
                        <Layout size={40} className="opacity-20"/>
                        <p>Selecione um projeto para ver detalhes</p>
                    </div>
                ) : (
                    <>
                        <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center h-14 shrink-0">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 truncate">
                                <Layout size={18} className="text-indigo-600 shrink-0"/> 
                                <span className="truncate">{projectForm.name || 'Novo Projeto'}</span>
                            </h3>
                            <div className="flex gap-2 items-center shrink-0">
                                <select 
                                    value={projectForm.status || 'pending'} 
                                    onChange={e => setProjectForm({...projectForm, status: e.target.value as any})}
                                    className={`p-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                                        projectForm.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                        projectForm.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                        projectForm.status === 'completed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                        'bg-red-50 text-red-700 border-red-200'
                                    }`}
                                >
                                    <option value="pending">Proposta</option>
                                    <option value="active">Em Andamento</option>
                                    <option value="completed">Concluído</option>
                                    <option value="cancelled">Cancelado</option>
                                </select>
                                <button 
                                    id="save-project-btn"
                                    onClick={handleSaveProject} 
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm transition-transform active:scale-95"
                                >
                                    <Save size={16}/> Salvar
                                </button>
                            </div>
                        </div>
                        
                        {/* Abas */}
                        <div className="px-4 pt-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex gap-2 shrink-0">
                            <button 
                                onClick={() => setProjectTab('info')}
                                className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${projectTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Informações
                            </button>
                            <button 
                                onClick={() => setProjectTab('invoices')}
                                className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors ${projectTab === 'invoices' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Notas ({linkedInvoices.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
                            
                            {/* CONTEÚDO DA ABA INFO */}
                            {projectTab === 'info' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Nome do Projeto</label>
                                            <input 
                                                value={projectForm.name || ''} 
                                                onChange={e => setProjectForm({...projectForm, name: e.target.value})}
                                                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:text-white font-bold text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Data Início</label>
                                            <input 
                                                type="date"
                                                value={projectForm.startDate || ''} 
                                                onChange={e => setProjectForm({...projectForm, startDate: e.target.value})}
                                                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                                            />
                                        </div>
                                        
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Descrição / Escopo</label>
                                            <textarea 
                                                value={projectForm.description || ''} 
                                                onChange={e => setProjectForm({...projectForm, description: e.target.value})}
                                                className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:text-white h-20 resize-none text-sm"
                                                placeholder="Descreva o escopo..."
                                            />
                                        </div>
                                        
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Proposta (PDF)</label>
                                            <div className="flex gap-2 items-center">
                                                <input 
                                                    type="file" 
                                                    ref={fileInputRef}
                                                    accept=".pdf"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                />
                                                <button 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <Upload size={14}/> {projectForm.proposalFile ? 'Trocar' : 'Enviar'}
                                                </button>
                                                {projectForm.proposalFile ? (
                                                    <button onClick={handleDownloadFile} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs hover:bg-indigo-100 max-w-full overflow-hidden">
                                                        <FileText size={14}/> 
                                                        <span className="truncate">{projectForm.proposalFileName || 'Proposta.pdf'}</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Nenhum arquivo.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <hr className="border-slate-100 dark:border-slate-700" />

                                    {/* COMPOSIÇÃO FINANCEIRA */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-sm dark:text-white flex items-center gap-2"><Calculator size={16} className="text-emerald-500"/> Composição Financeira</h4>
                                        </div>

                                        {/* 1. SERVIÇOS */}
                                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Serviços</h5>
                                                <button onClick={handleAddService} className="text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                                    <Plus size={10}/> Adicionar
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {(projectForm.services || []).map((service, idx) => (
                                                    <div key={service.id || idx} className="flex gap-2 items-center group">
                                                        <input 
                                                            value={service.description || ''} 
                                                            onChange={e => handleUpdateService(service.id, 'description', e.target.value)}
                                                            className="flex-1 p-1.5 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs outline-none"
                                                            placeholder="Descrição..."
                                                        />
                                                        <div className="w-24 relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                                                            <input 
                                                                type="number"
                                                                value={service.value || 0} 
                                                                onChange={e => handleUpdateService(service.id, 'value', parseFloat(e.target.value))}
                                                                className="w-full p-1.5 pl-6 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs text-right font-medium outline-none"
                                                            />
                                                        </div>
                                                        <button onClick={() => handleRemoveService(service.id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={14}/>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 2. DESPESAS */}
                                        <div className="bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-800">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="text-xs font-bold text-orange-800 dark:text-orange-400 flex items-center gap-1"><TrendingDown size={12}/> Despesas</h5>
                                                <button onClick={handleAddExpense} className="text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 px-2 py-1 rounded transition-colors flex items-center gap-1">
                                                    <Plus size={10}/> Adicionar
                                                </button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {(projectForm.expenses || []).map((expense, idx) => (
                                                    <div key={expense.id || idx} className="flex gap-2 items-center group">
                                                        <input 
                                                            value={expense.description || ''} 
                                                            onChange={e => handleUpdateExpense(expense.id, 'description', e.target.value)}
                                                            className="flex-1 p-1.5 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs outline-none"
                                                            placeholder="Descrição..."
                                                        />
                                                        <div className="w-24 relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">R$</span>
                                                            <input 
                                                                type="number"
                                                                value={expense.value || 0} 
                                                                onChange={e => handleUpdateExpense(expense.id, 'value', parseFloat(e.target.value))}
                                                                className="w-full p-1.5 pl-6 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-xs text-right font-medium outline-none text-orange-600"
                                                            />
                                                        </div>
                                                        <button onClick={() => handleRemoveExpense(expense.id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X size={14}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {(projectForm.expenses || []).length === 0 && (
                                                    <div className="text-[10px] text-orange-400/50 italic text-center">Nenhuma despesa.</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Calculadora Final */}
                                        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                                                <span className="text-slate-400">Total Serviços</span>
                                                <span className="text-right font-medium">{parseCurrency(totalServices)}</span>
                                                
                                                <span className="text-slate-400">Total Despesas</span>
                                                <span className="text-right font-medium text-orange-400">+ {parseCurrency(totalExpenses)}</span>
                                                
                                                <div className="col-span-2 border-t border-slate-700 my-1"></div>
                                                
                                                <span className="text-slate-300 font-bold">Custo Base</span>
                                                <span className="text-right font-bold">{parseCurrency(totalServices + totalExpenses)}</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center mb-4 bg-slate-800 p-2 rounded-lg">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Taxa Imposto/Margem</span>
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={projectForm.taxRate || 0} 
                                                        onChange={e => setProjectForm({...projectForm, taxRate: parseFloat(e.target.value)})}
                                                        className="w-12 p-1 text-right border border-slate-600 rounded bg-slate-700 text-white text-xs font-bold"
                                                    />
                                                    <span className="text-slate-400 text-[10px]">%</span>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-700 pt-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] text-indigo-400 font-bold uppercase">Impostos Incluídos</span>
                                                    <span className="text-[10px] text-indigo-400 font-bold">{parseCurrency(taxesValue)}</span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Preço Final</span>
                                                    </div>
                                                    <span className="text-2xl font-black text-white">
                                                        {parseCurrency(projectPrice)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* CONTEÚDO DA ABA NOTAS FISCAIS */}
                            {projectTab === 'invoices' && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-sm dark:text-white">Notas Vinculadas</h4>
                                        <button onClick={() => setIsInvoicePickerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">
                                            <Link size={14}/> Vincular
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {linkedInvoices.length === 0 && <div className="text-center py-8 text-slate-400 border border-dashed rounded-xl text-xs">Nenhuma nota fiscal vinculada.</div>}
                                        {linkedInvoices.map(inv => (
                                            <div key={inv.id} className="p-3 border rounded-xl bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-sm text-slate-800 dark:text-white">NF {inv.number} <span className="text-xs font-normal text-slate-500 ml-1">{parseDate(inv.issueDate)}</span></div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{inv.description}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-emerald-600 text-sm">{parseCurrency(inv.amount)}</span>
                                                    <button onClick={() => handleUnlinkInvoice(inv.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Desvincular"><X size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-4 border-t border-slate-200 pt-4">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                            <div className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total do Projeto</div>
                                            <div className="text-lg font-bold dark:text-white">{parseCurrency(projectTotal)}</div>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                                            <div className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total Faturado</div>
                                            <div className="text-lg font-bold text-emerald-600">{parseCurrency(invoicedTotal)}</div>
                                        </div>
                                        <div className="col-span-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex justify-between items-center">
                                            <div className="text-indigo-800 dark:text-indigo-300 text-xs font-bold uppercase">A Faturar</div>
                                            <div className="text-xl font-black text-indigo-700 dark:text-indigo-400">{parseCurrency(remainingTotal)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Modal de Picker de Notas */}
        {isInvoicePickerOpen && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg dark:text-white">Vincular Nota Fiscal</h3>
                        <button onClick={() => setIsInvoicePickerOpen(false)}><X className="text-slate-400"/></button>
                    </div>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} className="w-full pl-9 p-2 border rounded-lg dark:bg-slate-700 dark:text-white" placeholder="Buscar por número, cliente ou descrição..."/>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {availableInvoices.length === 0 && <div className="text-center text-slate-400 py-4">Nenhuma nota disponível.</div>}
                        {availableInvoices.map(inv => (
                            <button key={inv.id} onClick={() => handleLinkInvoice(inv)} className="w-full p-3 border rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left flex justify-between items-center group">
                                <div>
                                    <div className="font-bold text-sm dark:text-white">NF {inv.number} - {inv.clientName}</div>
                                    <div className="text-xs text-slate-500">{parseCurrency(inv.amount)} • {parseDate(inv.issueDate)}</div>
                                </div>
                                <Plus size={18} className="text-indigo-600 opacity-0 group-hover:opacity-100"/>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Modal de Edição de Cliente (Rápido) */}
        {isEditingClient && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">Editar Cliente</h3>
                    <div className="space-y-3">
                        <input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="Nome Fantasia" value={clientForm.name || ''} onChange={e => setClientForm({...clientForm, name: e.target.value})}/>
                        <input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="CNPJ" value={clientForm.document || ''} onChange={e => setClientForm({...clientForm, document: e.target.value})}/>
                        <input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" placeholder="Email" value={clientForm.email || ''} onChange={e => setClientForm({...clientForm, email: e.target.value})}/>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setIsEditingClient(false)} className="px-4 py-2 border rounded dark:text-white">Cancelar</button>
                        <button 
                            onClick={handleSaveClient}
                            className="px-4 py-2 bg-indigo-600 text-white rounded font-bold"
                        >
                            Salvar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};