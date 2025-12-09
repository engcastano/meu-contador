import React, { useState } from 'react';
import { BusinessCategory } from '../../businessTypes';
import { generateUUID } from '../../utils';
import { Plus, Edit2, Trash2, Save, X, Tag, Info, ArrowRightLeft, Users } from 'lucide-react';

interface AccountingConfigProps {
  categories: BusinessCategory[];
  onAddCategory: (cat: Omit<BusinessCategory, 'id'>) => void;
  onUpdateCategory: (id: string, cat: Partial<BusinessCategory>) => void;
  onDeleteCategory: (id: string) => void;
}

export const AccountingConfig: React.FC<AccountingConfigProps> = ({
  categories, onAddCategory, onUpdateCategory, onDeleteCategory
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [subtype, setSubtype] = useState<'cost' | 'expense' | 'movement' | 'productive_society'>('expense');

  const handleSave = () => {
    if (!name) return;
    
    const payload: Partial<BusinessCategory> = { name, type };
    
    payload.subtype = subtype;

    if (editingId) {
      onUpdateCategory(editingId, payload);
      setEditingId(null);
    } else {
      onAddCategory({ id: generateUUID(), name, type, subtype: subtype });
    }
    setName('');
    setType('expense');
    setSubtype('expense');
  };

  const handleEdit = (cat: BusinessCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
    setSubtype(cat.subtype || 'expense');
  };

  return (
    <div className="animate-fadeIn max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="font-bold text-lg dark:text-white mb-2 flex items-center gap-2"><Tag size={20} className="text-indigo-600"/> Gerenciar Categorias</h3>
        {/* CORREÇÃO: Uso de &gt; para o caractere maior que */}
        <p className="text-xs text-slate-500 mb-6">Classifique corretamente para ter a visão exata do DRE: Bruto &gt; Líquido &gt; Produtivo.</p>
        
        <div className="flex flex-col gap-3 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex gap-2">
              <input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Nome da Categoria..." 
                className="flex-1 p-2 border rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select 
                value={type} 
                onChange={e => setType(e.target.value as any)} 
                className="p-2 border rounded-lg dark:bg-slate-700 dark:text-white outline-none w-32"
              >
                <option value="expense">Saída</option>
                <option value="income">Entrada</option>
              </select>
          </div>

          {/* Seletor de Subtipo */}
          <div className="flex flex-col gap-2 pl-1 pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500 uppercase">Classificação Contábil:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${subtype === 'cost' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300'}`}>
                      <input type="radio" name="subtype" checked={subtype === 'cost'} onChange={() => setSubtype('cost')} className="text-indigo-600"/>
                      <span className="font-bold">Custo (Direto)</span>
                  </label>
                  <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${subtype === 'expense' ? 'bg-red-50 border-red-200 text-red-800' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300'}`}>
                      <input type="radio" name="subtype" checked={subtype === 'expense'} onChange={() => setSubtype('expense')} className="text-indigo-600"/>
                      <span className="font-bold">Despesa (Operacional)</span>
                  </label>
                  <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${subtype === 'productive_society' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300'}`}>
                      <input type="radio" name="subtype" checked={subtype === 'productive_society'} onChange={() => setSubtype('productive_society')} className="text-indigo-600"/>
                      <span className="font-bold">Sociedade Produtiva</span>
                  </label>
                  <label className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded border ${subtype === 'movement' ? 'bg-slate-200 border-slate-300 text-slate-800' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300'}`}>
                      <input type="radio" name="subtype" checked={subtype === 'movement'} onChange={() => setSubtype('movement')} className="text-indigo-600"/>
                      <span className="font-bold">Movimentação (Neutro)</span>
                  </label>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic pl-1 border-l-2 border-slate-300 dark:border-slate-600">
                  {subtype === 'cost' && "Ligado à produção. Abate do Lucro Bruto. Ex: Material, Taxas de Projeto."}
                  {subtype === 'expense' && "Manutenção do negócio. Abate do Lucro Líquido. Ex: Aluguel, Software."}
                  {subtype === 'productive_society' && "Gastos específicos dos sócios. Abate do Lucro Produtivo (Final). Ex: Pró-labore, Benefícios Societários."}
                  {subtype === 'movement' && "Não afeta o DRE. Ex: Aplicações, Resgates, Transferências entre contas."}
              </p>
          </div>

          <div className="flex justify-end gap-2 mt-2">
              {editingId && (
                <button onClick={() => { setEditingId(null); setName(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">
                  Cancelar
                </button>
              )}
              <button onClick={handleSave} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-bold text-sm flex items-center gap-2">
                {editingId ? <Save size={16}/> : <Plus size={16}/>}
                {editingId ? 'Salvar Alteração' : 'Criar Categoria'}
              </button>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {categories.map(cat => (
            <div key={cat.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                    cat.subtype === 'movement' ? 'bg-slate-400' : 
                    cat.subtype === 'cost' ? 'bg-orange-500' : 
                    cat.subtype === 'productive_society' ? 'bg-purple-500' :
                    cat.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'
                }`}></div>
                <div>
                    <span className="font-medium dark:text-white block">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                        {cat.subtype === 'movement' && <ArrowRightLeft size={10}/>}
                        {cat.subtype === 'productive_society' && <Users size={10}/>}
                        {cat.type === 'income' ? 'Receita' : (
                            cat.subtype === 'movement' ? 'Movimentação (Neutro)' :
                            cat.subtype === 'cost' ? 'Custo Direto' : 
                            cat.subtype === 'productive_society' ? 'Sociedade Produtiva' : 'Despesa Operacional'
                        )}
                    </span>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(cat)} className="text-blue-500 p-1 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                <button onClick={() => onDeleteCategory(cat.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};