import React, { useState, useEffect } from 'react';
import { Appointment, User, Loan } from '../types';
import { Clock, User as UserIcon, Calendar, X, Check, Wallet, CreditCard, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingSpinner from './LoadingSpinner';

interface HomeProps {
  user: User;
  token: string;
}

export default function Home({ user, token }: HomeProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateStatus = async (id: number, status: string, extra = {}) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setCompleteError('');

    try {
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
        // Refresh data
        const appointmentsRes = await fetch('/api/appointments/today');
        const appointmentsData = await appointmentsRes.json();
        setAppointments(appointmentsData);
      } else {
        const errorData = await res.json();
        setCompleteError(errorData.error || 'Error al completar la cita');
      }
    } catch (error) {
      setCompleteError('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/appointments/today').then(res => res.json()),
      fetch('/api/loans', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.json())
    ]).then(([appointmentsData, loansData]) => {
      setAppointments(appointmentsData);
      setLoans(loansData);
      setLoading(false);
    });
  }, [token]);

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

  if (loading) return <LoadingSpinner message="Cargando citas de hoy..." />;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLoans = loans.filter(l => l.date.startsWith(todayStr));

  // Determine relevant data for financial totals
  const relevantAppointments = user.role === 'admin' 
    ? appointments 
    : appointments.filter(a => {
        const workerId = typeof a.worker_id === 'object' ? (a.worker_id as any).id || (a.worker_id as any)._id : a.worker_id;
        return workerId === user.id;
      });

  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const completedAppointments = relevantAppointments.filter(a => a.status === 'completed');
  
  // Total daily appointments for the list below (global view)
  const allCompletedAppointments = appointments.filter(a => a.status === 'completed');

  const cashTotal = completedAppointments.filter(a => a.payment_method === 'cash').reduce((sum, a) => sum + a.price, 0);
  const transferTotal = completedAppointments.filter(a => a.payment_method === 'transfer').reduce((sum, a) => sum + a.price, 0);
  const loanTotal = todayLoans.reduce((sum, l) => sum + l.amount, 0);
  const finalCash = cashTotal - loanTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold">Hoy</h2>
          <p className="text-[#8E9299] capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <button 
          onClick={() => setShowSummaryModal(true)}
          className="bg-[#C16991]/10 hover:bg-[#C16991]/20 transition-colors text-[#C16991] px-4 py-2 rounded-2xl text-sm font-bold flex flex-col items-end gap-1 cursor-pointer"
        >
          <div className="flex gap-3">
            <span>💵 ${finalCash.toLocaleString()}</span>
            <span>💳 ${transferTotal.toLocaleString()}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">
            {loanTotal > 0 ? `Ver con ${loanTotal.toLocaleString()} en préstamos` : 'Ver Resumen'}
          </span>
        </button>
      </div>

      {pendingAppointments.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-[#e5e5e5]">
          <Calendar className="mx-auto text-[#e5e5e5] mb-4" size={48} />
          <p className="text-[#8E9299] font-medium">No hay citas programadas para hoy.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#f5f5f0] rounded-2xl flex flex-col items-center justify-center text-[#C16991] p-1">
                  <Clock size={16} className="mb-1" />
                  <span className="text-[10px] font-bold text-center leading-tight">{formatTime12h(apt.time)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{apt.service_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-[#8E9299] text-sm">
                    <UserIcon size={14} />
                    <span>Cliente: {apt.client_name}</span>
                    {apt.client_phone && (
                      user.role === 'admin' ? (
                        <a
                          href={`https://wa.me/${apt.client_phone.replace(/\s+/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg ml-2 hover:bg-rose-100 transition-colors"
                          title="Contactar por WhatsApp"
                        >
                          <span className="text-xs font-bold">{apt.client_phone}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg ml-2 transition-colors">
                          <span className="text-xs font-bold">{apt.client_phone}</span>
                        </span>
                      )
                    )}
                  </div>
                  {apt.observation && (
                    <p className="text-xs text-[#8E9299] italic mt-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 inline-block">
                      Obs: {apt.observation}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                <div className="text-right">
                  <p className="text-xs text-[#8E9299] uppercase font-bold tracking-wider mb-1">Asignada a</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-medium">{apt.worker_name}</span>
                    <div className="w-6 h-6 bg-[#C16991] rounded-full flex items-center justify-center text-white text-[10px]">
                      {apt.worker_name?.charAt(0)}
                    </div>
                  </div>
                </div>
                <div className="bg-[#f5f5f0] px-4 py-2 rounded-xl text-sm font-bold text-[#C16991]">
                  ${apt.price.toLocaleString()}
                </div>
                {user.role === 'admin' && (
                  <button
                    onClick={() => {
                      setShowCompleteModal(apt);
                      setCompleteError('');
                    }}
                    className="w-10 h-10 bg-[#C16991] text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 cursor-pointer"
                    title="Confirmar Cita (Completar)"
                  >
                    <Check size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-serif font-bold">Resumen de Hoy</h3>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              <div className="flex gap-3">
                <div className="flex-1 bg-green-50 p-3 rounded-2xl border border-green-100">
                  <p className="text-[10px] text-green-600 font-bold uppercase mb-1">Efectivo (Bruto)</p>
                  <p className="font-bold text-green-700">${cashTotal.toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-blue-50 p-3 rounded-2xl border border-blue-100">
                  <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Transferencia</p>
                  <p className="font-bold text-blue-700">${transferTotal.toLocaleString()}</p>
                </div>
              </div>

              {loanTotal > 0 && (
                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-rose-600 font-bold uppercase">Menos Préstamos</p>
                    <p className="font-bold text-rose-700">-${loanTotal.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-rose-600 font-bold uppercase">Total a Entregar</p>
                    <p className="text-lg font-bold text-rose-700">${finalCash.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            <h4 className="font-bold text-sm text-[#8E9299] mb-3 uppercase tracking-wider">Servicios Completados</h4>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {completedAppointments.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8 border border-dashed border-gray-200 rounded-2xl mb-4">
                  No hay servicios terminados
                </p>
              ) : (
                completedAppointments.map(apt => (
                  <div key={apt.id} className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
                    <div>
                      <p className="font-bold text-sm">{apt.service_name}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                         <UserIcon size={10} /> {apt.worker_name}
                      </p>
                      {apt.observation && (
                        <p className="text-[10px] text-gray-400 italic mt-0.5">
                          Obs: {apt.observation}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-bold text-[#C16991]">${apt.price.toLocaleString()}</p>
                      <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">
                        {apt.payment_method === 'cash' ? 'Efectivo' : 'Transf.'}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {todayLoans.length > 0 && (
                <>
                  <h4 className="font-bold text-sm text-[#8E9299] mb-3 mt-6 uppercase tracking-wider">Préstamos de Hoy</h4>
                  <div className="space-y-3">
                    {todayLoans.map(loan => (
                      <div key={loan.id} className="bg-rose-50/50 rounded-2xl p-4 flex justify-between items-center border border-rose-100/50">
                        <div>
                          <p className="font-bold text-sm text-rose-700">${loan.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-rose-500 mt-1 italic max-w-[150px] truncate">
                            {loan.observation || 'Sin observación'}
                          </p>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-bold text-rose-400 uppercase">
                            {loan.date.split(' ')[1]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal for Admin */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl">
            <h3 className="text-2xl font-serif font-bold mb-2">Finalizar Servicio</h3>
            <p className="text-[#8E9299] mb-6">Confirma el método de pago para {showCompleteModal.client_name} (Administradora)</p>

            {completeError && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm mb-4 border border-red-100 flex items-center gap-2">
                <X size={16} /> {completeError}
              </div>
            )}

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
                  onClick={() => { setShowCompleteModal(null); setPaymentProof(null); setCompleteError(''); }}
                  className="flex-1 py-3 font-bold text-[#8E9299] hover:bg-gray-50 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleUpdateStatus(showCompleteModal.id, 'completed', { payment_method: paymentMethod, payment_proof: paymentProof })}
                  disabled={isSubmitting || (paymentMethod === 'transfer' && !paymentProof)}
                  className="flex-1 bg-[#C16991] text-white py-3 font-bold rounded-2xl shadow-lg shadow-[#C16991]/20 disabled:opacity-50 animate-pulse-subtle"
                >
                  {isSubmitting ? 'Finalizando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
