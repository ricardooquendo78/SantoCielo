import React, { useState, useEffect } from 'react';
import { Service } from '../types';
import { Plus, Trash2, Sparkle, DollarSign } from 'lucide-react';

interface ServicesManagerProps {
  token: string;
}

export default function ServicesManager({ token }: ServicesManagerProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const fetchServices = async () => {
    const res = await fetch('/api/services');
    const data = await res.json();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, price: parseFloat(price) })
    });

    const data = await res.json();
    if (res.ok) {
      setName('');
      setPrice('');
      fetchServices();
    } else {
      setError(data.error || 'Error al agregar servicio');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('¿Estás segura de eliminar este servicio?')) return;
    const res = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      fetchServices();
    }
  };

  if (loading) return <div className="py-20 text-center">Cargando servicios...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#f0f0f0]">
        <h3 className="text-2xl font-serif font-bold mb-6">Agregar Nuevo Servicio</h3>
        <form onSubmit={handleAddService} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Nombre del Servicio</label>
            <div className="relative">
              <Sparkle className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={18} />
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#C16991]"
                placeholder="Ej: Manicura Semi"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Precio</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={18} />
              <input
                type="number" required value={price} onChange={e => setPrice(e.target.value)}
                className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#C16991]"
                placeholder="0"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-[#C16991] text-white font-bold py-3 px-8 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#A14971] transition-colors shadow-lg shadow-[#C16991]/20 self-end"
          >
            <Plus size={20} /> Agregar
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-4 font-medium">{error}</p>}
      </div>

      <div className="grid gap-4">
        <h3 className="text-xl font-serif font-bold px-2">Servicios Registrados</h3>
        {services.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-[#e5e5e5]">
            <p className="text-[#8E9299]">No hay servicios registrados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map(service => (
              <div key={service.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#f0f0f0] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#f5f5f0] rounded-2xl flex items-center justify-center text-[#C16991]">
                    <Sparkle size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold">{service.name}</h4>
                    <p className="text-[#C16991] font-bold">${service.price.toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteService(service.id)}
                  className="w-10 h-10 text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
