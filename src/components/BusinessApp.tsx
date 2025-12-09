import React, { useState } from 'react';
import { 
  Building2, LayoutDashboard, FileText, ArrowLeft, Briefcase, Users, 
  PieChart, Wallet, Settings, ShieldCheck, CheckSquare, CalendarCheck 
} from 'lucide-react';
import { User } from '../types';
import { BusinessDashboard } from './BusinessDashboard';
import { BusinessInvoices } from './BusinessInvoices';
import { BusinessTaxes } from './BusinessTaxes';
import { BusinessSettings } from './BusinessSettings';
import { BusinessCRM } from './BusinessCRM';
import { BusinessPartners } from './BusinessPartners';
import { BusinessProjects } from './BusinessProjects'; 
import { BusinessAccounting } from './BusinessAccounting'; 
import { InvoiceViewer } from './InvoiceViewer';
import { ServiceInvoice, CompanySettings } from '../businessTypes';
import { useBusinessData } from '../hooks/useBusinessData'; 

interface BusinessAppProps {
  user: User;
  onBackToSelection: () => void;
}

type BusinessView = 'dashboard' | 'crm' | 'projects' | 'invoices' | 'taxes' | 'cashflow' | 'settings' | 'partners';

const DEFAULT_SETTINGS_FALLBACK: CompanySettings = {
  companyName: '', cnpj: '', municipalRegistry: '', address: '',
  bankName: '', bankCode: '', agency: '', account: '', pixKey: '',
  contactName: '', phone: '', email: ''
};

export const BusinessApp: React.FC<BusinessAppProps> = ({ user, onBackToSelection }) => {
  const [currentView, setCurrentView] = useState<BusinessView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const { 
    invoices, clients, projects, tasks, 
    taxPayments, partners, 
    accounts, transactions, categories,
    saveTaxPayment,
    settings: companySettings, loading,
    addInvoice, updateInvoice, deleteInvoice,
    addClient, updateClient, deleteClient,
    addProject, updateProject, deleteProject,
    addTask, updateTask, deleteTask, 
    addPartner, updatePartner, deletePartner, 
    addAccount, updateAccount, deleteAccount,
    addTransaction, updateTransaction, deleteTransaction,
    addCategory, updateCategory, deleteCategory, 
    saveSettings
  } = useBusinessData(user.id);

  const [viewInvoice, setViewInvoice] = useState<ServiceInvoice | null>(null);

  const isCollaborator = user.role === 'collaborator';

  if (isCollaborator && currentView !== 'projects') {
      setCurrentView('projects');
  }

  const handleNavigate = (view: any) => {
      setCurrentView(view as BusinessView);
  };

  const renderContent = () => {
    if (isCollaborator) {
        return (
          <BusinessProjects 
            projects={projects}
            tasks={tasks}
            partners={partners}
            currentUser={{ name: user.username, id: user.id, email: user.email }}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        );
    }

    switch (currentView) {
      case 'dashboard':
        return (
            <BusinessDashboard 
                invoices={invoices} 
                transactions={transactions}
                categories={categories}
                projects={projects}
                clients={clients}
                taxPayments={taxPayments}
                partners={partners} // <--- Passando partners para o Dashboard
                onNavigate={handleNavigate}
            />
        );
      
      case 'crm':
        return (
          <BusinessCRM 
            clients={clients}
            projects={projects}
            invoices={invoices} 
            onAddClient={addClient}
            onUpdateClient={updateClient}
            onDeleteClient={deleteClient}
            onAddProject={addProject}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
            onUpdateInvoice={updateInvoice} 
          />
        );

      case 'projects':
        return (
          <BusinessProjects 
            projects={projects}
            tasks={tasks}
            partners={partners}
            currentUser={{ name: user.username, id: user.id, email: user.email }}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        );

      case 'invoices':
        return (
          <BusinessInvoices 
            invoices={invoices} 
            clients={clients}
            projects={projects} 
            onAddInvoice={addInvoice}
            onUpdateInvoice={updateInvoice}
            onDeleteInvoice={deleteInvoice}
            onImportCSV={() => {}}
            onViewInvoice={setViewInvoice}
            companySettings={companySettings || DEFAULT_SETTINGS_FALLBACK}
          />
        );
      
      case 'taxes':
        return (
          <BusinessTaxes 
            invoices={invoices}
            payments={taxPayments}
            onSavePayment={saveTaxPayment}
          />
        );
        
      case 'settings':
        return <BusinessSettings initialSettings={companySettings || DEFAULT_SETTINGS_FALLBACK} onSave={saveSettings} />;
      
      case 'partners': 
        return (
          <BusinessPartners 
            partners={partners}
            onAddPartner={addPartner}
            onUpdatePartner={updatePartner}
            onDeletePartner={deletePartner}
          />
        );

      case 'cashflow':
        return (
          <BusinessAccounting 
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            partners={partners}
            projects={projects} 
            clients={clients}
            invoices={invoices} 
            onAddTransaction={addTransaction}
            onUpdateTransaction={updateTransaction}
            onDeleteTransaction={deleteTransaction}
            onAddAccount={addAccount}
            onUpdateAccount={updateAccount}
            onDeleteAccount={deleteAccount}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onDeleteCategory={deleteCategory}
          />
        );
        
      default:
        return (
            <BusinessDashboard 
                invoices={invoices} 
                transactions={transactions}
                categories={categories}
                projects={projects}
                clients={clients}
                taxPayments={taxPayments}
                partners={partners}
                onNavigate={handleNavigate}
            />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 flex flex-col z-20`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3"><div className="bg-indigo-600 p-2 rounded-lg"><Building2 className="text-white" size={24} /></div><div><h1 className="font-bold text-slate-800 dark:text-white leading-tight">DAO</h1><span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Business</span></div></div>
          ) : (
            <div className="bg-indigo-600 p-2 rounded-lg mx-auto"><Building2 className="text-white" size={24} /></div>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
          
          {!isCollaborator && (
            <>
              <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><LayoutDashboard size={20} />{isSidebarOpen && <span className="font-medium">Visão Geral</span>}</button>
              <button onClick={() => setCurrentView('crm')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'crm' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><Briefcase size={20} />{isSidebarOpen && <span className="font-medium">Gestão (CRM)</span>}</button>
            </>
          )}

          <button onClick={() => setCurrentView('projects')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'projects' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><CalendarCheck size={20} />{isSidebarOpen && <span className="font-medium">Atividades</span>}</button>

          {!isCollaborator && (
            <>
              <button onClick={() => setCurrentView('invoices')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'invoices' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><FileText size={20} />{isSidebarOpen && <span className="font-medium">Notas Fiscais</span>}</button>
              <button onClick={() => setCurrentView('taxes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'taxes' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><PieChart size={20} />{isSidebarOpen && <span className="font-medium">Tributos</span>}</button>
              <button onClick={() => setCurrentView('cashflow')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'cashflow' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><Wallet size={20} />{isSidebarOpen && <span className="font-medium">Fluxo de Caixa</span>}</button>
              
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <button onClick={() => setCurrentView('partners')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'partners' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><ShieldCheck size={20} />{isSidebarOpen && <span className="font-medium">Profissionais</span>}</button>
                <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${currentView === 'settings' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'} ${!isSidebarOpen && 'justify-center'}`}><Settings size={20} />{isSidebarOpen && <span className="font-medium">Configurações</span>}</button>
              </div>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"><div className={`h-1 w-8 rounded-full bg-slate-300 ${isSidebarOpen ? '' : 'rotate-90'} transition-transform`} /></button>
          <button onClick={onBackToSelection} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors ${!isSidebarOpen && 'justify-center'}`}><ArrowLeft size={20} />{isSidebarOpen && <span className="font-medium text-sm">Voltar ao Menu</span>}</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto relative">
        <div className="p-8 max-w-7xl mx-auto">{loading ? <div className="flex items-center justify-center h-full text-slate-500">Carregando dados...</div> : renderContent()}</div>
      </main>
      {viewInvoice && <InvoiceViewer invoice={viewInvoice} companySettings={companySettings || DEFAULT_SETTINGS_FALLBACK} onClose={() => setViewInvoice(null)} />}
    </div>
  );
};