import React, { useState } from 'react';
import { Briefcase, Plus, Search, Edit2, Trash2, X, Calendar, FolderOpen } from 'lucide-react';
import { Project, Client } from '../businessTypes';

interface BusinessContractsProps {
  projects: Project[];
  clients: Client[];
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onUpdateProject: (id: string, project: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
}

export const BusinessContracts: React.FC<BusinessContractsProps> = ({
  projects,
  clients,
  onAddProject,
  onUpdateProject,
  onDeleteProject
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    clientId: '',
    clientName: '',
    description: '',
    value: 0,
    startDate: new Date().toISOString().split('T')[0],
    status: 'active'
  });

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData(project);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      onDeleteProject(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Encontra o nome do cliente baseado no ID selecionado
    const selectedClient = clients.find(c => c.id === formData.clientId);
    const finalData = {
      ...formData,
      clientName: selectedClient?.name || 'Cliente Desconhecido'
    } as Omit<Project, 'id'>;

    if (editingProject) {
      onUpdateProject(editingProject.id, finalData);
    } else {
      onAddProject(finalData);
    }
    setIsModalOpen(false);
    setEditingProject(null);
    setFormData({
      name: '', clientId: '', clientName: '', description: '', value: 0, 
      startDate: new Date().toISOString().split('T')[0], status: 'active'
    });
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Projetos & Contratos</h2>
          <p className="text-slate-500">Gerencie seus projetos para facilitar a emissão de notas</p>
        </div>
        <button
          onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Projeto
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nome do projeto ou cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      {/* Grid de Projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <FolderOpen className="text-indigo-600 dark:text-indigo-400" size={24} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(project)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(project.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-rose-600 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">{project.name}</h3>
            <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
              <Briefcase size={14} />
              {project.clientName}
            </p>

            <div className="space-y-3 mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 min-h-[2.5rem]">
                {project.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar size={14} />
                Início: {new Date(project.startDate).toLocaleDateString('pt-BR')}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {project.status === 'active' ? 'Em Andamento' : 
                 project.status === 'completed' ? 'Concluído' : 'Pendente'}
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {project.value ? project.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ -'}
              </span>
            </div>
          </div>
        ))}

        {filteredProjects.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            Nenhum projeto encontrado. Crie um novo projeto para começar.
          </div>
        )}
      </div>

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Projeto</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  placeholder="Ex: Reforma do Galpão A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cliente Vinculado</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Escopo / Descrição Padrão</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  placeholder="Ex: Projeto executivo de instalações elétricas e hidráulicas..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor do Contrato</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="active">Em Andamento</option>
                  <option value="pending">Pendente</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
                >
                  {editingProject ? 'Salvar Alterações' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};