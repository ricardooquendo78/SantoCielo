import { useState, useEffect } from 'react';
import { Appointment } from '../types';
import { Clock, User as UserIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Home() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="py-20 text-center text-[#8E9299]">Cargando citas de hoy...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold">Hoy</h2>
          <p className="text-[#8E9299] capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <div className="bg-[#C16991]/10 text-[#C16991] px-4 py-2 rounded-full text-sm font-bold">
          {appointments.length} Citas
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-[#e5e5e5]">
          <Calendar className="mx-auto text-[#e5e5e5] mb-4" size={48} />
          <p className="text-[#8E9299] font-medium">No hay citas programadas para hoy.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => (
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
                      <a
                        href={`https://wa.me/${apt.client_phone.replace(/\s+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg ml-2 hover:bg-rose-100 transition-colors"
                        title="Contactar por WhatsApp"
                      >
                        <span className="text-xs font-bold">{apt.client_phone}</span>
                      </a>
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
    </div>
  );
}
