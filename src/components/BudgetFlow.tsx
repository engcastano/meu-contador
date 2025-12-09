import React, { useState } from 'react';
import { Account, CardConfig, SharedAccount, Tag, Transaction, CardTransaction, BudgetTarget } from '../types';
import { parseCurrency, checkDateMatch, calculateInvoiceDate, generateUUID } from '../utils';
import { MONTH_NAMES } from '../constants';
import { ChevronDown, ChevronRight, TrendingUp, Plus, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface BudgetFlowProps {
  accounts: Account[]; cardConfigs: CardConfig[]; sharedAccounts: SharedAccount[]; tags: Tag[];
  transactions: Transaction[]; cardTransactions: CardTransaction[]; budgetTargets: BudgetTarget[];
  onUpdateTarget: (target: BudgetTarget) => void; year: number; enabledModules: { cards: boolean; shared: boolean; };
}

export const BudgetFlow: React.FC<BudgetFlowProps> = ({
  accounts, cardConfigs, sharedAccounts, tags, transactions, cardTransactions, budgetTargets, onUpdateTarget, year, enabledModules
}) => {
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [forcedTags, setForcedTags] = useState<Record<string, Set<string>>>({});
  // Guarda posição exata do clique para menu flutuante
  const [menuConfig, setMenuConfig] = useState<{ id: string; top: number; left: number } | null>(null);

  const toggleGroup = (id: string) => { const newSet = new Set(expandedGroups); if(newSet.has(id)) newSet.delete(id); else newSet.add(id); setExpandedGroups(newSet); };

  // Posiciona o menu exatamente ao lado do botão clicado (Direita)
  const handleOpenMenu = (e: React.MouseEvent, groupId: string) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      // Menu aparece à direita e um pouco abaixo para não tapar o botão
      setMenuConfig({ id: groupId, top: rect.top, left: rect.right + 10 });
  };

  // Helpers de cálculo
  const getAccountActual = (accountName: string, category: string, monthIndex: number, type: 'income' | 'expense') => {
      const val = transactions.filter(t => t.account === accountName && t.type === category && !t.isShared && !t.excludeFromBudget && checkDateMatch((t.isRealized ? t.dateRealized : t.dateExpected), year, monthIndex)).reduce((acc, t) => acc + t.value, 0);
      return type === 'income' ? (val > 0 ? val : 0) : (val < 0 ? Math.abs(val) : 0);
  };
  const getCardActual = (cardId: string, category: string, monthIndex: number, type: 'income' | 'expense') => {
      if (type === 'income') return 0;
      const card = cardConfigs.find(c => c.id === cardId); if(!card) return 0;
      return cardTransactions.filter(t => t.cardName === cardId && t.type === category && checkDateMatch(t.dateInvoice || calculateInvoiceDate(t.datePurchase, card.closingDay), year, monthIndex)).reduce((acc, t) => acc + Math.abs(t.value), 0);
  };
  const getSharedActual = (sharedId: string, category: string, monthIndex: number, type: 'income' | 'expense') => {
      const val = transactions.filter(t => t.account === sharedId && t.type === category && t.isShared && !t.excludeFromBudget && checkDateMatch((t.isRealized ? t.dateRealized : t.dateExpected), year, monthIndex)).reduce((acc, t) => acc + t.value, 0);
      return type === 'income' ? (val > 0 ? val : 0) : (val < 0 ? Math.abs(val) : 0);
  };

  const getVisibleTagsForGroup = (groupId: string, groupName: string, type: 'account' | 'card' | 'shared', flowType: 'income' | 'expense') => {
      const visible = new Set<string>();
      budgetTargets.filter(b => b.groupId === groupId && b.year === year && (b as any).type === flowType && b.value > 0).forEach(b => visible.add(b.category));
      tags.forEach(tag => {
          let hasData = false;
          for(let m=0; m<12; m++) {
              const val = type === 'account' ? getAccountActual(groupName, tag.name, m, flowType) : type === 'card' ? getCardActual(groupId, tag.name, m, flowType) : getSharedActual(groupId, tag.name, m, flowType);
              if (val > 0) { hasData = true; break; }
          }
          if (hasData) visible.add(tag.name);
      });
      const key = groupId + flowType;
      if (forcedTags[key]) forcedTags[key].forEach(t => visible.add(t));
      return Array.from(visible).sort();
  };

  const handleAddTag = (groupId: string, tagName: string, flowType: 'income' | 'expense') => {
      const key = groupId + flowType;
      setForcedTags(prev => { const s = new Set(prev[key] || []); s.add(tagName); return { ...prev, [key]: s }; });
      setMenuConfig(null); 
  };

  const handleRemoveTag = (groupId: string, tagName: string, flowType: 'income' | 'expense') => {
      const key = groupId + flowType;
      setForcedTags(prev => { const s = new Set(prev[key] || []); s.delete(tagName); return { ...prev, [key]: s }; });
      for(let m=0; m<12; m++) {
          const existingTarget = budgetTargets.find(b => b.year === year && b.month === m && b.groupId === groupId && b.category === tagName && (b as any).type === flowType);
          if (existingTarget) onUpdateTarget({ ...existingTarget, value: 0 });
      }
  };

  const renderSection = (flowType: 'income' | 'expense') => {
      const isIncome = flowType === 'income';
      const renderGroupRows = (groupId: string, groupName: string, entityType: 'account' | 'card' | 'shared') => {
          if (isIncome && entityType === 'card') return null;

          const isExpanded = expandedGroups.has(groupId + flowType);
          const visibleCategories = getVisibleTagsForGroup(groupId, groupName, entityType, flowType);
          
          const groupTotals = MONTH_NAMES.map((_, monthIndex) => {
              let totalActual = 0; let totalTarget = 0;
              tags.forEach(tag => {
                  const actual = entityType === 'account' ? getAccountActual(groupName, tag.name, monthIndex, flowType) : entityType === 'card' ? getCardActual(groupId, tag.name, monthIndex, flowType) : getSharedActual(groupId, tag.name, monthIndex, flowType);
                  const target = budgetTargets.find(b => b.year === year && b.month === monthIndex && b.groupId === groupId && b.category === tag.name && (b as any).type === flowType)?.value || 0;
                  totalActual += actual; totalTarget += target;
              });
              return { totalActual, totalTarget };
          });

          return (
              <React.Fragment key={groupId + flowType}>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-bold text-sm group">
                      {/* TÍTULO DO GRUPO COM BOTÃO + */}
                      <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800 p-3 flex items-center justify-between shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleGroup(groupId + flowType)}>
                              {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                              <span className="dark:text-white truncate max-w-[180px]">{groupName}</span>
                          </div>
                          {/* Botão que dispara o menu */}
                          <button onClick={(e) => handleOpenMenu(e, groupId + flowType)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-blue-600"><Plus size={14}/></button>
                      </td>
                      
                      {/* COLUNAS TOTAIS */}
                      {groupTotals.map((t, idx) => (
                          <td key={idx} className="p-2 text-right min-w-[100px] border-l border-slate-200 dark:border-slate-700">
                              <div className="text-slate-400 text-[9px]">Meta: {parseCurrency(t.totalTarget)}</div>
                              <div className={`${t.totalActual > t.totalTarget && t.totalTarget > 0 ? 'text-red-500' : isIncome ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}`}>{parseCurrency(t.totalActual)}</div>
                          </td>
                      ))}
                  </tr>
                  
                  {isExpanded && visibleCategories.map(catName => {
                       const tag = tags.find(t => t.name === catName) || { name: catName, color: '#ccc' };
                       return (
                       <tr key={`${groupId}-${catName}-${flowType}`} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 group/row">
                           <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover/row:bg-slate-50 dark:group-hover/row:bg-slate-800/50 p-2 pl-8 text-xs text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] flex justify-between items-center">
                               <div className="flex items-center gap-2 truncate max-w-[160px]" title={tag.name}><div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor: tag.color}}></div>{tag.name}</div>
                               <button onClick={() => handleRemoveTag(groupId, tag.name, flowType)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-opacity"><X size={12}/></button>
                           </td>
                           {MONTH_NAMES.map((_, monthIndex) => {
                               const actual = entityType === 'account' ? getAccountActual(groupName, tag.name, monthIndex, flowType) : entityType === 'card' ? getCardActual(groupId, tag.name, monthIndex, flowType) : getSharedActual(groupId, tag.name, monthIndex, flowType);
                               const targetObj = budgetTargets.find(b => b.year === year && b.month === monthIndex && b.groupId === groupId && b.category === tag.name && (b as any).type === flowType);
                               const target = targetObj?.value || 0;
                               return (
                                   <td key={monthIndex} className="p-1 text-right border-r border-slate-100 dark:border-slate-700/50 min-w-[100px]">
                                       <div className="flex flex-col gap-0.5 relative">
                                           <input 
                                              type="number" 
                                              className="w-full text-right text-[9px] p-0.5 rounded bg-transparent border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:text-slate-400 transition-all placeholder-slate-200"
                                              placeholder={target > 0 ? '' : '-'}
                                              value={target || ''}
                                              onChange={(e) => onUpdateTarget({ id: targetObj?.id || generateUUID(), year, month: monthIndex, groupId, category: tag.name, type: flowType as any, value: parseFloat(e.target.value) || 0 })}
                                           />
                                           <div className={`text-[10px] font-medium ${actual > target && target > 0 ? 'text-red-500' : actual > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 opacity-40'}`}>{parseCurrency(actual)}</div>
                                       </div>
                                   </td>
                               );
                           })}
                       </tr>
                       )
                  })}
              </React.Fragment>
          );
      };

      return (
          <>
            <tr className={flowType === 'income' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}><td className={`sticky left-0 z-20 p-3 text-sm font-extrabold uppercase tracking-wider border-y dark:border-slate-700 ${flowType === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-slate-900' : 'bg-red-50 text-red-600 dark:bg-slate-900'}`}>{flowType === 'income' ? 'Receitas / Entradas' : 'Despesas / Saídas'}</td><td colSpan={12} className="border-y dark:border-slate-700"></td></tr>
            {accounts.filter(a => !a.archived).map(acc => renderGroupRows(acc.id, acc.name, 'account'))}
            {flowType === 'expense' && enabledModules.cards && cardConfigs.filter(c => !c.archived).map(card => renderGroupRows(card.id, card.name, 'card'))}
            {enabledModules.shared && sharedAccounts.filter(s => !s.archived).map(shared => renderGroupRows(shared.id, shared.name, 'shared'))}
          </>
      );
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative" onClick={() => setMenuConfig(null)}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center flex-shrink-0">
            <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><TrendingUp size={20}/> Fluxo Orçamentário {year}</h2>
        </div>
        
        {/* MENU DE CATEGORIAS (POSIÇÃO FIXA CALCULADA) */}
        {menuConfig && (
            <div className="fixed bg-white dark:bg-slate-700 shadow-2xl border dark:border-slate-600 rounded-lg z-[9999] w-48 p-1 max-h-64 overflow-y-auto animate-scale-in" style={{ top: menuConfig.top, left: menuConfig.left }}>
                <div className="p-2 text-xs font-bold text-slate-400 uppercase border-b dark:border-slate-600 mb-1">Adicionar Categoria</div>
                {tags.map(t => (
                    <button key={t.name} onClick={(e) => { e.stopPropagation(); handleAddTag(menuConfig.id.replace('income','').replace('expense',''), t.name, menuConfig.id.includes('income') ? 'income' : 'expense'); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-600 rounded flex items-center gap-2 dark:text-white">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: t.color}}></div>{t.name}
                    </button>
                ))}
            </div>
        )}

        <div className="flex-1 overflow-auto relative">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 p-4 min-w-[250px] font-bold text-slate-600 dark:text-slate-300 border-b border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Grupos / Categorias</th>
                        {MONTH_NAMES.map(m => (<th key={m} className="p-2 min-w-[100px] text-center font-bold text-slate-600 dark:text-slate-300 border-b dark:border-slate-700 text-sm bg-slate-100 dark:bg-slate-800">{m}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {renderSection('income')}
                    <tr><td colSpan={13} className="h-4 bg-slate-50 dark:bg-slate-950"></td></tr>
                    {renderSection('expense')}
                </tbody>
            </table>
        </div>
    </div>
  );
};