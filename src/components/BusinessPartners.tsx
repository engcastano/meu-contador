import React, { useState } from 'react';
import { BusinessPartner, BusinessRole } from '../businessTypes';
import { 
  Users, UserPlus, Search, Edit2, Trash2, X, 
  Shield, ShieldCheck, User, Mail, Phone, Lock 
} from 'lucide-react';

interface BusinessPartnersProps {
  partners: BusinessPartner[];
  onAddPartner: (partner: Omit<BusinessPartner, 'id'>) => void;
  onUpdatePartner: (id: string, partner: Partial<BusinessPartner>) => void;
  onDeletePartner: (id: string) => void;
}

export const BusinessPartners: React.FC<BusinessPartnersProps> = ({
  partners,
  onAddPartner,
  onUpdatePartner,
  onDeletePartner
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<BusinessPartner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<BusinessPartner>>({
    name: '',
    email: '',
    role: 'collaborator',
    phone: '',
    active: true
  });

  const handleEdit = (partner: BusinessPartner) => {
    setEditingPartner(partner);
    setFormData(partner);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este profissional? Ele perderá acesso ao sistema.')) {
      onDeletePartner(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return alert('Nome e Email são obrigatórios');

    const finalData = formData as Omit<BusinessPartner, 'id'>;

    if (editingPartner) {
      onUpdatePartner(editingPartner.id, finalData);
    } else {
      onAddPartner(finalData);
    }
    
    setIsModalOpen(false);
    setEditingPartner(null);
    setFormData({ name: '', email: '', role: 'collaborator', phone: '', active: true });
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: BusinessRole) => {
    switch (role) {
      case 'admin':
        return <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200"><ShieldCheck size={12}/> Sócio Admin</span>;
      case 'partner':
        return <span className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200"><Shield size={12}/> Sócio</span>;
      default:
        return <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold border border-slate-200"><User size={12}/> Colaborador</span>;
    }
  };

  const getRoleDescription = (role: string) => {
      switch (role) {
          case 'admin': return 'Acesso total ao sistema, incluindo gestão de usuários e financeiro.';
          case 'partner': return 'Acesso total aos projetos, financeiro e CRM. Sem gestão de usuários.';
          default: return 'Acesso restrito apenas ao painel de Projetos e Tarefas.';
      }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-600"/> Profissionais e Acessos
          </h2>
          <p className="text-slate-500 text-sm">Gerencie quem tem acesso ao sistema e suas permissões.</p>
        </div>
        <button
          onClick={() => { setEditingPartner(null); setFormData({ name: '', email: '', role: 'collaborator', active: true }); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <UserPlus size={20} />
          Novo Profissional
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
        />
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map((partner) => (
          <div key={partner.id} className={`bg-white dark:bg-slate-800 p-6 rounded-xl border shadow-sm transition-all relative group ${!partner.active ? 'opacity-60 grayscale border-slate-200' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}`}>
            
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${partner.role === 'admin' ? 'bg-purple-600' : partner.role === 'partner' ? 'bg-blue-600' : 'bg-slate-500'}`}>
                        {partner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white truncate max-w-[150px]">{partner.name}</h3>
                        {getRoleBadge(partner.role)}
                    </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-sm rounded-lg p-1">
                    <button onClick={() => handleEdit(partner)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(partner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
            </div>

            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400"/>
                    <span className="truncate">{partner.email}</span>
                </div>
                {partner.phone && (
                    <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-400"/>
                        <span>{partner.phone}</span>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className={`text-xs font-bold uppercase ${partner.active ? 'text-emerald-600' : 'text-red-500'}`}>
                    {partner.active ? 'Ativo' : 'Inativo'}
                </span>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock size={10} />
                    {partner.role === 'collaborator' ? 'Acesso Limitado' : 'Acesso Total'}
                </div>
            </div>
          </div>
        ))}

        {filteredPartners.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                Nenhum profissional encontrado.
            </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingPartner ? 'Editar Profissional' : 'Novo Profissional'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail de Acesso</label>
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  placeholder="joao@empresa.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone / WhatsApp</label>
                <input 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 border rounded-lg dark:bg-slate-700 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Permissão / Papel</label>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { val: 'admin', label: 'Sócio Administrador', icon: ShieldCheck, color: 'text-purple-600' },
                        { val: 'partner', label: 'Sócio', icon: Shield, color: 'text-blue-600' },
                        { val: 'collaborator', label: 'Colaborador', icon: User, color: 'text-slate-600' }
                    ].map((roleOpt) => (
                        <div 
                            key={roleOpt.val}
                            onClick={() => setFormData({...formData, role: roleOpt.val as BusinessRole})}
                            className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${formData.role === roleOpt.val ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'hover:bg-slate-50 border-slate-200'}`}
                        >
                            <roleOpt.icon size={20} className={roleOpt.color} />
                            <div className="flex-1">
                                <div className="font-bold text-sm text-slate-800">{roleOpt.label}</div>
                                <div className="text-[10px] text-slate-500 leading-tight">
                                    {getRoleDescription(roleOpt.val)}
                                </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.role === roleOpt.val ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                {formData.role === roleOpt.val && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                        </div>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                    type="checkbox" 
                    id="activeUser"
                    checked={formData.active}
                    onChange={e => setFormData({...formData, active: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="activeUser" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">Usuário Ativo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition-all">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};