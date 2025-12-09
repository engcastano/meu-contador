import React, { useEffect, useState } from 'react';
import { CompanyScope, User } from '../types';
import { getAssociatedCompanies } from '../api';
import { 
  Building2, Plus, ArrowRight, ShieldCheck, 
  Shield, User as UserIcon, Loader2, LogOut 
} from 'lucide-react';

interface CompanySelectionProps {
  user: User;
  onSelectCompany: (scope: CompanyScope) => void;
  onBack: () => void;
}

export const CompanySelection: React.FC<CompanySelectionProps> = ({ user, onSelectCompany, onBack }) => {
  const [companies, setCompanies] = useState<CompanyScope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (user.email && user.id) {
        const list = await getAssociatedCompanies(user.email, user.id);
        setCompanies(list);
      }
      setLoading(false);
    };
    fetchCompanies();
  }, [user]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck size={10}/> Admin</span>;
      case 'partner': return <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><Shield size={10}/> Sócio</span>;
      default: return <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><UserIcon size={10}/> Colab.</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32}/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-2xl w-full space-y-8">
        
        <div className="text-center space-y-2">
          <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Selecione a Empresa</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Você tem acesso a {companies.length} {companies.length === 1 ? 'ambiente' : 'ambientes'}.
          </p>
        </div>

        <div className="grid gap-4">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => onSelectCompany(company)}
              className="bg-white dark:bg-slate-800 p-6 rounded-xl border-2 border-transparent hover:border-indigo-500 hover:shadow-lg transition-all group text-left relative overflow-hidden"
            >
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white ${company.isOwner ? 'bg-indigo-600' : 'bg-slate-500'}`}>
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">
                      {company.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(company.role)}
                      {company.isOwner && <span className="text-xs text-slate-400">Minha conta principal</span>}
                    </div>
                  </div>
                </div>
                <ArrowRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" size={24} />
              </div>
            </button>
          ))}

          {/* Botão Nova Empresa (Placeholder Visual) */}
          <button
            onClick={() => alert("Funcionalidade de criar Múltiplas Empresas Próprias em breve! Por enquanto, utilize 'Minha Empresa' para gerenciar seu negócio principal.")}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
          >
            <Plus size={20} />
            <span className="font-medium">Nova Empresa</span>
          </button>
        </div>

        <div className="text-center pt-8">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-sm font-medium flex items-center justify-center gap-2 mx-auto">
            <LogOut size={16} /> Voltar para Seleção de Modo
          </button>
        </div>

      </div>
    </div>
  );
};