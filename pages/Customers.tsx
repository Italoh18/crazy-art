import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, User } from 'lucide-react';
import { Customer } from '../types';

export default function Customers() {
  const { customers, addCustomer } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', cpf: '',
    street: '', number: '', zipCode: ''
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cpf.includes(searchTerm)
  );

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
      }
    });
    setFormData({ name: '', phone: '', email: '', cpf: '', street: '', number: '', zipCode: '' });
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-orange-500/20 transition w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nome ou CPF..."
          className="w-full bg-surface border border-zinc-800 text-white pl-10 pr-4 py-3 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none shadow-sm placeholder-zinc-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-3.5 text-zinc-500" size={20} />
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => (
          <div 
            key={customer.id} 
            onClick={() => navigate(`/customers/${customer.id}`)}
            className="bg-surface p-6 rounded-xl border border-zinc-800 shadow-sm hover:border-primary/50 transition cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="bg-zinc-800 p-3 rounded-full group-hover:bg-primary/10 transition">
                  <User className="text-zinc-400 group-hover:text-primary transition" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-primary transition">{customer.name}</h3>
                  <p className="text-sm text-zinc-500">{customer.phone}</p>
                </div>
              </div>
              <ChevronRight className="text-zinc-600 group-hover:text-primary transition" size={20} />
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800 text-sm text-zinc-500 space-y-1">
               <p className="truncate">{customer.email}</p>
               <p>CPF: {customer.cpf}</p>
            </div>
          </div>
        ))}
        
        {filteredCustomers.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-500">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-surface border border-zinc-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800 sticky top-0 bg-surface z-10">
              <h2 className="text-xl font-bold text-white">Cadastrar Cliente</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white">
                <Plus size={24} className="transform rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Nome Completo</label>
                    <input name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Telefone</label>
                    <input name="phone" required value={formData.phone} onChange={handleInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">CPF</label>
                    <input name="cpf" required value={formData.cpf} onChange={handleInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2 border-t border-zinc-800 pt-4 mt-2">
                   <h3 className="font-semibold text-zinc-300 mb-4">Endereço</h3>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Rua</label>
                    <input name="street" required value={formData.street} onChange={handleInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Número</label>
                    <input name="number" required value={formData.number} onChange={handleInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">CEP</label>
                    <input name="zipCode" required value={formData.zipCode} onChange={handleInputChange} className="w-full bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-amber-600 transition">Salvar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}