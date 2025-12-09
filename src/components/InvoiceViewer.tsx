import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { ServiceInvoice, CompanySettings, InvoiceTaxes, Client } from '../businessTypes';

interface InvoiceViewerProps {
  invoice: ServiceInvoice;
  companySettings: CompanySettings;
  client?: Client;
  onClose: () => void;
}

// Helper para garantir estabilidade visual
const getSafeTaxes = (invoice: ServiceInvoice): InvoiceTaxes => {
  if (invoice.taxes) return invoice.taxes;
  return {
    iss: { amount: 0, rate: 0, retained: false },
    irrf: { amount: 0, rate: 0, retained: true },
    pis: { amount: 0, rate: 0, retained: true },
    cofins: { amount: 0, rate: 0, retained: true },
    csll: { amount: 0, rate: 0, retained: true },
    inss: { amount: 0, rate: 0, retained: false },
  };
};

export const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ invoice, companySettings, client, onClose }) => {
  
  const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtPct = (val: number) => (val / 100).toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 });

  const taxes = getSafeTaxes(invoice);

  const calculateTotalRetained = (taxes: InvoiceTaxes) => {
    return Object.values(taxes).reduce((acc, tax) => 
      tax.retained ? acc + tax.amount : acc, 0
    );
  };

  const totalRetained = calculateTotalRetained(taxes);
  const netValue = invoice.amount - totalRetained;
  const isCancelled = invoice.status === 'cancelled';

  // Lógica de Data ISS (Dia 10 do mês seguinte)
  const calculateIssDueDate = (dateString: string) => {
    // Cria data ao meio-dia para evitar problemas de fuso horário (-3h) voltando o dia
    const date = new Date(dateString + 'T12:00:00');
    // Seta para o dia 1
    date.setDate(1);
    // Avança 1 mês
    date.setMonth(date.getMonth() + 1);
    // Define dia 10
    date.setDate(10);
    return date.toLocaleDateString('pt-BR');
  };

  const issDueDate = calculateIssDueDate(invoice.issueDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 overflow-y-auto backdrop-blur-sm print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-4xl shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Header de Ações (Oculto na impressão) */}
        <div className="bg-slate-100 p-4 flex justify-between items-center border-b border-slate-200 print:hidden">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm" onClick={() => window.print()}>
              <Printer size={18} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <Download size={18} />
              <span className="hidden sm:inline">Baixar PDF</span>
            </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>

        {/* Conteúdo da Nota */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible relative">
          
          {/* Marca d'água de Cancelado */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-30">
              <div className="border-8 border-red-500 text-red-500 text-9xl font-black transform -rotate-45 px-12 py-4 rounded-xl uppercase tracking-widest">
                CANCELADA
              </div>
            </div>
          )}

          <div className={`print:w-full space-y-6 ${isCancelled ? 'opacity-50 grayscale' : ''}`}>
            
            {/* CABEÇALHO DA NOTA */}
            <div className="border border-black flex">
              {/* Logo / Dados da Prefeitura */}
              <div className="w-1/3 p-4 border-r border-black flex flex-col items-center justify-center text-center">
                 {/* Lógica de Logo da Prefeitura */}
                 {companySettings.cityHallLogoUrl ? (
                    <img 
                        src={companySettings.cityHallLogoUrl} 
                        alt="Brasão" 
                        className="h-20 w-auto mb-2 object-contain"
                    />
                 ) : (
                    <div className="w-16 h-16 bg-slate-100 rounded-full mb-2 flex items-center justify-center text-[10px] text-slate-400 font-bold border-2 border-slate-200 uppercase text-center p-1">
                        Brasão Prefeitura
                    </div>
                 )}
                 
                 <h1 className="font-bold text-sm uppercase mt-1">Prefeitura Municipal</h1>
                 <h2 className="text-xs">Secretaria de Finanças</h2>
                 <p className="text-[10px] mt-1">Nota Fiscal de Serviços Eletrônica - NFS-e</p>
              </div>
              
              <div className="w-2/3 flex">
                 <div className="flex-1 p-2 border-r border-black flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase block">Número da Nota</span>
                      <span className="text-xl font-bold">{invoice.number.toString().padStart(8, '0')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase block">Data e Hora de Emissão</span>
                      <span className="text-sm">{new Date(invoice.issueDate + 'T12:00:00').toLocaleDateString('pt-BR')} 12:00:00</span>
                    </div>
                 </div>
                 <div className="flex-1 p-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase block">Código de Verificação</span>
                      {/* Se não existir código, deixa em branco. Removeu "GERADO-NO-ENVIO" */}
                      <span className="text-sm font-mono break-all">{invoice.verificationCode || ''}</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* PRESTADOR DE SERVIÇOS */}
            <div className="border border-black p-4 relative">
              <h3 className="font-bold text-xs absolute -top-2.5 left-2 bg-white px-1 uppercase">Prestador de Serviços</h3>
              <div className="flex gap-4 items-center">
                 {/* Logo da Empresa */}
                 <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center p-1 border border-slate-100 rounded">
                    {companySettings.logoUrl ? (
                        <img 
                            src={companySettings.logoUrl} 
                            alt="Logo Empresa" 
                            className="max-h-full max-w-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-xs text-slate-300 font-bold text-center">
                            LOGO EMPRESA
                        </div>
                    )}
                 </div>
                 
                 <div className="text-sm space-y-1 flex-1">
                    <p className="font-bold uppercase text-lg">{companySettings.companyName}</p>
                    <div className="flex gap-6">
                        <p><strong>CNPJ:</strong> {companySettings.cnpj}</p>
                        <p><strong>Insc. Mun.:</strong> {companySettings.municipalRegistry || 'Isento'}</p>
                    </div>
                    <p>{companySettings.address}</p>
                    <p>
                        {companySettings.email && `Email: ${companySettings.email}`}
                        {companySettings.phone && ` • Tel: ${companySettings.phone}`}
                    </p>
                 </div>
              </div>
            </div>

            {/* TOMADOR DE SERVIÇOS */}
            <div className="border border-black p-4 relative">
              <h3 className="font-bold text-xs absolute -top-2.5 left-2 bg-white px-1 uppercase">Tomador de Serviços</h3>
              <div className="text-sm space-y-1">
                 <p className="font-bold uppercase text-base">{invoice.clientName}</p>
                 <div className="flex gap-6">
                    {/* Prioriza o documento do cadastro do cliente */}
                    <p><strong>CNPJ/CPF:</strong> {client?.document || client?.cnpj || 'Não Informado'}</p>
                    <p><strong>Insc. Mun.:</strong> {client?.municipalRegistry || '-'}</p>
                 </div>
                 <p>{client?.address || 'Endereço não informado'}</p>
                 <p>{client?.email || ''}</p>
                 {invoice.projectName && (
                    <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                        <strong>Projeto Vinculado:</strong> {invoice.projectName}
                    </p>
                 )}
              </div>
            </div>

            {/* DISCRIMINAÇÃO DOS SERVIÇOS */}
            <div className="border border-black p-4 min-h-[250px] relative">
              <h3 className="font-bold text-xs absolute -top-2.5 left-2 bg-white px-1 uppercase">Discriminação dos Serviços</h3>
              <div className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-justify">
                {invoice.description}
              </div>
              
              {invoice.notes && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 italic">Observações: {invoice.notes}</p>
                </div>
              )}
            </div>

            {/* TABELA DE TRIBUTOS E VALORES */}
            <div className="border border-black">
              <table className="w-full text-xs text-center">
                <thead className="bg-slate-100 border-b border-black font-bold">
                  <tr>
                    <th className="py-1.5 border-r border-black">PIS ({fmtPct(taxes.pis.rate)})</th>
                    <th className="py-1.5 border-r border-black">COFINS ({fmtPct(taxes.cofins.rate)})</th>
                    <th className="py-1.5 border-r border-black">INSS ({fmtPct(taxes.inss.rate)})</th>
                    <th className="py-1.5 border-r border-black">IRRF ({fmtPct(taxes.irrf.rate)})</th>
                    <th className="py-1.5">CSLL ({fmtPct(taxes.csll.rate)})</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1.5 border-r border-black">{fmt(taxes.pis.amount)}</td>
                    <td className="py-1.5 border-r border-black">{fmt(taxes.cofins.amount)}</td>
                    <td className="py-1.5 border-r border-black">{fmt(taxes.inss.amount)}</td>
                    <td className="py-1.5 border-r border-black">{fmt(taxes.irrf.amount)}</td>
                    <td className="py-1.5">{fmt(taxes.csll.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* CÓDIGO SERVIÇO E TOTAL */}
            <div className="border border-black mb-1 p-3 flex justify-between items-center bg-slate-50">
               <div>
                 <span className="font-bold text-xs uppercase text-slate-600">Código do Serviço</span> <br/>
                 <span className="text-sm font-semibold">{invoice.serviceCode}</span>
               </div>
               <div className="text-right">
                 <span className="font-bold text-xs uppercase text-slate-600 block">Valor Total da Nota</span>
                 <span className="font-bold text-lg">{fmt(invoice.amount)}</span>
               </div>
            </div>

            {/* RETENÇÕES E LÍQUIDO */}
            <div className="flex gap-6 justify-end text-sm py-2">
               <div className="text-right">
                  <span className="text-slate-500 block text-xs uppercase font-bold">Total Retenções</span>
                  <span className="font-medium text-red-600">-{fmt(totalRetained)}</span>
               </div>
               <div className="text-right pl-6 border-l border-slate-300">
                  <span className="text-slate-500 block text-xs uppercase font-bold">Valor Líquido</span>
                  <span className="font-bold text-emerald-700 text-xl">{fmt(netValue)}</span>
               </div>
            </div>

            {/* OUTRAS INFORMAÇÕES */}
            <div className="border border-black mb-1 p-3 min-h-[80px] bg-white">
              <h3 className="font-bold text-xs mb-2 uppercase">Outras Informações</h3>
              <div className="text-xs text-slate-600 space-y-1">
                <p>(1) Esta NFS-e foi emitida com respaldo na Lei nº 14.097/2005.</p>
                {/* Data calculada para dia 10 do mês seguinte */}
                <p>(2) Data de vencimento do ISS: <strong>{issDueDate}</strong></p>
              </div>
              
              <div className="mt-3 pt-2 border-t border-gray-200 text-xs">
                <span className="font-bold text-slate-700">Dados Bancários para Pagamento:</span> <br/>
                {companySettings.bankName} • Ag: {companySettings.agency} • CC: {companySettings.account} <br/>
                PIX: {companySettings.pixKey}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};