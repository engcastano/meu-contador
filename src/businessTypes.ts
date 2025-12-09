import { UserOwned } from './types';

// --- NOVOS TIPOS PARA FLUXO DE CAIXA (BUSINESS ACCOUNTING) ---

export type AccountType = 'checking' | 'investment' | 'credit_card' | 'cash';

export interface BusinessAccount extends UserOwned {
  id: string;
  name: string;
  type: AccountType;
  
  // Bancário Padrão
  bank?: string;
  agency?: string;
  accountNumber?: string;
  
  // Específico Cartão de Crédito
  closingDay?: number;
  dueDay?: number;
  limit?: number;
  
  // Específico Investimento
  yieldRate?: string; // Ex: "100% CDI"
  liquidity?: 'daily' | 'maturity';
  dueDate?: string; // Data de vencimento da aplicação

  initialBalance: number;
  currentBalance: number; // Calculado (Saldo Inicial + Transações)
  color?: string;
  archived?: boolean;
}

export interface BusinessCategory extends UserOwned {
  id: string;
  name: string;
  type: 'income' | 'expense';
  // NOVO: 'productive_society' para a nova camada de gastos
  subtype?: 'cost' | 'expense' | 'movement' | 'productive_society'; 
  color?: string;
}

export interface BusinessTransaction extends UserOwned {
  id: string;
  description: string;
  value: number;        
  date: string;         // Data de competência/vencimento
  datePaid?: string;    // Data de liquidação (Realizado)
  
  accountId: string;    // Conta vinculada
  accountName?: string; // Desnormalizado para facilitar visualização
  
  categoryId: string;
  categoryName?: string;
  
  status: 'pending' | 'paid' | 'scheduled' | 'overdue';
  type: 'income' | 'expense' | 'transfer';
  
  // --- VINCULAÇÕES ESTRATÉGICAS ---
  invoiceId?: string;       // Vinculo com Nota Fiscal
  taxObligationId?: string; // Vinculo com Imposto (DAS/DARF)
  clientId?: string;        // Vinculo com Cliente (Receita)
  projectId?: string;       // Vinculo com Projeto (Centro de Custo)
  partnerId?: string;       // Vinculo com Colaborador/Sócio (Pagamentos/Adiantamentos)
  
  notes?: string;
  attachmentUrl?: string;
}

// --- TIPOS EXISTENTES (CRM, PROJETOS, NOTAS) ---

export interface Client extends UserOwned {
  id: string;
  name: string;         // Nome Fantasia
  corporateName?: string; // Razão Social
  document: string;     // CNPJ/CPF
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  active?: boolean;
}

export interface RetainedTaxes {
  irrf: number;
  csll: number;
  cofins: number;
  pis: number;
  iss: number;
  inss: number;
}

export interface BusinessInvoice extends UserOwned {
  id: string;
  invoiceNumber?: string; 
  series?: string;
  clientId: string;
  clientName: string; 
  issuanceDate: string; 
  dueDate: string;      
  description: string;  
  grossValue: number;   
  retainedTaxes: RetainedTaxes;
  netValue: number;     
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  paymentDate?: string; 
  pdfUrl?: string;      
  xmlUrl?: string;      
  isTaxable?: boolean; 
}

export interface TaxObligation extends UserOwned {
  id: string;
  name: string;         
  type: 'DAS' | 'IRPJ' | 'CSLL' | 'ISS_PROPRIO' | 'TFE' | 'OTHER';
  period: string;       
  dueDate: string;      
  principalValue: number; 
  fineValue?: number;     
  interestValue?: number; 
  totalValue: number;     
  status: 'pending' | 'paid' | 'overdue';
  paymentDate?: string;
  linkedInvoiceIds?: string[]; 
}

// --- PROJETOS E TAREFAS ---

export interface ProjectService {
  id: string;
  description: string;
  value: number; 
}

export interface ProjectExpense {
  id: string;
  description: string;
  value: number;
}

export interface Project extends UserOwned {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  description: string;
  services: ProjectService[]; 
  expenses?: ProjectExpense[]; 
  taxRate: number; 
  value: number; 
  startDate: string;
  status: 'active' | 'completed' | 'pending' | 'cancelled' | 'archived'; 
  proposalFile?: string; 
  proposalFileName?: string;
  proposalUrl?: string; 
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface ProjectTask extends UserOwned {
  id: string;
  projectId: string;
  projectName?: string; 
  clientId?: string;    
  
  title: string;
  description?: string;
  
  responsibleId: string; 
  responsibleName: string;
  
  startDate: string;
  dueDate: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  
  comments?: TaskComment[];
}

export type BusinessRole = 'admin' | 'partner' | 'collaborator';

export interface BusinessPartner extends UserOwned {
  id: string;
  name: string;
  email: string;
  role: BusinessRole;
  phone?: string;
  active: boolean;
  avatarUrl?: string;
}

export interface CompanySettings {
  companyName: string;
  cnpj: string;
  municipalRegistry: string;
  address: string;
  bankName: string;
  bankCode: string;
  agency: string;
  account: string;
  pixKey: string;
  contactName: string;
  phone: string;
  email: string;
  taxRegime?: 'simples' | 'presumed_profit' | 'real_profit';
  logoUrl?: string;
  cityHallLogoUrl?: string;
}

export interface TaxPayment extends UserOwned {
  id: string;
  taxType: 'ISS' | 'PIS' | 'COFINS' | 'IRPJ' | 'CSLL';
  period: string;
  amountPaid: number;
  paymentDate?: string;
  userId?: string;
  notes?: string;
}

export interface TaxMonthSummary {
  month: string;
  revenue: number;
  taxes: {
    [key in 'ISS' | 'PIS' | 'COFINS' | 'IRPJ' | 'CSLL']: {
      calculated: number;
      retained: number;
      surcharge?: number;
      dueAmount: number;
      dueDate: string;
    }
  }
}

// --- TIPOS DE INVESTIMENTOS ---

export type InvestmentType = 'fixed' | 'stock' | 'fii' | 'crypto' | 'treasury' | 'other';

export interface Investment extends UserOwned {
  id: string;
  name: string; 
  type: InvestmentType;
  institution: string; 
  quantity: number; 
  purchaseValue: number; 
  currentValue: number; 
  lastUpdate: string; 
  color?: string;
}

// --- TIPOS DE SUPORTE E LEGADOS ---

export interface InvoiceTaxes {
  iss: { amount: number; rate: number; retained: boolean };
  irrf: { amount: number; rate: number; retained: boolean };
  pis: { amount: number; rate: number; retained: boolean };
  cofins: { amount: number; rate: number; retained: boolean };
  csll: { amount: number; rate: number; retained: boolean };
  inss: { amount: number; rate: number; retained: boolean };
}

export interface ServiceInvoice extends UserOwned {
    id: string;
    number: number;
    issueDate: string;
    description: string;
    amount: number;
    status: 'issued' | 'paid' | 'cancelled';
    clientName?: string;
    clientId?: string;
    projectName?: string;
    projectId?: string;
    isTaxable?: boolean;
    taxes?: any; // Compatibilidade com estrutura legada
    serviceCode?: string;
    notes?: string;
    month?: string;
    paymentData?: any;
    retention?: any;
    cnpj?: string;
    netValue?: number;
    verificationCode?: string;
}