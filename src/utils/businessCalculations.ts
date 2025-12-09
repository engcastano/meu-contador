import { ServiceInvoice, CompanySettings, InvoiceTaxes } from '../businessTypes';

/**
 * Formatadores
 */
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2
  }).format(value / 100); // Divide por 100 pois a entrada geralmente é 1.5 (para 1.5%)
};

/**
 * Calcula o total de impostos retidos
 */
export const calculateTotalRetained = (taxes: InvoiceTaxes): number => {
  return Object.values(taxes).reduce((acc, tax) => {
    return tax.retained ? acc + tax.amount : acc;
  }, 0);
};

/**
 * Calcula o valor líquido da nota
 */
export const calculateNetValue = (invoice: ServiceInvoice): number => {
  if (invoice.status === 'cancelled') return 0;
  const totalRetained = calculateTotalRetained(invoice.taxes);
  return invoice.amount - totalRetained;
};

/**
 * Gera o texto padrão para o corpo da Nota Fiscal (Discriminação)
 * Conforme solicitação exata do usuário.
 */
export const generateInvoiceDescriptionBody = (
  invoice: ServiceInvoice, 
  settings: CompanySettings,
  userDescription: string
): string => {
  const { amount, taxes } = invoice;
  const totalRetained = calculateTotalRetained(taxes);
  const netValue = amount - totalRetained;

  // 1. Descrição do Usuário (topo)
  let text = `${userDescription || 'SERVIÇOS PRESTADOS'}\n\n`;

  // 2. Detalhamento de Retenções (SE houver retenção)
  if (totalRetained > 0) {
    text += `Retenção na fonte (RFB):\n`;
    
    if (taxes.irrf.retained && taxes.irrf.amount > 0) 
      text += `IRRF ${formatPercent(taxes.irrf.rate)} - ${formatCurrency(taxes.irrf.amount)}\n`;
    
    if (taxes.csll.retained && taxes.csll.amount > 0) 
      text += `CSLL ${formatPercent(taxes.csll.rate)} - ${formatCurrency(taxes.csll.amount)}\n`;
    
    if (taxes.cofins.retained && taxes.cofins.amount > 0) 
      text += `COFINS ${formatPercent(taxes.cofins.rate)} - ${formatCurrency(taxes.cofins.amount)}\n`;
    
    if (taxes.pis.retained && taxes.pis.amount > 0) 
      text += `PIS/PASEP ${formatPercent(taxes.pis.rate)} - ${formatCurrency(taxes.pis.amount)}\n`;
    
    if (taxes.inss.retained && taxes.inss.amount > 0) 
      text += `INSS ${formatPercent(taxes.inss.rate)} - ${formatCurrency(taxes.inss.amount)}\n`;
    
    if (taxes.iss.retained && taxes.iss.amount > 0) 
      text += `ISS ${formatPercent(taxes.iss.rate)} - ${formatCurrency(taxes.iss.amount)}\n`;

    // Calcula a porcentagem total efetiva para exibição
    const totalRate = (totalRetained / amount) * 100;

    text += `\nTotal de impostos retidos ${formatPercent(totalRate)} - ${formatCurrency(totalRetained)}\n`;
    text += `Valor líquido a receber - ${formatCurrency(netValue)}\n\n`;
  } else {
    // Se não houver retenção, apenas exibe separador ou nada
    text += `\n`; 
  }

  // 3. Texto Padrão (Dados Bancários e Contato)
  if (settings.bankName) {
    text += `Forma de pagamento: PIX (CNPJ) / TED\n`;
    text += `Dados Bancários: ${settings.bankName} (${settings.bankCode}) - Ag ${settings.agency} - CC ${settings.account}\n`;
    if (settings.pixKey) text += `Favorecido: ${settings.companyName}\n`;
    
    text += `\nContato: ${settings.contactName || 'Financeiro'} / Tel.: ${settings.phone || ''} / e-mail: ${settings.email || ''}`;
  }

  return text;
};

/**
 * Agregador para Dashboards: Calcula faturamento mensal ignorando canceladas
 */
export const calculateMonthlyRevenue = (invoices: ServiceInvoice[], month: string) => {
  return invoices
    .filter(inv => inv.month === month && inv.status !== 'cancelled')
    .reduce((acc, inv) => acc + inv.amount, 0);
};