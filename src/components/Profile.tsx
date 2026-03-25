import React, { useState, useEffect } from 'react';
import { User, Appointment, Role, Service, Loan } from '../types';
import { Plus, Check, X, Edit2, DollarSign, Image as ImageIcon, CreditCard, Wallet, Trash2, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { format, isAfter, isToday, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingSpinner from './LoadingSpinner';

interface ProfileProps {
  user: User;
  token: string;
}

export default function Profile({ user, token }: ProfileProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<Appointment | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);

  // Form states (Appointment)
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [price, setPrice] = useState('');
  const [serviceRows, setServiceRows] = useState<{id: string, name: string, price: number}[]>([{ id: '1', name: '', price: 0 }]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentError, setAppointmentError] = useState('');

  // Form states (Worker)
  const [workerName, setWorkerName] = useState('');
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  const [workerRole, setWorkerRole] = useState<Role>('worker');
  const [workerError, setWorkerError] = useState('');

  // Completion states
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentProof, setPaymentProof] = useState<string | null>(null);

  const resetAppointmentForm = () => {
    setClientName('');
    setClientPhone('');
    setServiceName('');
    setPrice('');
    setServiceRows([{ id: Date.now().toString(), name: '', price: 0 }]);
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime('10:00');
    setEditingAppointment(null);
    setAppointmentError('');
  };

  const fetchData = async () => {
    setLoading(true);

    // Fetch services for everyone (needed for adding appointments)
    const servicesRes = await fetch('/api/services');
    const servicesData = await servicesRes.json();
    setServices(servicesData);

    if (user.role === 'admin') {
      const res = await fetch('/api/admin/workers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWorkers(data);
    } else {
      const res = await fetch(`/api/appointments/worker/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAppointments(data);

      // Fetch loans for the worker
      const loansRes = await fetch('/api/loans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const loansData = await loansRes.json();
      setLoans(loansData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setAppointmentError('');

    // Validación de fecha
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (!editingAppointment && date < todayStr) {
      setAppointmentError('No se pueden crear citas en días pasados.');
      return;
    }

    setIsSubmitting(true);

    const url = editingAppointment ? `/api/appointments/${editingAppointment.id}` : '/api/appointments';
    const method = editingAppointment ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        client_name: clientName,
        client_phone: clientPhone,
        service_name: serviceName,
        price: parseFloat(price),
        date,
        time
      })
    });

    if (res.ok) {
      setShowAddModal(false);
      resetAppointmentForm();
      fetchData();
    } else {
      const errorData = await res.json();
      setAppointmentError(errorData.error || 'Error al guardar la cita');
    }
    setIsSubmitting(false);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkerError('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: workerName,
        email: workerEmail,
        password: workerPassword,
        role: workerRole
      })
    });

    const data = await res.json();
    if (res.ok) {
      setShowAddWorkerModal(false);
      setWorkerName('');
      setWorkerEmail('');
      setWorkerPassword('');
      fetchData();
    } else {
      setWorkerError(data.error || 'Error al registrar');
    }
  };

  const handleDeleteWorker = async (id: number) => {
    if (!confirm('¿Estás segura de eliminar a esta trabajadora?')) return;

    const res = await fetch(`/api/admin/workers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  const handleUpdateStatus = async (id: number, status: string, extra = {}) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, ...extra })
    });

    if (res.ok) {
      setShowCompleteModal(null);
      setPaymentProof(null);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress heavily: 0.6 quality is enough for payment proofs
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            setPaymentProof(dataUrl);
          } else {
            // Fallback if canvas fails
            setPaymentProof(reader.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime12h = (time24: string) => {
    try {
      const [hours, minutes] = time24.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch (e) {
      return time24;
    }
  };

  if (loading) return <LoadingSpinner message="Cargando perfil..." />;

  if (user.role === 'admin') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-serif font-bold text-[#C16991]">Gestión de Trabajadoras</h2>
          <button
            onClick={() => setShowAddWorkerModal(true)}
            className="w-full sm:w-auto bg-[#C16991] text-white font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#A14971] transition-colors shadow-lg shadow-[#C16991]/20"
          >
            <UserPlus size={20} /> Registrar Trabajadora
          </button>
        </div>

        <div className="grid gap-4">
          {workers.map(worker => (
            <div key={worker.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#f0f0f0] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f5f5f0] rounded-full flex items-center justify-center overflow-hidden">
                  <img src={worker.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.name}`} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{worker.name}</h4>
                  <p className="text-[#8E9299] text-sm">{worker.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteWorker(worker.id)}
                className="w-10 h-10 text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors"
                title="Eliminar Trabajadora"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          {workers.length === 0 && (
            <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-[#e5e5e5]">
              <p className="text-[#8E9299]">No hay trabajadoras registradas.</p>
            </div>
          )}
        </div>

        {/* Add Worker Modal */}
        {showAddWorkerModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Nueva Trabajadora</h3>
              <form onSubmit={handleAddWorker} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Nombre</label>
                  <input
                    type="text" required value={workerName} onChange={e => setWorkerName(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#C16991]"
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Correo</label>
                  <input
                    type="email" required value={workerEmail} onChange={e => setWorkerEmail(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#C16991]"
                    placeholder="ejemplo@spa.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Contraseña</label>
                  <input
                    type="password" required value={workerPassword} onChange={e => setWorkerPassword(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#C16991]"
                    placeholder="••••••••"
                  />
                </div>

                {workerError && <p className="text-red-500 text-sm font-medium">{workerError}</p>}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button" onClick={() => setShowAddWorkerModal(false)}
                    className="flex-1 py-3 font-bold text-[#8E9299] hover:bg-gray-50 rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#C16991] text-white py-3 font-bold rounded-2xl shadow-lg shadow-[#C16991]/20"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const completedServices = appointments.filter(a => {
    if (a.status !== 'completed') return false;
    const aptDate = new Date(a.date.replace(/-/g, '/'));
    return isWithinInterval(aptDate, { start: weekStart, end: weekEnd });
  });

  const weeklyLoans = (loans || []).filter(l => {
    const lDate = new Date(l.date.split(' ')[0].replace(/-/g, '/'));
    return isWithinInterval(lDate, { start: weekStart, end: weekEnd });
  });

  const totalMoney = completedServices.reduce((sum, a) => sum + a.price, 0);
  const totalWeeklyLoans = weeklyLoans.reduce((sum, l) => sum + l.amount, 0);
  const workerEarnings = (totalMoney * 0.5) - totalWeeklyLoans;
  const futureAppointments = appointments.filter(a => a.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#C16991] text-white rounded-[32px] p-8 shadow-lg shadow-[#C16991]/20">
          <p className="text-[#f5f5f0]/70 text-sm font-bold uppercase tracking-widest mb-2">Mis Ganancias Netas</p>
          <h3 className="text-4xl font-serif font-bold">${workerEarnings.toLocaleString()}</h3>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/90">
            <div className="bg-white/10 px-3 py-1 rounded-full border border-white/20">Semana: {format(weekStart, 'd MMM', { locale: es })} - {format(weekEnd, 'd MMM', { locale: es })}</div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <div className="bg-white/10 px-3 py-1 rounded-full">Mi Bruto (50%): ${(totalMoney * 0.5).toLocaleString()}</div>
            {totalWeeklyLoans > 0 && (
              <div className="bg-white/10 px-3 py-1 rounded-full text-rose-100 font-bold border border-white/20">Préstamos Semanales: -${totalWeeklyLoans.toLocaleString()}</div>
            )}
            <div className="bg-white/10 px-3 py-1 rounded-full">Servicios: {completedServices.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0] flex flex-col justify-center">
            <p className="text-[#8E9299] text-[10px] font-bold uppercase tracking-widest mb-1">Próximas Citas</p>
            <h3 className="text-2xl font-serif font-bold text-[#4a4a4a]">{futureAppointments.length}</h3>
          </div>
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0] flex flex-col justify-center">
            <p className="text-[#8E9299] text-[10px] font-bold uppercase tracking-widest mb-1">Citas Completadas</p>
            <h3 className="text-2xl font-serif font-bold text-purple-600">{completedServices.length}</h3>
          </div>
          <button
            onClick={() => { resetAppointmentForm(); setShowAddModal(true); }}
            className="col-span-2 bg-[#C16991] text-white font-bold py-3 rounded-2xl hover:bg-[#A14971] transition-all shadow-md shadow-[#C16991]/10 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-serif font-bold px-2">Gestión de Citas</h2>

        {
          appointments.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-[#e5e5e5]">
              <p className="text-[#8E9299]">No tienes citas registradas.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {[
                { title: 'Por Realizar', items: appointments.filter(a => a.status === 'pending') },
                { title: 'Realizadas', items: appointments.filter(a => a.status !== 'pending') }
              ].map(group => (
                <div key={group.title}>
                  <h3 className="text-xl font-serif font-bold text-[#4a4a4a] mb-4 px-2">{group.title}</h3>
                  {group.items.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-8 text-center border border-dashed border-[#e5e5e5]">
                      <p className="text-[#8E9299]">No hay citas en esta categoría.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {group.items.map(apt => (
                        <div key={apt.id} className={`bg-white rounded-3xl p-6 shadow-sm border border-[#f0f0f0] transition-all ${apt.status === 'cancelled' ? 'opacity-50 grayscale' : ''}`}>
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex gap-4">
                              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold ${apt.status === 'completed' ? 'bg-purple-50 text-purple-600' :
                                apt.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-[#f5f5f0] text-[#C16991]'
                                }`}>
                                <span className="text-xs">{format(new Date(apt.date.replace(/-/g, '/')), 'MMM', { locale: es })}</span>
                                <span className="text-lg leading-none">{format(new Date(apt.date.replace(/-/g, '/')), 'dd')}</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-lg">{apt.service_name}</h4>
                                <p className="text-[#8E9299] text-sm flex items-center gap-1">
                                  <span>{formatTime12h(apt.time)}</span> • <span>{apt.client_name}</span>
                                  {apt.client_phone && (
                                    <span className="bg-[#C16991]/10 text-[#C16991] px-2 py-0.5 rounded-lg text-[10px] font-bold ml-1">
                                      {apt.client_phone}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <span className="font-bold text-lg mr-2">${apt.price.toLocaleString()}</span>

                              {apt.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingAppointment(apt);
                                      setClientName(apt.client_name);
                                      setClientPhone(apt.client_phone || '');
                                      setServiceName(apt.service_name);
                                      setPrice(apt.price.toString());
                                      setServiceRows([{ id: '1', name: apt.service_name, price: apt.price }]);
                                      setDate(apt.date);
                                      setTime(apt.time);
                                      setShowAddModal(true);
                                    }}
                                    className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors"
                                    title="Editar"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button
                                    onClick={() => setShowCompleteModal(apt)}
                                    className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                                    title="Completar"
                                  >
                                    <Check size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                                    className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors"
                                    title="Cancelar"
                                  >
                                    <X size={18} />
                                  </button>
                                </>
                              )}

                              {apt.status === 'completed' && (
                                <div className="bg-purple-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                  Completada
                                </div>
                              )}
                              {apt.status === 'cancelled' && (
                                <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                  Cancelada
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </div >

      {/* Add Modal */}
      {
        showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="bg-white w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl max-h-[95vh] overflow-y-auto">
              <h3 className="text-2xl font-serif font-bold mb-6">{editingAppointment ? 'Editar Cita' : 'Nueva Cita'}</h3>
              {appointmentError && (
                <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4 border border-red-100 flex items-center gap-2">
                  <X size={16} /> {appointmentError}
                </div>
              )}
              <form onSubmit={handleAddAppointment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Cliente</label>
                  <input
                    type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#C16991]"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Teléfono</label>
                  <input
                    type="tel" required value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#C16991]"
                    placeholder="300 000 0000"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-xs font-bold text-[#8E9299] uppercase">Servicio(s)</label>
                    <button 
                      type="button" 
                      onClick={() => setServiceRows([...serviceRows, { id: Date.now().toString(), name: '', price: 0 }])}
                      className="bg-[#C16991]/10 text-[#C16991] p-1 rounded-full hover:bg-[#C16991]/20 transition-colors"
                      title="Agregar otro servicio"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {serviceRows.map((row, index) => (
                       <div key={row.id} className="flex gap-2 relative">
                        <select
                          required={index === 0}
                          value={row.name}
                          onChange={e => {
                            const selectedName = e.target.value;
                            const selectedService = services.find(s => s.name === selectedName);
                            const updatedPrice = selectedService ? selectedService.price : 0;
                            
                            const newRows = [...serviceRows];
                            newRows[index] = { ...row, name: selectedName, price: updatedPrice };
                            setServiceRows(newRows);
                            
                            const validRows = newRows.filter(r => r.name);
                            setServiceName(validRows.map(r => r.name).join(' + '));
                            setPrice(validRows.reduce((sum, r) => sum + r.price, 0).toString());
                          }}
                          className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#C16991] appearance-none"
                        >
                          <option value="">Selecciona un servicio</option>
                          {row.name && !services.find(s => s.name === row.name) && (
                            <option value={row.name}>{row.name}</option>
                          )}
                          {services.map(s => (
                            <option key={s.id} value={s.name}>{s.name} - ${s.price.toLocaleString()}</option>
                          ))}
                        </select>
                        {serviceRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newRows = serviceRows.filter((_, i) => i !== index);
                              setServiceRows(newRows);
                              const validRows = newRows.filter(r => r.name);
                              setServiceName(validRows.map(r => r.name).join(' + '));
                              setPrice(validRows.reduce((sum, r) => sum + r.price, 0).toString());
                            }}
                            className="bg-red-50 text-red-500 px-3 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center shrink-0"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Precio</label>
                    <input
                      type="number" required value={price} onChange={e => setPrice(e.target.value)}
                      className="w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#C16991]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Hora</label>
                    <input
                      type="time" required value={time} onChange={e => setTime(e.target.value)}
                      className="w-[95%] sm:w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-3 focus:ring-2 focus:ring-[#C16991]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8E9299] uppercase mb-1">Fecha</label>
                  <input
                    type="date" required value={date} onChange={e => setDate(e.target.value)}
                    min={!editingAppointment ? format(new Date(), 'yyyy-MM-dd') : undefined}
                    className="w-[95%] sm:w-full bg-[#f5f5f0] border-none rounded-2xl py-3 px-3 focus:ring-2 focus:ring-[#C16991]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button" onClick={() => { setShowAddModal(false); resetAppointmentForm(); }}
                    className="flex-1 py-3 font-bold text-[#8E9299] hover:bg-gray-50 rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#C16991] text-white py-3 font-bold rounded-2xl shadow-lg shadow-[#C16991]/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : (editingAppointment ? 'Actualizar' : 'Guardar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Complete Modal */}
      {
        showCompleteModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl">
              <h3 className="text-2xl font-serif font-bold mb-2">Finalizar Servicio</h3>
              <p className="text-[#8E9299] mb-6">Confirma el método de pago para {showCompleteModal.client_name}</p>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-[#C16991] bg-[#C16991]/5' : 'border-[#f0f0f0]'
                      }`}
                  >
                    <Wallet size={24} className={paymentMethod === 'cash' ? 'text-[#C16991]' : 'text-[#8E9299]'} />
                    <span className={`font-bold text-sm ${paymentMethod === 'cash' ? 'text-[#C16991]' : 'text-[#8E9299]'}`}>Efectivo</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'transfer' ? 'border-[#C16991] bg-[#C16991]/5' : 'border-[#f0f0f0]'
                      }`}
                  >
                    <CreditCard size={24} className={paymentMethod === 'transfer' ? 'text-[#C16991]' : 'text-[#8E9299]'} />
                    <span className={`font-bold text-sm ${paymentMethod === 'transfer' ? 'text-[#C16991]' : 'text-[#8E9299]'}`}>Transferencia</span>
                  </button>
                </div>

                {paymentMethod === 'transfer' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[#8E9299] uppercase">Comprobante de Pago</label>
                    <div className="relative border-2 border-dashed border-[#e5e5e5] rounded-2xl p-4 flex flex-col items-center justify-center min-h-[120px]">
                      {paymentProof ? (
                        <div className="relative w-full h-32">
                          <img src={paymentProof} className="w-full h-full object-cover rounded-xl" />
                          <button
                            onClick={() => setPaymentProof(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="text-[#e5e5e5] mb-2" size={32} />
                          <p className="text-xs text-[#8E9299] text-center mb-4">Selecciona una opción para subir el comprobante</p>

                          <div className="flex gap-4 w-full px-4 relative z-10">
                            <label className="flex-1 bg-white border border-[#f0f0f0] rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer hover:border-[#C16991] transition-colors shadow-sm">
                              <ImageIcon size={20} className="text-[#C16991]" />
                              <span className="text-[10px] font-bold text-gray-600">Galería</span>
                              <input
                                type="file" accept="image/*" onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>

                            <label className="flex-1 bg-white border border-[#f0f0f0] rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer hover:border-[#C16991] transition-colors shadow-sm">
                              <span className="text-xl">📸</span>
                              <span className="text-[10px] font-bold text-gray-600">Tomar Foto</span>
                              <input
                                type="file" accept="image/*" capture="environment" onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => { setShowCompleteModal(null); setPaymentProof(null); }}
                    className="flex-1 py-3 font-bold text-[#8E9299] hover:bg-gray-50 rounded-2xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(showCompleteModal.id, 'completed', { payment_method: paymentMethod, payment_proof: paymentProof })}
                    disabled={isSubmitting || (paymentMethod === 'transfer' && !paymentProof)}
                    className="flex-1 bg-[#C16991] text-white py-3 font-bold rounded-2xl shadow-lg shadow-[#C16991]/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Finalizando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
