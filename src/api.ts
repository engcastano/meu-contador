import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  QueryConstraint,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { CompanyScope } from './types';

const COLLECTIONS = {
  transactions: 'transactions',
  cardTransactions: 'card_transactions',
  accounts: 'accounts',
  cardConfigs: 'card_configs',
  sharedAccounts: 'shared_accounts',
  sharingModes: 'sharing_modes',
  tags: 'tags',
  budgetTargets: 'budget_targets',
  partners: 'partners',
  sharingRules: 'sharing_rules',
  
  // Módulos Empresariais
  clients: 'business_clients',
  businessTransactions: 'business_transactions',
  businessInvoices: 'business_invoices',
  taxObligations: 'tax_obligations',
  taxPayments: 'business_tax_payments', 
  
  businessPartners: 'business_partners',
  businessProjects: 'business_projects',
  businessTasks: 'business_tasks',
  
  investments: 'investments'
};

// --- FUNÇÕES DE INFRAESTRUTURA DE ACESSO ---

// Caminho Público Global para Permissões
const getPublicAccessRef = (appId: string) => 
  collection(db, 'artifacts', appId, 'public', 'data', 'access_permissions');

// 1. Conceder Acesso (Admin chama isso ao criar parceiro)
export const grantAccess = async (targetEmail: string, ownerId: string, role: string, companyName: string) => {
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  
  const permissionId = btoa(targetEmail.toLowerCase()); 
  const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'access_permissions', permissionId);
  
  await setDoc(docRef, {
    email: targetEmail.toLowerCase(),
    ownerId: ownerId,
    role: role,
    companyName: companyName,
    grantedAt: new Date().toISOString()
  });
};

// 2. Revogar Acesso (Admin chama ao deletar parceiro)
export const revokeAccess = async (targetEmail: string) => {
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  const permissionId = btoa(targetEmail.toLowerCase());
  const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'access_permissions', permissionId);
  await deleteDoc(docRef);
};

// 3. Verificar Permissões (Função Legada - Mantida por compatibilidade)
export const checkAccessPermission = async (userEmail: string) => {
  if (!userEmail) return null;
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  const permissionId = btoa(userEmail.toLowerCase());
  const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'access_permissions', permissionId);
  
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data(); 
  }
  return null;
};

// 4. Buscar Todas as Empresas Vinculadas
export const getAssociatedCompanies = async (userEmail: string, currentUserId: string): Promise<CompanyScope[]> => {
  const companies: CompanyScope[] = [];
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';

  // 4.1. Adiciona a Própria Empresa (Padrão)
  let ownCompanyName = 'Minha Empresa';
  try {
    const settingsRef = doc(db, 'artifacts', appId, 'users', currentUserId, 'business_settings', 'company_info');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists() && settingsSnap.data().companyName) {
      ownCompanyName = settingsSnap.data().companyName;
    }
  } catch (e) {
    console.log('Usando nome padrão para empresa própria');
  }

  companies.push({
    id: currentUserId, 
    name: ownCompanyName,
    role: 'admin',
    isOwner: true
  });

  // 4.2. Busca Empresas Compartilhadas
  if (userEmail) {
    const permissionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'access_permissions');
    
    const q = query(permissionsRef, where('email', '==', userEmail.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.ownerId !== currentUserId) {
        companies.push({
          id: data.ownerId, 
          name: data.companyName || 'Empresa Compartilhada',
          role: data.role,
          isOwner: false
        });
      }
    });
  }

  return companies;
};

// 5. Atualizar Perfil do Usuário
export const updateUserProfile = async (userId: string, data: { displayName?: string, birthDate?: string }) => {
    // Atualiza apenas as preferências de perfil no Firestore
    // Note: Isso não atualiza o Auth do Firebase, apenas o registro do banco
    const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
    const userRef = doc(db, 'artifacts', appId, 'users', userId, 'user_settings', 'profile');
    await setDoc(userRef, data, { merge: true });
};

export const getUserProfile = async (userId: string) => {
    const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
    const userRef = doc(db, 'artifacts', appId, 'users', userId, 'user_settings', 'profile');
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
};

// --- FUNÇÕES DE CRUD PADRÃO ---

export const subscribeToCollection = (
  userId: string, 
  collectionName: string, 
  callback: (data: any[]) => void,
  ...queryConstraints: QueryConstraint[]
) => {
  if (!userId) return () => {};
  
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  const collectionRef = collection(db, 'artifacts', appId, 'users', userId, collectionName);
  
  const q = queryConstraints.length > 0 
    ? query(collectionRef, ...queryConstraints) 
    : collectionRef;

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(items);
  }, (error) => {
    console.error(`Erro ao sincronizar ${collectionName}:`, error);
  });
  
  return unsubscribe;
};

export const saveData = async (userId: string, collectionName: string, item: any) => {
  if (!userId || !item.id) return;
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  
  const cleanItem = JSON.parse(JSON.stringify(item));
  const docRef = doc(db, 'artifacts', appId, 'users', userId, collectionName, item.id);
  await setDoc(docRef, cleanItem, { merge: true });
};

export const saveBatchData = async (userId: string, collectionName: string, items: any[]) => {
  if (!userId) return;
  const promises = items.map(item => saveData(userId, collectionName, item));
  await Promise.all(promises);
};

export const deleteData = async (userId: string, collectionName: string, itemId: string) => {
  if (!userId || !itemId) return;
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  
  const docRef = doc(db, 'artifacts', appId, 'users', userId, collectionName, itemId);
  await deleteDoc(docRef);
};

export const saveUserPreferences = async (userId: string, preferences: any) => {
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  const docRef = doc(db, 'artifacts', appId, 'users', userId, 'user_settings', 'preferences');
  await setDoc(docRef, { preferences }, { merge: true });
};

export const getUserPreferences = async (userId: string) => {
  if (!userId) return null;
  const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'default-app';
  const docRef = doc(db, 'artifacts', appId, 'users', userId, 'user_settings', 'preferences');
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data().preferences;
  }
  return null;
};

export const fetchAllData = async () => { return null; };
export const saveDataToCloud = async () => {};

export const getCollectionName = (sheetName: string) => {
  switch(sheetName) {
    case 'Transactions': return COLLECTIONS.transactions;
    case 'CardTransactions': return COLLECTIONS.cardTransactions;
    case 'Accounts': return COLLECTIONS.accounts;
    case 'CardConfigs': return COLLECTIONS.cardConfigs;
    case 'SharedAccounts': return COLLECTIONS.sharedAccounts;
    case 'SharingModes': return COLLECTIONS.sharingModes;
    case 'Tags': return COLLECTIONS.tags;
    case 'BudgetTargets': return COLLECTIONS.budgetTargets;
    case 'Clients': return COLLECTIONS.clients;
    case 'BusinessTransactions': return COLLECTIONS.businessTransactions;
    case 'BusinessInvoices': return COLLECTIONS.businessInvoices;
    case 'TaxObligations': return COLLECTIONS.taxObligations;
    case 'TaxPayments': return COLLECTIONS.taxPayments;
    case 'BusinessPartners': return COLLECTIONS.businessPartners;
    case 'BusinessProjects': return COLLECTIONS.businessProjects;
    case 'BusinessTasks': return COLLECTIONS.businessTasks;
    case 'Investments': return COLLECTIONS.investments;
    default: return sheetName.toLowerCase();
  }
};