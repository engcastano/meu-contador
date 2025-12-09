import { ServiceInvoice, TaxMonthSummary } from '../businessTypes';

// Constantes Fiscais (Lucro Presumido - Engenharia)
export const TAX_RATES = {
  ISS: 0.05,
  PIS: 0.0065,
  COFINS: 0.03,
  IRPJ_BASE: 0.048, 
  CSLL_BASE: 0.0288, 
  
  PRESUMPTION_RATE: 0.32,
  IRPJ_SURCHARGE_RATE: 0.10,
  IRPJ_THRESHOLD_QUARTER: 60000 
};

const getLastDayOfMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const safeFloat = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  if (typeof value === 'string') {
    let clean = value.replace(/[R$\s]/g, '');
    if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getDueDate = (period: string, type: 'MONTHLY' | 'QUARTERLY'): string => {
  const [yearStr, monthStr] = period.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1; 

  if (type === 'MONTHLY') {
    let dueMonth = month + 1;
    let dueYear = year;
    if (dueMonth > 11) { dueMonth = 0; dueYear++; }
    return `${dueYear}-${(dueMonth + 1).toString().padStart(2, '0')}-10`;
  } else {
    const quarterEndMonth = Math.floor(month / 3) * 3 + 2; 
    let dueMonth = quarterEndMonth + 1;
    let dueYear = year;
    if (dueMonth > 11) { dueMonth = 0; dueYear++; }
    const lastDay = getLastDayOfMonth(dueYear, dueMonth);
    return `${dueYear}-${(dueMonth + 1).toString().padStart(2, '0')}-${lastDay}`;
  }
};

const getRetentionValue = (inv: any, taxName: string): number => {
  let val = 0;
  if (inv.taxes && inv.taxes[taxName.toLowerCase()]) {
    const tax = inv.taxes[taxName.toLowerCase()];
    if (tax.retained === true || tax.retained === 'true') val = tax.amount;
  }
  else if (inv.retainedTaxes && inv.retainedTaxes[taxName.toLowerCase()] !== undefined) {
    val = inv.retainedTaxes[taxName.toLowerCase()];
  }
  return safeFloat(val);
};

export const calculateTaxReport = (invoices: ServiceInvoice[], year: number): TaxMonthSummary[] => {
  const summaryMap: Record<string, TaxMonthSummary> = {};

  for (let i = 0; i < 12; i++) {
    const monthStr = `${year}-${(i + 1).toString().padStart(2, '0')}`;
    summaryMap[monthStr] = {
      month: monthStr,
      revenue: 0,
      taxes: {
        ISS: { calculated: 0, retained: 0, dueAmount: 0, dueDate: getDueDate(monthStr, 'MONTHLY') },
        PIS: { calculated: 0, retained: 0, dueAmount: 0, dueDate: getDueDate(monthStr, 'MONTHLY') },
        COFINS: { calculated: 0, retained: 0, dueAmount: 0, dueDate: getDueDate(monthStr, 'MONTHLY') },
        IRPJ: { calculated: 0, retained: 0, surcharge: 0, dueAmount: 0, dueDate: getDueDate(monthStr, 'QUARTERLY') },
        CSLL: { calculated: 0, retained: 0, dueAmount: 0, dueDate: getDueDate(monthStr, 'QUARTERLY') }
      }
    };
  }

  invoices.forEach(inv => {
    if (inv.status === 'cancelled') return;
    
    // NOVO: Filtra notas não tributáveis
    if (inv.isTaxable === false) return;

    const dateRef = inv.issueDate || (inv as any).createdAt || '';
    if (!dateRef.startsWith(String(year))) return;

    const monthKey = dateRef.substring(0, 7); 
    if (!summaryMap[monthKey]) return;

    const s = summaryMap[monthKey];
    const gross = safeFloat(inv.grossValue) || safeFloat((inv as any).amount) || 0;
    s.revenue += gross;

    s.taxes.ISS.retained += getRetentionValue(inv, 'iss');
    s.taxes.PIS.retained += getRetentionValue(inv, 'pis');
    s.taxes.COFINS.retained += getRetentionValue(inv, 'cofins');
    s.taxes.IRPJ.retained += (getRetentionValue(inv, 'irrf') || getRetentionValue(inv, 'irpj'));
    s.taxes.CSLL.retained += getRetentionValue(inv, 'csll');
  });

  Object.values(summaryMap).forEach(s => {
      s.taxes.ISS.calculated = s.revenue * TAX_RATES.ISS;
      s.taxes.PIS.calculated = s.revenue * TAX_RATES.PIS;
      s.taxes.COFINS.calculated = s.revenue * TAX_RATES.COFINS;

      s.taxes.ISS.dueAmount = Math.max(0, s.taxes.ISS.calculated - s.taxes.ISS.retained);
      s.taxes.PIS.dueAmount = Math.max(0, s.taxes.PIS.calculated - s.taxes.PIS.retained);
      s.taxes.COFINS.dueAmount = Math.max(0, s.taxes.COFINS.calculated - s.taxes.COFINS.retained);
  });

  const quarters = [['01','02','03'], ['04','05','06'], ['07','08','09'], ['10','11','12']];

  quarters.forEach(qMonths => {
    let qRevenue = 0;
    let qRetainedIRPJ = 0;
    let qRetainedCSLL = 0;

    qMonths.forEach(m => {
      const s = summaryMap[`${year}-${m}`];
      if(s) {
        qRevenue += s.revenue;
        qRetainedIRPJ += s.taxes.IRPJ.retained;
        qRetainedCSLL += s.taxes.CSLL.retained;
        s.taxes.IRPJ.dueAmount = 0; 
        s.taxes.CSLL.dueAmount = 0;
      }
    });

    const calcIRPJ = qRevenue * TAX_RATES.IRPJ_BASE;
    const calcCSLL = qRevenue * TAX_RATES.CSLL_BASE;

    const presumedProfit = qRevenue * TAX_RATES.PRESUMPTION_RATE;
    let surcharge = 0;
    if (presumedProfit > TAX_RATES.IRPJ_THRESHOLD_QUARTER) {
      surcharge = (presumedProfit - TAX_RATES.IRPJ_THRESHOLD_QUARTER) * TAX_RATES.IRPJ_SURCHARGE_RATE;
    }

    const lastMonth = summaryMap[`${year}-${qMonths[2]}`];
    if (lastMonth) {
        lastMonth.taxes.IRPJ.calculated = calcIRPJ;
        lastMonth.taxes.IRPJ.retained = qRetainedIRPJ;
        lastMonth.taxes.IRPJ.surcharge = surcharge;
        lastMonth.taxes.IRPJ.dueAmount = Math.max(0, (calcIRPJ + surcharge) - qRetainedIRPJ);

        lastMonth.taxes.CSLL.calculated = calcCSLL;
        lastMonth.taxes.CSLL.retained = qRetainedCSLL;
        lastMonth.taxes.CSLL.dueAmount = Math.max(0, calcCSLL - qRetainedCSLL);
    }
  });

  return Object.values(summaryMap).sort((a, b) => a.month.localeCompare(b.month));
};

export const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const formatDateBr = (dateStr: string) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};