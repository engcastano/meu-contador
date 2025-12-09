import React, { useState, useEffect } from 'react';
import { Save, Building, CreditCard, User, Image as ImageIcon } from 'lucide-react';
import { CompanySettings } from '../businessTypes';

interface BusinessSettingsProps {
  initialSettings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
}

export const BusinessSettings: React.FC<BusinessSettingsProps> = ({ initialSettings, onSave }) => {
  const [formData, setFormData] = useState<CompanySettings>(initialSettings);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building className="text-indigo-600" />
            Dados da Empresa
          </h2>
          <p className="text-slate-500 text-sm">Estas informações serão usadas para gerar o texto padrão das Notas Fiscais.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Identidade Visual - NOVO */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <ImageIcon size={20} className="text-indigo-600" />
            Identidade Visual (Para PDF)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo da Empresa */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL do Logo da Empresa</label>
              <input 
                type="text" 
                placeholder="https://exemplo.com/logo.png"
                value={formData.logoUrl || ''}
                onChange={e => setFormData({...formData, logoUrl: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white text-xs"
              />
              <div className="h-32 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Preview Logo" className="max-h-full max-w-full object-contain p-2" onError={(e) => {e.currentTarget.style.display='none'; e.currentTarget.parentElement?.classList.add('bg-red-50')}} />
                ) : (
                  <span className="text-xs text-slate-400">Preview do Logo</span>
                )}
              </div>
            </div>

            {/* Brasão Prefeitura */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">URL do Brasão da Prefeitura</label>
              <input 
                type="text" 
                placeholder="https://exemplo.com/brasao.png"
                value={formData.cityHallLogoUrl || ''}
                onChange={e => setFormData({...formData, cityHallLogoUrl: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white text-xs"
              />
              <div className="h-32 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative">
                {formData.cityHallLogoUrl ? (
                  <img src={formData.cityHallLogoUrl} alt="Preview Brasão" className="max-h-full max-w-full object-contain p-2" onError={(e) => {e.currentTarget.style.display='none'; e.currentTarget.parentElement?.classList.add('bg-red-50')}} />
                ) : (
                  <span className="text-xs text-slate-400">Preview do Brasão</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dados Cadastrais (Existente) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Building size={20} className="text-indigo-600" />
            Dados Cadastrais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razão Social</label>
              <input 
                type="text" 
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CNPJ</label>
              <input 
                type="text" 
                value={formData.cnpj}
                onChange={e => setFormData({...formData, cnpj: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Inscrição Municipal</label>
              <input 
                type="text" 
                value={formData.municipalRegistry}
                onChange={e => setFormData({...formData, municipalRegistry: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
              <input 
                type="text" 
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Dados Bancários (Existente) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <CreditCard size={20} className="text-indigo-600" />
            Dados Bancários
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Banco</label>
              <input 
                type="text" 
                placeholder="Ex: Nubank"
                value={formData.bankName}
                onChange={e => setFormData({...formData, bankName: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código do Banco</label>
              <input 
                type="text" 
                placeholder="Ex: 260"
                value={formData.bankCode}
                onChange={e => setFormData({...formData, bankCode: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Agência</label>
              <input 
                type="text" 
                value={formData.agency}
                onChange={e => setFormData({...formData, agency: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Conta Corrente</label>
              <input 
                type="text" 
                value={formData.account}
                onChange={e => setFormData({...formData, account: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chave PIX</label>
              <input 
                type="text" 
                value={formData.pixKey}
                onChange={e => setFormData({...formData, pixKey: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Contato (Existente) */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <User size={20} className="text-indigo-600" />
            Informações de Contato
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Responsável</label>
              <input 
                type="text" 
                value={formData.contactName}
                onChange={e => setFormData({...formData, contactName: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
              <input 
                type="text" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
              <input 
                type="text" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-4">
          {showSuccess && <span className="text-emerald-600 font-medium animate-pulse">Configurações salvas com sucesso!</span>}
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/30"
          >
            <Save size={20} />
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
};