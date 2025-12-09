import { useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  where
} from 'firebase/firestore';
import { 
  ServiceInvoice, Client, CompanySettings, Project, 
  TaxPayment, BusinessPartner, ProjectTask, 
  BusinessAccount, BusinessTransaction, BusinessCategory 
} from '../businessTypes';
import { grantAccess, revokeAccess } from '../api';

export const useBusinessData = (userId: string) => {
  // Estados Existentes
  const [invoices, setInvoices] = useState<ServiceInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
  const [partners, setPartners] = useState<BusinessPartner[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  
  // Novos Estados para Contabilidade
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [transactions, setTransactions] = useState<BusinessTransaction[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);

  const [loading, setLoading] = useState(true);

  const db = getFirestore();
  const appId = typeof window !== 'undefined' && (window as any).__app_id ? (window as any).__app_id : 'default-app';

  const getCollectionPath = (collectionName: string) => 
    collection(db, 'artifacts', appId, 'users', userId, collectionName);

  const getDocPath = (collectionName: string, docId: string) =>
    doc(db, 'artifacts', appId, 'users', userId, collectionName, docId);

  useEffect(() => {
    if (!userId) return;

    // --- Listeners Existentes ---
    const settingsCol = getCollectionPath('business_settings');
    const unsubSettings = onSnapshot(settingsCol, (snapshot) => {
      if (!snapshot.empty) {
        const data = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as CompanySettings;
        setSettings(data);
      } else {
        setSettings(null);
      }
    });

    const invoicesQuery = query(getCollectionPath('business_invoices'), orderBy('number', 'desc'));
    const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ServiceInvoice));
      setInvoices(data);
    });

    const clientsQuery = query(getCollectionPath('business_clients'), orderBy('name', 'asc'));
    const unsubClients = onSnapshot(clientsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client));
      setClients(data);
    });

    const projectsQuery = query(getCollectionPath('business_projects'), orderBy('name', 'asc'));
    const unsubProjects = onSnapshot(projectsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Project));
      setProjects(data);
    });

    const tasksQuery = query(getCollectionPath('business_tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ProjectTask));
      setTasks(data);
    });

    const taxQuery = query(getCollectionPath('business_tax_payments'), orderBy('period', 'desc'));
    const unsubTax = onSnapshot(taxQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as TaxPayment));
      setTaxPayments(data);
    });

    const partnersQuery = query(getCollectionPath('business_partners'), orderBy('name', 'asc'));
    const unsubPartners = onSnapshot(partnersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BusinessPartner));
      setPartners(data);
    });

    // --- NOVOS LISTENERS DE CONTABILIDADE ---
    
    // Contas
    const accountsQuery = query(getCollectionPath('business_accounts'), orderBy('name', 'asc'));
    const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BusinessAccount));
      setAccounts(data);
    });

    // Transações
    const transactionsQuery = query(getCollectionPath('business_transactions'), orderBy('date', 'desc'));
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BusinessTransaction));
      setTransactions(data);
    });

    // Categorias
    const categoriesQuery = query(getCollectionPath('business_categories'), orderBy('name', 'asc'));
    const unsubCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BusinessCategory));
      setCategories(data);
    });

    setLoading(false);

    return () => {
      unsubSettings();
      unsubInvoices();
      unsubClients();
      unsubProjects();
      unsubTasks();
      unsubTax();
      unsubPartners();
      unsubAccounts();
      unsubTransactions();
      unsubCategories();
    };
  }, [userId]);

  // --- ACTIONS ---
  const addInvoice = async (invoice: Omit<ServiceInvoice, 'id'>) => { await addDoc(getCollectionPath('business_invoices'), invoice); };
  const updateInvoice = async (id: string, invoice: Partial<ServiceInvoice>) => { if (!id) return; await updateDoc(getDocPath('business_invoices', id), invoice); };
  const deleteInvoice = async (id: string) => { if (!id) return; await deleteDoc(getDocPath('business_invoices', id)); };

  const addClient = async (client: Omit<Client, 'id'>) => { const { id, ...cleanClient } = client as any; await addDoc(getCollectionPath('business_clients'), cleanClient); };
  const updateClient = async (id: string, client: Partial<Client>) => { if (!id) return; const { id: _, ...cleanClient } = client as any; await updateDoc(getDocPath('business_clients', id), cleanClient); };
  const deleteClient = async (id: string) => { if (!id) return; await deleteDoc(getDocPath('business_clients', id)); };

  const addProject = async (project: Omit<Project, 'id'>) => { const { id, ...cleanProject } = project as any; await addDoc(getCollectionPath('business_projects'), cleanProject); };
  const updateProject = async (id: string, project: Partial<Project>) => { if (!id) return; const { id: _, ...cleanProject } = project as any; await updateDoc(getDocPath('business_projects', id), cleanProject); };
  const deleteProject = async (id: string) => { if (!id) return; await deleteDoc(getDocPath('business_projects', id)); };

  const addTask = async (task: Omit<ProjectTask, 'id'>) => { const { id, ...cleanTask } = task as any; await addDoc(getCollectionPath('business_tasks'), cleanTask); };
  const updateTask = async (id: string, task: Partial<ProjectTask>) => { if (!id) return; const { id: _, ...cleanTask } = task as any; await updateDoc(getDocPath('business_tasks', id), cleanTask); };
  const deleteTask = async (id: string) => { if (!id) return; await deleteDoc(getDocPath('business_tasks', id)); };

  const saveSettings = async (newSettings: CompanySettings) => { const docRef = getDocPath('business_settings', 'company_info'); await setDoc(docRef, newSettings, { merge: true }); };
  const saveTaxPayment = async (payment: TaxPayment) => { if (!payment.id) return; const docRef = getDocPath('business_tax_payments', payment.id); const { id, ...data } = payment; await setDoc(docRef, data, { merge: true }); };

  const addPartner = async (partner: Omit<BusinessPartner, 'id'>) => {
    const { id, ...cleanPartner } = partner as any;
    await addDoc(getCollectionPath('business_partners'), cleanPartner);
    if (cleanPartner.active && cleanPartner.email) {
      const companyName = settings?.companyName || 'Empresa';
      await grantAccess(cleanPartner.email, userId, cleanPartner.role, companyName);
    }
  };

  const updatePartner = async (id: string, partner: Partial<BusinessPartner>) => {
    if (!id) return;
    const { id: _, ...cleanPartner } = partner as any;
    await updateDoc(getDocPath('business_partners', id), cleanPartner);
    if (partner.email) {
       if (partner.active === false) { await revokeAccess(partner.email); } 
       else { 
           const companyName = settings?.companyName || 'Empresa';
           await grantAccess(partner.email, userId, partner.role || 'collaborator', companyName); 
       }
    }
  };

  const deletePartner = async (id: string) => { if (!id) return; const partnerToDelete = partners.find(p => p.id === id); await deleteDoc(getDocPath('business_partners', id)); if (partnerToDelete?.email) { await revokeAccess(partnerToDelete.email); } };

  // --- CONTABILIDADE ---

  const addAccount = async (account: Omit<BusinessAccount, 'id'>) => { const { id, ...clean } = account as any; await addDoc(getCollectionPath('business_accounts'), clean); };
  const updateAccount = async (id: string, account: Partial<BusinessAccount>) => { if(!id) return; await updateDoc(getDocPath('business_accounts', id), account); };
  const deleteAccount = async (id: string) => { if(!id) return; await deleteDoc(getDocPath('business_accounts', id)); };

  const addTransaction = async (tx: Omit<BusinessTransaction, 'id'>) => { const { id, ...clean } = tx as any; await addDoc(getCollectionPath('business_transactions'), clean); };
  const updateTransaction = async (id: string, tx: Partial<BusinessTransaction>) => { if(!id) return; await updateDoc(getDocPath('business_transactions', id), tx); };
  const deleteTransaction = async (id: string) => { if(!id) return; await deleteDoc(getDocPath('business_transactions', id)); };

  const addCategory = async (cat: Omit<BusinessCategory, 'id'>) => { const { id, ...clean } = cat as any; await addDoc(getCollectionPath('business_categories'), clean); };
  const updateCategory = async (id: string, cat: Partial<BusinessCategory>) => { if(!id) return; await updateDoc(getDocPath('business_categories', id), cat); };
  const deleteCategory = async (id: string) => { if(!id) return; await deleteDoc(getDocPath('business_categories', id)); };

  return {
    invoices, clients, projects, tasks, taxPayments, partners, settings, loading,
    accounts, transactions, categories,
    addInvoice, updateInvoice, deleteInvoice,
    addClient, updateClient, deleteClient,
    addProject, updateProject, deleteProject,
    addTask, updateTask, deleteTask,
    addPartner, updatePartner, deletePartner,
    saveSettings, saveTaxPayment,
    addAccount, updateAccount, deleteAccount,
    addTransaction, updateTransaction, deleteTransaction,
    addCategory, updateCategory, deleteCategory
  };
};