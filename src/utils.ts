import { Transaction, CardTransaction, TransactionStatus } from './types';

export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
};

export const parseCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const parseDate = (dateString: string) => {
  if (!dateString) return '';
  if (dateString.includes('/') && dateString.split('/')[0].length === 2) return dateString;
  const parts = dateString.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateString;
};

export const formatMonthYear = (dateStr: string) => {
    if(!dateStr) return '';
    const parts = dateStr.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const date = new Date(y, m - 1, 1);
    const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const checkDateMatch = (dateStr: string, year: number, monthIndex: number): boolean => {
    if (!dateStr) return false;
    let dYear, dMonth;
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        dYear = parseInt(parts[0]);
        dMonth = parseInt(parts[1]) - 1; 
    } else if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        dYear = parseInt(parts[2]);
        dMonth = parseInt(parts[1]) - 1;
    } else {
        return false;
    }
    return dYear === year && dMonth === monthIndex;
};

export const calculateInvoiceDate = (purchaseDate: string, closingDay: number): string => {
  if (!purchaseDate) return '';
  let year, month, day;
  if(purchaseDate.includes('-')) {
      const parts = purchaseDate.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[2]);
  } else {
      const parts = purchaseDate.split('/');
      year = parseInt(parts[2]);
      month = parseInt(parts[1]) - 1;
      day = parseInt(parts[0]);
  }
  let date = new Date(year, month, day);
  if (day >= closingDay) date.setMonth(date.getMonth() + 1);
  const invYear = date.getFullYear();
  const invMonth = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${invYear}-${invMonth}-01`;
};

export const getStatus = (t: Transaction): string => {
  if (t.isRealized) return TransactionStatus.REALIZED;
  const today = new Date().toISOString().split('T')[0];
  if (t.dateExpected < today) return TransactionStatus.DELAYED;
  return TransactionStatus.PREDICTED;
};

export const processContabilCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(l => l.trim());
    const startIndex = lines[0].toLowerCase().match(/data|date|descrição|valor/i) ? 1 : 0;
    return lines.slice(startIndex).map(line => {
        const separator = line.includes(';') ? ';' : ',';
        const cols = line.split(separator).map(c => c.trim().replace(/"/g, ''));
        if(cols.length < 3) return null;
        let dateExpected = cols[0]; 
        if (dateExpected.includes('/')) { const [d, m, y] = dateExpected.split('/'); dateExpected = `${y}-${m}-${d}`; }
        let valStr = cols[2]; if (!valStr) valStr = cols[1];
        let value = 0;
        if (valStr) {
            value = parseFloat(valStr.replace('R$', '').replace(/\./g, '').replace(',', '.'));
            if(line.toUpperCase().includes(';D;') || line.toUpperCase().includes(',D,')) value = -Math.abs(value);
        }
        return { id: generateUUID(), dateExpected, description: cols[1] || 'Importado', value, category: cols[3] || 'Geral', account: 'Conta Importada', isRealized: true, dateRealized: dateExpected, type: cols[3] || 'Geral' };
    }).filter(x => x !== null && !isNaN(x.value) && x.value !== 0);
};

export const processCardCSV = (csvText: string, cardName: string, closingDay: number): any[] => {
    const lines = csvText.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];
    const headerLine = lines[0].toLowerCase();
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = headerLine.split(separator).map(h => h.trim().replace(/"/g, ''));
    const idxDate = headers.findIndex(h => h.includes('data'));
    const idxDesc = headers.findIndex(h => h.includes('desc') || h.includes('histórico'));
    const idxValue = headers.findIndex(h => h.includes('valor') || h.includes('amount'));
    const hasHeaders = idxDate !== -1 && idxValue !== -1;
    const startIndex = hasHeaders ? 1 : 0;
    return lines.slice(startIndex).map(line => {
        const cols = line.split(separator).map(c => c.trim().replace(/"/g, ''));
        const dateRaw = hasHeaders ? cols[idxDate] : cols[0];
        const descRaw = hasHeaders ? cols[idxDesc] : cols[1];
        const valRaw = hasHeaders ? cols[idxValue] : cols[2];
        if (!dateRaw || !valRaw) return null;
        let datePurchase = dateRaw;
        if (datePurchase.includes('/')) { const [d, m, y] = datePurchase.split('/'); datePurchase = `${y}-${m}-${d}`; }
        let dateInvoice = calculateInvoiceDate(datePurchase, closingDay);
        
        // CORREÇÃO AQUI: Removemos o * -1
        // Agora: 
        // Se vier -80 (negativo no CSV) -> Continua -80 (Compra/Gasto)
        // Se vier 80 (positivo no CSV) -> Continua 80 (Estorno/Entrada)
        let value = parseFloat(valRaw.replace('R$', '').replace(/\./g, '').replace(',', '.'));
        
        return { id: generateUUID(), datePurchase, dateInvoice, description: descRaw || 'Importado', value, type: 'Geral', cardName };
    }).filter(x => x !== null && !isNaN(x.value) && x.value !== 0);
};
