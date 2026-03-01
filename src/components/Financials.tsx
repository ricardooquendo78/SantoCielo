import React, { useState, useEffect } from 'react';
import { Appointment, Loan } from '../types';
import { DollarSign, Calendar, User as UserIcon, CreditCard, Wallet, FileText, Download, TrendingDown, X } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface FinancialsProps {
  token: string;
}

export default function Financials({ token }: FinancialsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/financials', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setAppointments(data.appointments || []);
        setLoans(data.loans || []);
        setLoading(false);
      });
  }, [token]);


  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

  // Daily totals
  const dailyAppointments = appointments.filter(apt => apt.date === todayStr);
  const dailyLoans = loans.filter(l => l.date.startsWith(todayStr));

  const dailyGrossSales = dailyAppointments.reduce((sum, apt) => sum + apt.price, 0);
  const dailyTotalLoans = dailyLoans.reduce((sum, l) => sum + l.amount, 0);
  const dailyNetCash = dailyGrossSales - dailyTotalLoans;

  // Weekly totals
  const weeklyAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date.replace(/-/g, '/'));
    return isWithinInterval(aptDate, { start: weekStart, end: weekEnd });
  });
  const weeklyLoans = loans.filter(l => {
    const lDate = new Date(l.date.split(' ')[0].replace(/-/g, '/'));
    return isWithinInterval(lDate, { start: weekStart, end: weekEnd });
  });

  const weeklyGrossSales = weeklyAppointments.reduce((sum, apt) => sum + apt.price, 0);
  const weeklyTotalLoans = weeklyLoans.reduce((sum, l) => sum + l.amount, 0);
  const weeklyNetIncome = weeklyGrossSales - weeklyTotalLoans;

  const cashSales = weeklyAppointments.filter(apt => apt.payment_method === 'cash').reduce((sum, apt) => sum + apt.price, 0);
  const transferSales = weeklyAppointments.filter(apt => apt.payment_method === 'transfer').reduce((sum, apt) => sum + apt.price, 0);

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

  if (loading) return <div className="py-20 text-center">Cargando resumen financiero...</div>;

  return (
    <div className="space-y-8">
      {/* Daily Summary */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#f0f0f0]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-serif font-bold">Resumen de Hoy</h3>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-[#8E9299] uppercase">Caja Neta</span>
            <div className="bg-rose-50 text-[#C16991] px-4 py-1 rounded-full text-lg font-bold">
              ${dailyNetCash.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#fdfaf6] rounded-2xl">
            <p className="text-[#8E9299] text-xs font-bold uppercase mb-1">Ventas Brutas</p>
            <p className="text-xl font-bold">${dailyGrossSales.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-rose-50 rounded-2xl">
            <p className="text-red-500 text-xs font-bold uppercase mb-1">Préstamos Hoy</p>
            <p className="text-xl font-bold text-red-600">-${dailyTotalLoans.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-[#fdfaf6] rounded-2xl">
            <p className="text-[#8E9299] text-xs font-bold uppercase mb-1">Efectivo</p>
            <p className="text-xl font-bold text-purple-600">
              ${dailyAppointments.filter(a => a.payment_method === 'cash').reduce((s, a) => s + a.price, 0).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-[#fdfaf6] rounded-2xl">
            <p className="text-[#8E9299] text-xs font-bold uppercase mb-1">Transf.</p>
            <p className="text-xl font-bold text-blue-600">
              ${dailyAppointments.filter(a => a.payment_method === 'transfer').reduce((s, a) => s + a.price, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold">Resumen Semanal</h2>
          <p className="text-[#8E9299]">
            {format(weekStart, "d 'de' MMM", { locale: es })} - {format(weekEnd, "d 'de' MMM, yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold text-[#8E9299] uppercase pr-2">Total Recaudado</span>
          <div className="bg-[#C16991] text-white px-6 py-3 rounded-2xl shadow-lg shadow-[#C16991]/20 flex items-center gap-2">
            <DollarSign size={20} />
            <span className="text-2xl font-bold">${weeklyNetIncome.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0] flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest">Efectivo</p>
            <h3 className="text-xl font-bold">${cashSales.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0] flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest">Transf.</p>
            <h3 className="text-xl font-bold">${transferSales.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0] flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-red-500 rounded-2xl flex items-center justify-center">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest">Total Préstamos</p>
            <h3 className="text-xl font-bold text-red-500">-${weeklyTotalLoans.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-[#f0f0f0] overflow-hidden">
        <div className="px-8 py-6 border-b border-[#f0f0f0] flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold">Detalle de Ventas</h3>
          <FileText className="text-[#8E9299]" size={20} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#fdfaf6] text-[#8E9299] text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-4">Fecha</th>
                <th className="px-8 py-4">Servicio</th>
                <th className="px-8 py-4">Trabajadora</th>
                <th className="px-8 py-4">Método</th>
                <th className="px-8 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {weeklyAppointments.map(apt => (
                <tr key={apt.id} className="hover:bg-[#fdfaf6] transition-colors">
                  <td className="px-8 py-5">
                    <div className="text-sm font-medium">{format(new Date(apt.date.replace(/-/g, '/')), 'dd/MM/yy')}</div>
                    <div className="text-xs text-[#8E9299]">{formatTime12h(apt.time)}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="font-bold">{apt.service_name}</div>
                    <div className="text-xs text-[#8E9299]">
                      {apt.client_name}
                      {apt.client_phone && ` • ${apt.client_phone}`}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#C16991] rounded-full flex items-center justify-center text-white text-[10px]">
                        {apt.worker_name?.charAt(0)}
                      </div>
                      <span className="text-sm">{apt.worker_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {apt.payment_method === 'transfer' && apt.payment_proof ? (
                      <button
                        onClick={() => setSelectedProof(apt.payment_proof!)}
                        className="text-xs font-bold uppercase px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200 shadow-sm"
                        title="Ver comprobante de transferencia"
                      >
                        Transf. 📸
                      </button>
                    ) : (
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${apt.payment_method === 'cash' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                        {apt.payment_method === 'cash' ? 'Efectivo' : 'Transf.'}
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right font-bold">
                    ${apt.price.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {weeklyAppointments.length === 0 && (
          <div className="p-12 text-center text-[#8E9299]">
            No hay ventas registradas en esta semana.
          </div>
        )}
      </div>

      {/* Detail of Loans */}
      {weeklyLoans.length > 0 && (
        <div className="bg-white rounded-[32px] shadow-sm border border-[#f0f0f0] overflow-hidden">
          <div className="px-8 py-6 border-b border-[#f0f0f0] flex items-center justify-between">
            <h3 className="text-xl font-serif font-bold text-red-600">Detalle de Préstamos (Salidas)</h3>
            <Wallet className="text-red-500" size={20} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-red-50 text-[#8E9299] text-xs font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">Fecha</th>
                  <th className="px-8 py-4">Trabajadora</th>
                  <th className="px-8 py-4">Motivo</th>
                  <th className="px-8 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {weeklyLoans.map(loan => (
                  <tr key={loan.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-8 py-5 text-sm">{loan.date}</td>
                    <td className="px-8 py-5 font-bold">{loan.worker_name}</td>
                    <td className="px-8 py-5 text-sm italic">{loan.observation}</td>
                    <td className="px-8 py-5 text-right text-red-600 font-bold">
                      -${loan.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center mb-4 text-white">
              <h3 className="font-serif font-bold text-xl">Comprobante de Pago</h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="hover:bg-white/20 rounded-full p-2 transition-colors focus:ring-2 focus:ring-white/50"
              >
                <X size={24} />
              </button>
            </div>
            <img
              src={selectedProof}
              alt="Comprobante"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl bg-[#fdfaf6]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
