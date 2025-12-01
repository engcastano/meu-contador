import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
} from 'firebase/firestore';
import { db } from './firebase';

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
  sharingRules: 'sharing_rules'
};

export const subscribeToCollection = (userId: string, collectionName: string, callback: (data: any[]) => void) => {
  if (!userId) return () => {};
  const q = collection(db, 'users', userId, collectionName);
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
  const cleanItem = JSON.parse(JSON.stringify(item));
  const docRef = doc(db, 'users', userId, collectionName, item.id);
  await setDoc(docRef, cleanItem, { merge: true });
};

export const saveBatchData = async (userId: string, collectionName: string, items: any[]) => {
  if (!userId) return;
  const promises = items.map(item => saveData(userId, collectionName, item));
  await Promise.all(promises);
};

export const deleteData = async (userId: string, collectionName: string, itemId: string) => {
  if (!userId || !itemId) return;
  const docRef = doc(db, 'users', userId, collectionName, itemId);
  await deleteDoc(docRef);
};

export const saveUserPreferences = async (userId: string, preferences: any) => {
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, { preferences }, { merge: true });
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
    default: return sheetName.toLowerCase();
  }
};