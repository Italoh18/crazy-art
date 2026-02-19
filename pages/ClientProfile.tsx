
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { User, Lock, MapPin, Mail, Save, Key, Edit2, Cloud } from 'lucide-react';

export default function ClientProfile() {
  const { currentCustomer } = useAuth();
  const { updateCustomer } = useData();
  
  // States do formulário
  const [formData, setFormData] = useState({
    name: '',
    street: '',
    number: '',
    zipCode: '',
    email: '',
    cloudLink: ''
  });
  
  // Senha apenas placeholder (visual)
  const [password, setPassword] = useState('');
  
  // Modal de Confirmação (Senha)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (currentCustomer) {
      setFormData({
        name: currentCustomer.name || '',
        street: currentCustomer.address?.street || '',
        number: currentCustomer.address?.number || '',
        zipCode: currentCustomer.address?.zipCode || '',
        email: currentCustomer.email || '',
        cloudLink: currentCustomer.cloudLink || ''
      });
    }
  }, [currentCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Abre modal para "confirmar com senha"
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!currentCustomer) return;
    
    // Aqui validaria a senha se existisse backend para isso
    // Por enquanto, apenas simula e salva
    
    await updateCustomer(currentCustomer.id, {
        name: formData.name,
        email: formData.email,
        cloudLink: formData.cloudLink,
        address: {
            street: formData.street,
            number: formData.number,
            zipCode: formData.zipCode
        }
    });
    
    setIsConfirmModalOpen(false);
    setConfirmPassword('');
    alert("Dados atualizados com sucesso!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary border border-primary/30">
            <User size={32} />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Minha Área</h1>
            <p className="text-zinc-400 text-sm">Gerencie seus dados pessoais e de acesso.</p>
        </div>
      </div>

      {formData.cloudLink && (
          <div className="flex justify-end">
              <a 
                  href={formData.cloudLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-5 py-2.5 bg-[#1e1b4b] hover:bg-[#2e2a5b] border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-xl transition flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-900/20"
              >
                  <Cloud size={18} /> Acessar Minha Nuvem
              </a>
          </div>
      )}

      <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl space-y-8">
        
        {/* Seção Pessoal */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Dados Pessoais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 ml-1">Nome Completo</label>
                    <div className="relative">
                        <input 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition"
                        />
                        <Edit2 className="absolute right-3 top-3.5 text-zinc-600 w-4 h-4" />
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">CPF / CNPJ (Não editável)</label>
                    <input 
                        value={currentCustomer?.cpf || ''}
                        disabled
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed font-mono"
                    />
                </div>
            </div>
        </div>

        {/* Seção Contato & Acesso */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Acesso e Contato</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 ml-1">E-mail</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition"
                            />
                            <Mail className="absolute left-3 top-3.5 text-zinc-600 w-4 h-4" />
                        </div>
                        <button type="button" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition">
                            Alterar
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 ml-1">Senha (Segurança)</label>
                    <div className="relative">
                        <input 
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition placeholder-zinc-600"
                        />
                        <Key className="absolute left-3 top-3.5 text-zinc-600 w-4 h-4" />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1 ml-1">Preencha apenas se desejar alterar sua senha atual.</p>
                </div>
            </div>
        </div>

        {/* Seção Endereço */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Endereço de Entrega</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 ml-1">Rua</label>
                    <div className="relative">
                        <input 
                            value={formData.street}
                            onChange={e => setFormData({...formData, street: e.target.value})}
                            className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-primary outline-none transition"
                        />
                        <MapPin className="absolute left-3 top-3.5 text-zinc-600 w-4 h-4" />
                    </div>
                </div>
                
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 ml-1">Número</label>
                    <input 
                        value={formData.number}
                        onChange={e => setFormData({...formData, number: e.target.value})}
                        className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5 ml-1">CEP</label>
                    <input 
                        value={formData.zipCode}
                        onChange={e => setFormData({...formData, zipCode: e.target.value})}
                        className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition font-mono"
                    />
                </div>
            </div>
        </div>

        <div className="pt-6 border-t border-zinc-800 flex justify-end">
            <button 
                type="submit"
                className="bg-primary hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition hover:scale-105 active:scale-95"
            >
                <Save size={18} /> Salvar Alterações
            </button>
        </div>
      </form>

      {/* Modal de Confirmação */}
      {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                      <Lock size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white text-center mb-2">Confirmar Alterações</h3>
                  <p className="text-zinc-400 text-xs text-center mb-6">Por segurança, digite sua senha para salvar os novos dados.</p>
                  
                  <input 
                      type="password"
                      placeholder="Sua senha atual"
                      autoFocus
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-3 text-white text-center focus:border-primary outline-none transition mb-4"
                  />
                  
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setIsConfirmModalOpen(false)}
                        className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleConfirmSave}
                        className="flex-1 py-3 bg-primary hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition shadow-lg"
                      >
                          Confirmar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
