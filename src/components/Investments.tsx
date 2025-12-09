import React, { useState, useMemo } from 'react';
import { Investment } from '../types';
import { parseCurrency, generateUUID } from '../utils';
import { Plus, TrendingUp, PieChart, Edit2, Trash2, Save, X } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer } from 'recharts';

interface InvestmentsProps {
  investments: Investment[];
  onSave: (inv: Investment) => void;
  onDelete: (id: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const Investments: React.FC<InvestmentsProps> = ({ investments, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Investment | null>(null);
  
  // Estado para edição rápida de valor atual
  const [quickUpdateId, setQuickUpdateId] = useState<string | null>(null);
  const [quickValue, setQuickValue] = useState('');

  const totalPatrimony = useMemo(() => investments.reduce((acc, inv) => acc + (Number(inv.currentValue) || 0), 0), [investments]);
  const totalInvested = useMemo(() => investments.reduce((acc, inv) => acc + (Number(inv.purchaseValue) || 0), 0), [investments]);
  const totalYield = totalPatrimony - totalInvested;
  const totalYieldPercentage = totalInvested > 0 ? (totalYield / totalInvested) * 100 : 0;

  const chartData = useMemo(() => {
    return investments.map(inv => ({ name: inv.name, value: inv.currentValue }));
  }, [investments]);

  const handleOpenNew = () => {
    setEditingItem({
      id: generateUUID(), name: '', type: 'fixed', institution: '', 
      quantity: 1, purchaseValue: 0, currentValue: 0, lastUpdate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (inv: Investment) => {
    setEditingItem({ ...inv });
    setIsModalOpen(true);
  };

  const handleSaveForm = () => {
    if (editingItem) {
      onSave({ ...editingItem, lastUpdate: new Date().toISOString().split('T')[0] });
      setIsModalOpen(false);
      setEditingItem(null);
    }
  };

  const handleQuickUpdate = (id: string, currentVal: number) => {
    setQuickUpdateId(id);
    setQuickValue(String(currentVal));
  };

  const saveQuickUpdate = (inv: Investment) => {
    const newVal = parseFloat(quickValue);
    if (!isNaN(newVal)) {
      onSave({ ...inv, currentValue: newVal, lastUpdate: new Date().toISOString().split('T')[0] });
    }
    setQuickUpdateId(null);
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn space-y-6 pb-20 lg:pb-0">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Patrimônio Total</h3>
          <div className="text-2xl font-bold dark:text-white">{parseCurrency(totalPatrimony)}</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Total Investido</h3>
          <div className="text-2xl font-bold dark:text-slate-300">{parseCurrency(totalInvested)}</div>
        </div>
        <div className={`p-6 rounded-xl border shadow-sm ${totalYield >= 0 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50 border-red-200'}`}>
          <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">Rentabilidade Estimada</h3>
          <div className={`text-2xl font-bold ${totalYield >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {parseCurrency(totalYield)} <span className="text-sm font-medium">({totalYieldPercentage.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Lista de Ativos */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
             <h3 className="font-bold dark:text-white flex items-center gap-2"><TrendingUp size={20}/> Meus Ativos</h3>
             <button onClick={handleOpenNew} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"><Plus size={16}/> Novo Investimento</button>
          </div>
          <div className="flex-1 overflow-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700 sticky top-0">
                <tr>
                  <th className="p-4">Ativo / Instituição</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right">Valor Investido</th>
                  <th className="p-4 text-right">Valor Atual</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {investments.map(inv => {
                  const yieldVal = inv.currentValue - inv.purchaseValue;
                  const yieldPct = inv.purchaseValue > 0 ? (yieldVal / inv.purchaseValue) * 100 : 0;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="p-4">
                        <div className="font-bold dark:text-white">{inv.name}</div>
                        <div className="text-xs text-slate-500">{inv.institution} • {new Date(inv.lastUpdate).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs font-bold uppercase text-slate-600 dark:text-slate-300">{inv.type}</span></td>
                      <td className="p-4 text-right font-medium dark:text-slate-300">{parseCurrency(inv.purchaseValue)}</td>
                      <td className="p-4 text-right">
                        {quickUpdateId === inv.id ? (
                          <div className="flex items-center justify-end gap-2">
                             <input autoFocus type="number" value={quickValue} onChange={e => setQuickValue(e.target.value)} className="w-24 p-1 text-right text-sm border rounded dark:bg-slate-600 dark:text-white"/>
                             <button onClick={() => saveQuickUpdate(inv)} className="text-green-600"><Save size={16}/></button>
                             <button onClick={() => setQuickUpdateId(null)} className="text-red-500"><X size={16}/></button>
                          </div>
                        ) : (
                          <div className="group cursor-pointer flex flex-col items-end" onClick={() => handleQuickUpdate(inv.id, inv.currentValue)}>
                             <span className="font-bold dark:text-white flex items-center gap-2">{parseCurrency(inv.currentValue)} <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-400"/></span>
                             <span className={`text-[10px] ${yieldVal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{yieldVal >= 0 ? '+' : ''}{yieldPct.toFixed(1)}%</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEdit(inv)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                          <button onClick={() => onDelete(inv.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
          <h3 className="font-bold dark:text-white flex items-center gap-2 mb-4"><PieChart size={20}/> Distribuição</h3>
          <div className="flex-1 min-h-[200px]">
             <ResponsiveContainer width="100%" height="100%">
               <RechartsPie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                 {chartData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                 ))}
               </RechartsPie>
             </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
             {chartData.map((entry, index) => (
               <div key={index} className="flex justify-between text-xs">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                   <span className="dark:text-slate-300">{entry.name}</span>
                 </div>
                 <span className="font-bold dark:text-white">{((entry.value / totalPatrimony) * 100).toFixed(1)}%</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Modal Edição */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4">
             <div className="flex justify-between items-center">
               <h3 className="font-bold text-lg dark:text-white">Gerenciar Ativo</h3>
               <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400"/></button>
             </div>
             
             <div><label className="text-xs font-bold text-slate-500 block mb-1">Nome do Ativo</label><input autoFocus className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="Ex: CDB Banco Inter"/></div>
             
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">Tipo</label>
                   <select className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.type} onChange={e => setEditingItem({...editingItem, type: e.target.value as any})}>
                      <option value="fixed">Renda Fixa</option>
                      <option value="stock">Ações</option>
                      <option value="fii">FIIs</option>
                      <option value="crypto">Cripto</option>
                      <option value="treasury">Tesouro</option>
                      <option value="other">Outros</option>
                   </select>
                </div>
                <div><label className="text-xs font-bold text-slate-500 block mb-1">Instituição</label><input className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.institution} onChange={e => setEditingItem({...editingItem, institution: e.target.value})}/></div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 block mb-1">Valor Investido</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.purchaseValue} onChange={e => setEditingItem({...editingItem, purchaseValue: parseFloat(e.target.value)})}/></div>
                <div><label className="text-xs font-bold text-slate-500 block mb-1">Valor Atual</label><input type="number" className="w-full p-2 border rounded dark:bg-slate-700 dark:text-white" value={editingItem.currentValue} onChange={e => setEditingItem({...editingItem, currentValue: parseFloat(e.target.value)})}/></div>
             </div>

             <button onClick={handleSaveForm} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold mt-4">Salvar Investimento</button>
          </div>
        </div>
      )}
    </div>
  );
};