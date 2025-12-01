// Interface Base para recursos que têm dono
export interface UserOwned {
  userId?: string;
}

export interface Transaction extends UserOwned {
  id: string;
  description: string;
  value: number;
  dateExpected: string; // YYYY-MM-DD
  dateRealized: string; // YYYY-MM-DD or empty
  account: string;
  category: string; 
  type: string;
  isRealized: boolean;
  isShared?: boolean;
  paidBy?: string;
  sharingModeId?: string;
  customSplit?: { myPercentage: number; partnerPercentage: number; };
  excludeFromBudget?: boolean;
}

export interface CardTransaction extends UserOwned {
  id: string;
  dateInvoice: string; 
  datePurchase: string; 
  description: string;
  value: number;
  type: string;
  cardName: string;
  paidBy?: string; 
  sharingModeId?: string; 
  installment?: { current: number; total: number; groupId: string; };
}

export interface CardConfig extends UserOwned {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limit?: number;
  archived: boolean;
  isShared?: boolean;
  linkedSharedAccountId?: string;
  cardNumber?: string;
  cvv?: string;
  expiry?: string;
  password?: string;
  color?: string;
}

export interface Account extends UserOwned {
  id: string;
  name: string;
  archived: boolean;
  bank?: string;
  agency?: string;
  number?: string;
  pixKey?: string;
  color?: string;
}

export interface SharedAccount extends UserOwned {
  id: string;
  name: string;
  partnerName: string;
  partnerPix?: string;
  partnerBank?: string;
  partnerAgency?: string;
  partnerAccount?: string;
  archived: boolean;
}

export interface SharingMode extends UserOwned {
  id: string;
  name: string;
  myPercentage: number;
  partnerPercentage: number;
  color?: string;
}

export interface Tag extends UserOwned {
  id?: string; 
  name: string;
  color: string;
}

export interface BudgetTarget extends UserOwned {
  id: string;
  month: number; 
  year: number;
  groupId: string;
  category: string;
  value: number;
  type: 'income' | 'expense';
}

export interface User {
  id: string;
  username: string;
  password: string;
  role?: 'admin' | 'user';
  archived?: boolean;
  email?: string;
  lastAccess?: string;
  preferences?: string; // JSON stringified das preferências
}

export interface FilterState {
  year: number;
  months: number[]; 
  accountId: string | 'all' | 'shared_view'; 
  viewMode: 'accounts' | 'cards' | 'shared'; 
  status: 'all' | 'realized' | 'predicted' | 'open' | 'closed';
  category: string | 'all';
  responsible: string | 'all';
}

export type TabType = 'dashboard' | 'transactions' | 'cards' | 'settings' | 'shared' | 'budget';
export interface SharingRule { category: string; myPercentage: number; partnerPercentage: number; }
export interface Partner { id: string; name: string; pixKey?: string; }

// O ERRO ESTAVA AQUI: Faltava exportar este Enum
export enum TransactionStatus {
  REALIZED = 'Realizado',
  PREDICTED = 'Previsto',
  DELAYED = 'Atrasado',
}
