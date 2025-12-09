import React, { useState } from 'react';
import { 
  BusinessTransaction, BusinessAccount, BusinessCategory, BusinessPartner, Project, Client, ServiceInvoice 
} from '../businessTypes';
import { LayoutDashboard, List, Layers, Tag, Wallet } from 'lucide-react';

import { AccountingDashboard } from './accounting/AccountingDashboard';
import { AccountingLedger } from './accounting/AccountingLedger';
import { AccountingAccounts } from './accounting/AccountingAccounts';
import { TransactionModal } from './accounting/TransactionModal';
import { AccountingConfig } from './accounting/AccountingConfig';

interface BusinessAccountingProps {
  transactions: BusinessTransaction[];
  accounts: BusinessAccount[];
  categories: BusinessCategory[];
  partners: BusinessPartner[];
  projects?: Project[];
  clients?: Client[];
  invoices?: ServiceInvoice[]; 
  onAddTransaction: (tx: Omit<BusinessTransaction, 'id'>) => void;
  onUpdateTransaction: (id: string, tx: Partial<BusinessTransaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onAddAccount: (acc: Omit<BusinessAccount, 'id'>) => void;
  onUpdateAccount: (id: string, acc: Partial<BusinessAccount>) => void;
  onDeleteAccount: (id: string) => void;
  onAddCategory: (cat: Omit<BusinessCategory, 'id'>) => void;
  onUpdateCategory: (id: string, cat: Partial<BusinessCategory>) => void;
  onDeleteCategory: (id: string) => void;
}

export const BusinessAccounting: React.FC<BusinessAccountingProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'accounts' | 'config'>('dashboard');
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<any>(null);
  const [bulkEditIds, setBulkEditIds] = useState<string[]>([]);

  const handleOpenNewTx = () => {
    setEditingTx(null);
    setBulkEditIds([]);
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: BusinessTransaction) => {
    setEditingTx(tx);
    setBulkEditIds([]);
    setIsTxModalOpen(true);
  };

  // Lógica de Duplicação
  const handleDuplicateTx = (tx: BusinessTransaction) => {
      // Remove o ID para que seja salvo como novo
      const { id, ...rest } = tx;
      // Define status como pendente por segurança ao duplicar
      setEditingTx({ 
          ...rest, 
          status: 'pending', 
          datePaid: '', // Limpa data de pagamento
          description: `${rest.description} (Cópia)` 
      });
      setBulkEditIds([]);
      setIsTxModalOpen(true);
  };

  const handleOpenBulkEdit = (ids: string[]) => {
      const selectedTxs = props.transactions.filter(t => ids.includes(t.id));
      if (selectedTxs.length === 0) return;

      const getCommon = (key: keyof BusinessTransaction) => {
          const firstVal = selectedTxs[0][key];
          const val1 = firstVal === undefined || firstVal === null ? '' : firstVal;
          const allMatch = selectedTxs.every(t => {
              const val2 = t[key] === undefined || t[key] === null ? '' : t[key];
              return val2 === val1;
          });
          return allMatch ? firstVal : '__MIXED__';
      };

      const mixedTx = {
          id: 'BULK_EDIT',
          description: getCommon('description'),
          value: getCommon('value'),
          date: getCommon('date'),
          datePaid: getCommon('datePaid'),
          accountId: getCommon('accountId'),
          categoryId: getCommon('categoryId'),
          type: getCommon('type'),
          status: getCommon('status'),
          projectId: getCommon('projectId'),
          clientId: getCommon('clientId'),
          partnerId: getCommon('partnerId'),
          invoiceId: getCommon('invoiceId'),
      };

      setEditingTx(mixedTx);
      setBulkEditIds(ids);
      setIsTxModalOpen(true);
  };

  const sanitizeData = (data: any) => {
      const clean: any = {};
      Object.keys(data).forEach(key => {
          if (data[key] !== undefined) {
              clean[key] = data[key];
          }
      });
      return clean;
  };

  const handleSaveTx = (txData: any) => {
      if (bulkEditIds.length > 0) {
          const updates: any = {};
          Object.keys(txData).forEach(key => {
              if (txData[key] !== '__MIXED__' && key !== 'id') {
                  updates[key] = txData[key];
              }
          });

          if (updates.categoryId && updates.categoryId !== '__MIXED__') {
             updates.categoryName = props.categories.find(c => c.id === updates.categoryId)?.name || '';
          }
          if (updates.accountId && updates.accountId !== '__MIXED__') {
             updates.accountName = props.accounts.find(a => a.id === updates.accountId)?.name || '';
          }
          if (updates.status === 'paid' && !updates.datePaid && updates.date) {
               updates.datePaid = updates.date;
          }

          const safeUpdates = sanitizeData(updates);
          if (Object.keys(safeUpdates).length > 0) {
              bulkEditIds.forEach(id => props.onUpdateTransaction(id, safeUpdates));
          }
      } else {
          if (txData.projectId === undefined) txData.projectId = '';
          if (txData.clientId === undefined) txData.clientId = '';
          if (txData.partnerId === undefined) txData.partnerId = '';
          if (txData.invoiceId === undefined) txData.invoiceId = '';
          if (txData.datePaid === undefined) txData.datePaid = '';

          const safeData = sanitizeData(txData);

          if (editingTx && editingTx.id && editingTx.id !== 'BULK_EDIT') {
              props.onUpdateTransaction(editingTx.id, safeData);
          } else {
              props.onAddTransaction(safeData);
          }
      }
      setIsTxModalOpen(false);
      setBulkEditIds([]);
  };

  const handleImportCSV = (data: any[], accountId: string) => {
      data.forEach(item => {
          const safeItem = sanitizeData({ ...item, accountId });
          props.onAddTransaction(safeItem);
      });
      alert(`${data.length} transações importadas.`);
  };

  return (
    <div className="h-full flex flex-col space-y-6 w-full">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
          <Wallet className="text-indigo-600"/> Fluxo de Caixa
        </h2>
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}><LayoutDashboard size={16}/> Visão Geral</button>
          <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'ledger' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}><List size={16}/> Extrato</button>
          <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'accounts' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}><Layers size={16}/> Contas & Cartões</button>
          <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'config' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-white' : 'text-slate-500'}`}><Tag size={16}/> Config</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 custom-scrollbar pr-2 overflow-y-auto w-full">
        {activeTab === 'dashboard' && (
            <AccountingDashboard 
                transactions={props.transactions} 
                accounts={props.accounts} 
                categories={props.categories} 
                partners={props.partners}
                clients={props.clients || []}
                projects={props.projects || []}
                year={year} 
                setYear={setYear}
                onSyncTaxes={() => {}} 
                onEditTransaction={handleEditTx}
            />
        )}
        
        {activeTab === 'ledger' && (
            <AccountingLedger 
                transactions={props.transactions}
                accounts={props.accounts}
                categories={props.categories}
                partners={props.partners}
                clients={props.clients || []}
                invoices={props.invoices || []}
                onAddTransaction={handleOpenNewTx}
                onEditTransaction={handleEditTx}
                onDuplicateTransaction={handleDuplicateTx} // <--- Passando o handler
                onDeleteTransaction={props.onDeleteTransaction}
                onBulkDelete={(ids) => { if(confirm(`Excluir ${ids.length}?`)) ids.forEach(id => props.onDeleteTransaction(id)); }} 
                onBulkEditOpen={handleOpenBulkEdit}
                onImportCSV={handleImportCSV}
            />
        )}

        {activeTab === 'accounts' && (
            <AccountingAccounts 
                accounts={props.accounts}
                transactions={props.transactions}
                onAddAccount={props.onAddAccount}
                onUpdateAccount={props.onUpdateAccount}
                onDeleteAccount={props.onDeleteAccount}
                onAddTransaction={props.onAddTransaction}
            />
        )}

        {activeTab === 'config' && (
            <AccountingConfig 
                categories={props.categories}
                onAddCategory={props.onAddCategory}
                onUpdateCategory={props.onUpdateCategory}
                onDeleteCategory={props.onDeleteCategory}
            />
        )}
      </div>

      <TransactionModal 
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          onSave={handleSaveTx}
          initialData={editingTx}
          isBulk={bulkEditIds.length > 0} 
          accounts={props.accounts}
          categories={props.categories}
          projects={props.projects || []}
          clients={props.clients || []}
          partners={props.partners}
          invoices={props.invoices || []}
      />
    </div>
  );
};