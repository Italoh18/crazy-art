
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, User, CreditCard, Trash2, X, MapPin } from 'lucide-react';
import { Customer } from '../types';

export default function Customers() {
  const { customers, addCustomer, deleteCustomer } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', cpf: '',
    street: '', number: '', zipCode: '', creditLimit: '50'
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm)
  );

  // Masks
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
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
    
    if (name === 'cpf') value = maskCPF(value);
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
      creditLimit: parseFloat(formData.creditLimit) || 50.00
    });
    setFormData({ name: '', phone: '', email: '', cpf: '', street: '', number: '', zipCode: '', creditLimit: '50' });
    setIsModalOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita navegar para detalhes ao clicar em excluir
    deleteCustomer(id);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Clientes</h1>
            <p className="text-zinc-400 text-sm mt-1">Gerencie sua base de clientes e crédito.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white px-6 py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto justify-center"
        >
          <div className="bg-white/20 rounded-full p-1 group-hover:rotate-90 transition-transform">
            <Plus size={18} />
          </div>
          <span className="font-bold text-sm tracking-wide">NOVO CLIENTE</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-xl blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
        <input
          type="text"
          placeholder="Buscar por nome ou CPF..."
          className="relative w-full bg-zinc-900 border border-zinc-800 text-white pl-12 pr-4 py-4 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none placeholder-zinc-500 transition-all text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-4 top-4 text-zinc-500 group-hover:text-primary transition-colors" size={20} />
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.map((customer, idx) => (
          <div 
            key={customer.id} 
            onClick={() => navigate(`/customers/${customer.id}`)}
            className="bg-surface border border-zinc-800/60 p-6 rounded-2xl hover:border-primary/40 hover:bg-zinc-800/50 transition-all cursor-pointer group relative overflow-hidden animate-fade-in-up"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Glow effect on hover */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:bg-primary/10 transition-colors duration-500"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 group-hover:border-primary/30 group-hover:text-primary transition-all shadow-sm">
                  <User size={20} className="text-zinc-400 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg group-hover:text-primary transition-colors line-clamp-1">{customer.name}</h3>
                  <p className="text-xs text-zinc-500 font-medium">{customer.phone}</p>
                </div>
              </div>
              <button 
                onClick={(e) => handleDelete(e, customer.id)}
                className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                title="Excluir Cliente"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-zinc-800/50 text-sm text-zinc-500 space-y-2 relative z-10">
               <div className="flex justify-between items-center">
                   <span className="text-xs truncate max-w-[150px]">{customer.email || 'Sem email'}</span>
                   <span className="text-xs bg-zinc-900 px-2 py-1 rounded border border-zinc-800">{customer.cpf}</span>
               </div>
               
               {customer.creditLimit > 0 && (
                   <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 mt-2">
                       <CreditCard size={14} />
                       <span className="text-xs font-bold">Limite: R$ {customer.creditLimit.toFixed(2)}</span>
                   </div>
               )}
            </div>
            
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                <ChevronRight className="text-primary" size={16} />
            </div>
          </div>
        ))}
        
        {filteredCustomers.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
            <User size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Nenhum cliente encontrado.</p>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-surface border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface/95 backdrop-blur z-10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User className="text-primary" size={24} />
                  Cadastrar Cliente
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-transform hover:rotate-90">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Nome Completo</label>
                    <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" placeholder="Nome do cliente" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Telefone</label>
                    <input name="phone" required placeholder="(99) 99999-9999" value={formData.phone} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">CPF</label>
                    <input name="cpf" required placeholder="000.000.000-00" value={formData.cpf} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Email</label>
                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" placeholder="email@exemplo.com" />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Limite de Crédito (R$)</label>
                    <input name="creditLimit" type="number" step="0.01" value={formData.creditLimit} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                    <p className="text-[10px] text-zinc-500 mt-1 ml-1">Padrão: R$ 50,00</p>
                </div>
                
                <div className="col-span-1 md:col-span-2 border-t border-zinc-800/50 pt-4 mt-2">
                   <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                       <MapPin size={16} className="text-primary" /> Endereço
                   </h3>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Rua</label>
                    <input name="street" required value={formData.street} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">Número</label>
                    <input name="number" required value={formData.number} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5 ml-1">CEP</label>
                    <input name="zipCode" required value={formData.zipCode} onChange={handleInputChange} className="w-full bg-black/40 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition" />
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3 border-t border-zinc-800 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition font-medium">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-primary/20">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
