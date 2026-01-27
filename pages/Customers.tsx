
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, User, CreditCard, Trash2, X, MapPin, Cloud } from 'lucide-react';
import { Customer } from '../types';

export default function Customers() {
  const { customers, addCustomer, deleteCustomer } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', cpf: '',
    street: '', number: '', zipCode: '', creditLimit: '50', cloudLink: ''
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm)
  );

  // Máscara Dinâmica CPF/CNPJ
  const maskDocument = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})/, '$1-$2')
              .substring(0, 14);
    } else {
      return v.replace(/^(\d{2})(\d)/, '$1.$2')
              .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
              .replace(/\.(\d{3})(\d)/, '.$1/$2')
              .replace(/(\d{4})(\d)/, '$1-$2')
              .substring(0, 18);
    }
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    
    if (name === 'cpf') value = maskDocument(value);
    if (name === 'phone') value = maskPhone(value);

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      cpf: formData.cpf,
      address: {
        street: formData.street,
        number: formData.number,
        zipCode: formData.zipCode
      },
      creditLimit: parseFloat(formData.creditLimit) || 50.00,
      cloudLink: formData.cloudLink
    });
    setFormData({ name: '', phone: '', email: '', cpf: '', street: '', number: '', zipCode: '', creditLimit: '50', cloudLink: '' });
    setIsModalOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita navegar para detalhes ao clicar em excluir
    deleteCustomer(id);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 animate-fade-in-up">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight font-heading">Clientes</h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie sua base de clientes e crédito.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center space-x-2 bg-gradient-to-r from-primary to-orange-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 w-full sm:w-auto justify-center transition-all duration-300"
        >
          <div className="bg-white/20 rounded-full p-1 group-hover:rotate-90 transition-transform duration-500">
            <Plus size={18} />
          </div>
          <span className="font-bold text-sm tracking-wide">NOVO CLIENTE</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <input
          type="text"
          placeholder="Buscar por nome ou CPF/CNPJ..."
          className="relative w-full bg-[#121215] border border-white/10 text-white pl-12 pr-4 py-4 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none placeholder-zinc-500 transition-all text-sm shadow-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-4 top-4 text-zinc-500 group-hover:text-primary transition-colors" size={20} />
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map((customer, idx) => (
          <div 
            key={customer.id} 
            onClick={() => navigate(`/customers/${customer.id}`)}
            className="glass-panel p-6 rounded-2xl hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden animate-fade-in-up hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/5 duration-300"
            style={{ animationDelay: `${idx * 50 + 150}ms` }}
          >
            {/* Glow effect on hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:bg-primary/20 transition-colors duration-500 pointer-events-none"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-black rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-primary/50 group-hover:shadow-glow transition-all shadow-lg">
                  <User size={24} className="text-zinc-400 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors line-clamp-1 font-heading tracking-wide">{customer.name}</h3>
                  <p className="text-xs text-zinc-500 font-medium font-mono bg-white/5 px-2 py-0.5 rounded inline-block mt-1">{customer.phone}</p>
                </div>
              </div>
              <button 
                onClick={(e) => handleDelete(e, customer.id)}
                className="p-2.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0"
                title="Excluir Cliente"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="mt-6 pt-5 border-t border-white/5 text-sm text-zinc-500 space-y-3 relative z-10">
               <div className="flex justify-between items-center">
                   <span className="text-xs truncate max-w-[160px] hover:text-white transition-colors">{customer.email || 'Sem email'}</span>
                   <span className="text-[10px] bg-black/40 px-2 py-1 rounded border border-white/5 font-mono text-zinc-400">{customer.cpf}</span>
               </div>
               
               {customer.creditLimit > 0 && (
                   <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10 mt-2 group-hover:border-emerald-500/30 transition-colors">
                       <CreditCard size={14} />
                       <span className="text-xs font-bold tracking-wide">Limite: R$ {customer.creditLimit.toFixed(2)}</span>
                   </div>
               )}
            </div>
            
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 duration-300">
                <ChevronRight className="text-primary" size={18} />
            </div>
          </div>
        ))}
        
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800 animate-fade-in-up">
            <User size={64} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {/* Registration Modal - Reposicionado para cima (pt-12 md:pt-24) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-12 md:pt-24 bg-black/80 backdrop-blur-md p-4 animate-scale-in overflow-y-auto">
          <div className="glass-panel border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative">
            <div className="flex justify-between items-center p-6 border-b border-white/10 bg-[#121215]/95 backdrop-blur rounded-t-2xl shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-3 font-heading">
                  <div className="bg-primary/20 p-2 rounded-lg text-primary"><User size={20} /></div>
                  Cadastrar Cliente
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-transform hover:rotate-90 p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-8 custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Nome Completo / Razão Social</label>
                        <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-700" placeholder="Nome do cliente" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Telefone</label>
                        <input name="phone" required placeholder="(99) 99999-9999" value={formData.phone} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-700" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">CPF / CNPJ</label>
                        <input name="cpf" required placeholder="000.000.000-00" value={formData.cpf} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-700" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Email</label>
                        <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-700" placeholder="email@exemplo.com" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Limite de Crédito (R$)</label>
                        <input name="creditLimit" type="number" step="0.01" value={formData.creditLimit} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition font-mono" />
                        <p className="text-[10px] text-zinc-500 mt-1 ml-1">Padrão: R$ 50,00</p>
                    </div>
                    
                    {/* Novo Campo Cloud Link */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Link da Nuvem de Arquivos</label>
                        <div className="relative">
                            <input name="cloudLink" type="text" value={formData.cloudLink} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition placeholder-zinc-700" placeholder="https://..." />
                            <Cloud className="absolute left-3 top-3.5 text-zinc-600" size={18} />
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 border-t border-white/10 pt-6 mt-2">
                      <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                          <MapPin size={16} className="text-primary" /> Endereço
                      </h3>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Rua</label>
                        <input name="street" required value={formData.street} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">Número</label>
                        <input name="number" required value={formData.number} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">CEP</label>
                        <input name="zipCode" required value={formData.zipCode} onChange={handleInputChange} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                    </div>
                  </div>

                  <div className="pt-8 flex justify-end space-x-3 border-t border-white/10 mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition font-medium">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-primary/20 hover:scale-105 active:scale-95">Salvar Cliente</button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
