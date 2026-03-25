import { useState, useEffect } from 'react';
import { Appointment, User } from '../types';
import { Clock, User as UserIcon, Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingSpinner from './LoadingSpinner';

interface HomeProps {
  user: User;
}

export default function Home({ user }: HomeProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  useEffect(() => {
    fetch('/api/appointments/today')
      .then(res => res.json())
      .then(data => {
        setAppointments(data);
        setLoading(false);
      });
  }, []);

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

  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const completedAppointments = appointments.filter(a => a.status === 'completed');

  const cashTotal = completedAppointments.filter(a => a.payment_method === 'cash').reduce((sum, a) => sum + a.price, 0);
  const transferTotal = completedAppointments.filter(a => a.payment_method === 'transfer').reduce((sum, a) => sum + a.price, 0);

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
            <span>💵 ${cashTotal.toLocaleString()}</span>
            <span>💳 ${transferTotal.toLocaleString()}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">Ver Resumen</span>
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
                  <div className="flex items-center gap-2 text-[#8E9299] text-sm">
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

            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-green-50 p-3 rounded-2xl border border-green-100">
                <p className="text-[10px] text-green-600 font-bold uppercase mb-1">Efectivo</p>
                <p className="font-bold text-green-700">${cashTotal.toLocaleString()}</p>
              </div>
              <div className="flex-1 bg-blue-50 p-3 rounded-2xl border border-blue-100">
                <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Transferencia</p>
                <p className="font-bold text-blue-700">${transferTotal.toLocaleString()}</p>
              </div>
            </div>

            <h4 className="font-bold text-sm text-[#8E9299] mb-3 uppercase tracking-wider">Servicios Completados</h4>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {completedAppointments.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8 border border-dashed border-gray-200 rounded-2xl">
                  No hay servicios terminados hoy
                </p>
              ) : (
                completedAppointments.map(apt => (
                  <div key={apt.id} className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
                    <div>
                      <p className="font-bold text-sm">{apt.service_name}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                         <UserIcon size={10} /> {apt.worker_name}
                      </p>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
