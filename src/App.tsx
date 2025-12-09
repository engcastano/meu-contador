import React, { useState, useEffect } from 'react';
import { User as UserType, CompanyScope } from './types'; 
import { Login } from './Login';
import { PersonalApp } from './components/PersonalApp';
import { BusinessApp } from './components/BusinessApp'; 
import { CompanySelection } from './components/CompanySelection'; 
import { getUserPreferences, checkAccessPermission, getUserProfile, updateUserProfile } from './api';
import { auth } from './firebase';
import { Building2, User, ArrowRight, Settings, X, Save, Calendar, User as UserIcon, Mail } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  
  const [grantedAccess, setGrantedAccess] = useState<{ ownerId: string; role: string; companyName: string } | null>(null);
  const [appMode, setAppMode] = useState<'selection' | 'personal' | 'business_selection' | 'business_app'>('selection');
  const [selectedCompany, setSelectedCompany] = useState<CompanyScope | null>(null);

  // Estados para o Modal de Perfil
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', birthDate: '' });

  // Listener Autenticação
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const savedPrefs = await getUserPreferences(firebaseUser.uid);
        const userProfile = await getUserProfile(firebaseUser.uid);
        
        const userData = {
          id: firebaseUser.uid,
          username: userProfile?.displayName || firebaseUser.displayName || 'Usuário',
          email: firebaseUser.email || '',
          preferences: savedPrefs || {},
          role: 'admin',
          birthDate: userProfile?.birthDate || ''
        } as UserType;

        setUser(userData);
        setProfileForm({ displayName: userData.username, birthDate: userData.birthDate || '' });

        // Verifica acesso
        const permission = await checkAccessPermission(firebaseUser.email || '');
        if (permission) {
            setGrantedAccess({
                ownerId: permission.ownerId,
                role: permission.role,
                companyName: permission.companyName
            });
        } else {
            setGrantedAccess(null);
        }

        setIsAuthenticated(true);
        setAppMode('selection'); 
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setSelectedCompany(null);
        setAppMode('selection');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSaveProfile = async () => {
      if (!user) return;
      await updateUserProfile(user.id, profileForm);
      setUser({ ...user, username: profileForm.displayName, birthDate: profileForm.birthDate });
      setIsProfileModalOpen(false);
  };

  if (!isAuthenticated) return <Login onLogin={() => {}} />;

  // TELA DE SELEÇÃO
  if (appMode === 'selection') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-fadeIn relative">
              
              {/* Botão de Perfil no Topo Direito */}
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition-colors"
                title="Meu Perfil"
              >
                <Settings size={20}/>
              </button>

              <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
                  {/* CARD PESSOAL */}
                  <div className="space-y-4">
                      <button 
                          onClick={() => setAppMode('personal')}
                          className="w-full h-80 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-2 border-transparent hover:border-emerald-500 hover:ring-4 hover:ring-emerald-500/10 transition-all p-8 flex flex-col items-center justify-center group text-center"
                      >
                          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-24 h-24 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                              <User size={40} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Finanças Pessoais</h2>
                          <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                              Gerencie suas contas, cartões de crédito e despesas compartilhadas do dia a dia.
                          </p>
                      </button>
                  </div>

                  {/* CARD EMPRESARIAL */}
                  <div className="space-y-4">
                      <button 
                          onClick={() => setAppMode('business_selection')}
                          className="w-full h-80 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border-2 border-transparent hover:border-indigo-500 hover:ring-4 hover:ring-indigo-500/10 transition-all p-8 flex flex-col items-center justify-center group text-center relative overflow-hidden"
                      >
                           {grantedAccess ? (
                               <div className="absolute top-0 right-0 p-4">
                                  <div className="bg-purple-100 dark:bg-purple-900/40 px-3 py-1 rounded-full text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                      Acesso Concedido <ArrowRight size={12}/>
                                  </div>
                               </div>
                           ) : (
                               <div className="absolute top-0 right-0 p-4 opacity-50">
                                  <div className="bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                      Sócio Admin
                                  </div>
                              </div>
                           )}

                          <div className="bg-indigo-100 dark:bg-indigo-900/30 w-24 h-24 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                              <Building2 size={40} className="text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                              {grantedAccess ? grantedAccess.companyName : 'Minha Empresa'}
                          </h2>
                          <p className="text-xs font-bold uppercase text-indigo-500 mb-3 tracking-widest">
                              {grantedAccess ? (grantedAccess.role === 'partner' ? 'Sócio' : 'Colaborador') : 'Administrador'}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                              {grantedAccess 
                                ? "Acesse o painel corporativo compartilhado com você."
                                : "Controle de fluxo de caixa, notas fiscais (NFSe), tributos e gestão multi-empresas."
                              }
                          </p>
                      </button>
                  </div>
              </div>

              {/* MODAL DE PERFIL */}
              {isProfileModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
                      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold dark:text-white">Meu Perfil</h3>
                              <button onClick={() => setIsProfileModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                          </div>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail de Acesso</label>
                                  <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                      <Mail size={16}/>
                                      <span className="text-sm">{user?.email}</span>
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                  <div className="relative">
                                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                      <input 
                                          type="text" 
                                          value={profileForm.displayName}
                                          onChange={e => setProfileForm({...profileForm, displayName: e.target.value})}
                                          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                          placeholder="Seu nome"
                                      />
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data de Nascimento</label>
                                  <div className="relative">
                                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                      <input 
                                          type="date" 
                                          value={profileForm.birthDate}
                                          onChange={e => setProfileForm({...profileForm, birthDate: e.target.value})}
                                          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-700 dark:text-white"
                                      />
                                  </div>
                              </div>
                          </div>

                          <div className="mt-8 flex justify-end gap-3">
                              <button onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold">Cancelar</button>
                              <button onClick={handleSaveProfile} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2">
                                  <Save size={18}/> Salvar
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  if (appMode === 'business_selection' && user) {
      return (
          <CompanySelection 
              user={user}
              onBack={() => setAppMode('selection')}
              onSelectCompany={(company) => {
                  setSelectedCompany(company);
                  setAppMode('business_app');
              }}
          />
      );
  }

  if (appMode === 'personal' && user) {
      return <PersonalApp user={user} onBackToSelection={() => setAppMode('selection')} />;
  }

  if (appMode === 'business_app' && user && selectedCompany) {
      const contextUser = {
          ...user,
          id: selectedCompany.id, 
          role: selectedCompany.role as any 
      };

      return (
        <BusinessApp 
            user={contextUser} 
            onBackToSelection={() => {
                setSelectedCompany(null);
                setAppMode('business_selection'); 
            }} 
        />
      );
  }

  return null;
}