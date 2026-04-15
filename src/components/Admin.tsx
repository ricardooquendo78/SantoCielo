import { useState, useEffect } from 'react';
import { WorkerStats } from '../types';
import { TrendingUp, Users, Sparkles, PieChart, Wallet, Calendar, X, Filter, Trash2, ChevronRight, ArrowLeft, DollarSign } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachWeekOfInterval, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import LoadingSpinner from './LoadingSpinner';

interface AdminProps {
  token: string;
}

export default function Admin({ token }: AdminProps) {
  const [stats, setStats] = useState<WorkerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerStats | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [showDayBreakdown, setShowDayBreakdown] = useState(false);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<string | null>(null);
  const [showMonthDetail, setShowMonthDetail] = useState(false);

  // Default to current week
  const now = new Date();
  const [startDate, setStartDate] = useState(format(startOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(now, { weekStartsOn: 0 }), 'yyyy-MM-dd'));

  useEffect(() => {
    fetch(`/api/admin/stats?startDate=${startDate}&endDate=${endDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  }, [token, startDate, endDate]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/monthly-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchDetailedData = async () => {
    try {
      const res = await fetch('/api/admin/financials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAllAppointments(data.appointments);
      setAllLoans(data.loans);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDetailedData();
  }, [token]);

  const fetchStats = () => {
    setLoading(true);
    fetch(`/api/admin/stats?startDate=${startDate}&endDate=${endDate}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('¿Estás segura de eliminar permanentemente esta venta?')) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDetailedData();
        fetchStats();
      } else {
        alert('Error al eliminar');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalRevenue = stats.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);
  const totalSpaShare = totalRevenue * 0.5;
  const totalLoans = stats.reduce((sum, s) => sum + Number(s.total_loans || 0), 0);

  if (loading) return <LoadingSpinner message="Cargando panel de control..." />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#C16991]">Administración</h2>
          <div className="flex items-center gap-2 text-[#8E9299]">
            <Filter size={14} className="text-[#C16991]" />
            <p>Rendimiento Semanal</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
            <div className="bg-rose-50 text-[#C16991] px-4 py-2 rounded-2xl text-xs font-bold border border-[#C16991]/10">
              Semana: {format(parseISO(startDate), 'd MMM')} - {format(parseISO(endDate), 'd MMM, yyyy', { locale: es })}
            </div>
            <button
              onClick={() => { setShowHistory(true); fetchHistory(); }}
              className="bg-white text-[#C16991] border border-[#C16991] font-bold py-2 px-6 rounded-2xl flex items-center gap-2 hover:bg-purple-50 transition-colors shadow-sm h-[52px]"
            >
              <Calendar size={18} /> Ver Historial Mensual
            </button>
          </div>
          <button
            onClick={() => setShowWeeklySummary(true)}
            className="bg-[#C16991] text-white font-bold py-2 px-6 rounded-2xl flex items-center gap-2 hover:bg-[#A14971] transition-all shadow-md shadow-[#C16991]/20 h-[52px] w-full sm:w-auto mt-2"
          >
            <TrendingUp size={18} /> Resumen semanal
          </button>
        </div>
      </div>


      {/* Workers Table */}
      <div className="bg-white rounded-[32px] shadow-sm border border-[#f0f0f0] overflow-hidden">
        <div className="px-8 py-6 border-b border-[#f0f0f0] flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold">Rendimiento por Trabajadora</h3>
          <PieChart className="text-[#8E9299]" size={20} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#fdfaf6] text-[#8E9299] text-xs font-bold uppercase tracking-widest">
                <th className="px-8 py-4">Nombre</th>
                <th className="px-8 py-4">Servicios</th>
                <th className="px-8 py-4">Total Bruto</th>
                <th className="px-8 py-4 text-purple-600 text-center">Préstamos</th>
                <th className="px-8 py-4 text-[#C16991]">A Pagar (Neto)</th>
                <th className="px-8 py-4">Ganancia Spa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {stats.map(worker => (
                <tr 
                  key={worker.id} 
                  onClick={() => { setSelectedWorker(worker); setShowDaySelector(true); }}
                  className="hover:bg-rose-50 transition-colors cursor-pointer group"
                >
                  <td className="px-8 py-5 font-bold text-[#4a4a4a] group-hover:text-[#C16991]">
                    <div className="flex items-center gap-2">
                      {worker.name}
                      {worker.active === false && (
                        <span className="text-[10px] bg-rose-50 text-[#C16991] px-2 py-0.5 rounded-lg border border-[#C16991]/10 uppercase font-bold tracking-wider">
                          Inactiva
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">{worker.total_services}</td>
                  <td className="px-8 py-5 font-medium">${worker.total_revenue.toLocaleString()}</td>
                  <td className="px-8 py-5 text-purple-600 font-bold text-center">
                    {worker.total_loans > 0 ? `-$${worker.total_loans.toLocaleString()}` : '$0'}
                  </td>
                  <td className="px-8 py-5 text-[#C16991] font-bold">
                    ${worker.net_worker_share.toLocaleString()}
                  </td>
                  <td className="px-8 py-5 text-[#8E9299] font-bold">${worker.spa_share.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {stats.length === 0 && (
          <div className="p-12 text-center text-[#8E9299]">
            No hay datos de trabajadoras registrados.
          </div>
        )}
      </div>

      {/* Day Selector Modal */}
      {showDaySelector && selectedWorker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fdfaf6]">
              <div>
                <h3 className="text-xl font-serif font-bold">Días de la Semana</h3>
                <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest mt-1">{selectedWorker.name}</p>
              </div>
              <button
                onClick={() => setShowDaySelector(false)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
              >
                <X size={24} className="text-[#8E9299]" />
              </button>
            </div>
            <div className="p-6 grid gap-2">
              {eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map(day => (
                <button
                  key={day.toISOString()}
                  onClick={() => { setSelectedDay(day); setShowDaySelector(false); setShowDayBreakdown(true); }}
                  className="w-full p-4 rounded-2xl border border-[#f0f0f0] flex justify-between items-center hover:bg-rose-50 hover:border-[#C16991] transition-all group"
                >
                  <span className="font-bold capitalize text-[#4a4a4a] group-hover:text-[#C16991]">
                    {format(day, 'EEEE dd', { locale: es })}
                  </span>
                  <div className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-lg uppercase group-hover:bg-[#C16991]/10 group-hover:text-[#C16991]">
                    Ver detalle
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Day Breakdown Modal */}
      {showDayBreakdown && selectedWorker && selectedDay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] flex items-center justify-center p-6">
          <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fdfaf6]">
              <div>
                <h3 className="text-2xl font-serif font-bold">Rendimiento Diario</h3>
                <p className="text-[#C16991] font-bold capitalize mt-1">
                  {selectedWorker.name} • {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
                </p>
              </div>
              <button
                onClick={() => setShowDayBreakdown(false)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50"
              >
                <X size={24} className="text-[#8E9299]" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              {(() => {
                const dayStr = format(selectedDay, 'yyyy-MM-dd');
                const dayAppointments = allAppointments.filter(a => 
                  (typeof a.worker_id === 'object' ? (a.worker_id.id || a.worker_id._id) : a.worker_id) === String(selectedWorker.id) && 
                  a.date === dayStr
                );
                const dayLoans = allLoans.filter(l => 
                  (typeof l.worker_id === 'object' ? (l.worker_id.id || l.worker_id._id) : l.worker_id) === String(selectedWorker.id) && 
                  l.date.startsWith(dayStr)
                );

                const totalRevenue = dayAppointments.reduce((sum, a) => sum + a.price, 0);
                const workerShare = totalRevenue * 0.5;
                const totalLoans = dayLoans.reduce((sum, l) => sum + l.amount, 0);
                const netPay = workerShare - totalLoans;

                if (dayAppointments.length === 0 && dayLoans.length === 0) {
                  return <div className="py-20 text-center text-[#8E9299] font-bold">No hubo actividad este día</div>;
                }

                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#fdfaf6] p-4 rounded-3xl border border-[#f0f0f0]">
                        <p className="text-[10px] font-bold text-[#8E9299] uppercase mb-1">Bruto del Día</p>
                        <p className="text-xl font-bold text-[#4a4a4a]">${totalRevenue.toLocaleString()}</p>
                      </div>
                      <div className="bg-[#C16991]/5 p-4 rounded-3xl border border-[#C16991]/10">
                        <p className="text-[10px] font-bold text-[#C16991] uppercase mb-1">Gana {selectedWorker.name.split(' ')[0]} (50%)</p>
                        <p className="text-xl font-bold text-[#C16991]">${workerShare.toLocaleString()}</p>
                      </div>
                    </div>

                    {dayAppointments.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-[#8E9299] uppercase tracking-widest pl-2">Servicios Realizados</h4>
                        <div className="grid gap-2">
                          {dayAppointments.map((apt, idx) => (
                            <div key={idx} className="bg-white border border-[#f0f0f0] p-4 rounded-2xl flex justify-between items-center group/item">
                              <div>
                                <p className="font-bold text-[#4a4a4a] text-sm">{apt.service_name}</p>
                                <p className="text-[10px] text-[#8E9299] mt-0.5">{apt.time}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-bold text-[#C16991]">${apt.price.toLocaleString()}</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAppointment(apt.id || apt._id);
                                  }}
                                  className="w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover/item:opacity-100"
                                  title="Eliminar permanentemente"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {dayLoans.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-rose-500 uppercase tracking-widest pl-2">Préstamos / Adelantos</h4>
                        <div className="grid gap-2">
                          {dayLoans.map((loan, idx) => (
                            <div key={idx} className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex justify-between items-center">
                              <div>
                                <p className="font-bold text-rose-700 text-sm">{loan.observation || 'Sin observación'}</p>
                                <p className="text-[10px] text-rose-400 mt-0.5">{loan.date.split(' ')[1]}</p>
                              </div>
                              <p className="font-bold text-rose-700">-${loan.amount.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
                      <div className="bg-[#C16991] rounded-3xl p-6 text-white text-center shadow-lg shadow-[#C16991]/20">
                        <p className="text-xs font-bold uppercase opacity-80 mb-1">Neto a recibir por {selectedWorker.name.split(' ')[0]}</p>
                        <p className="text-3xl font-serif font-bold">${netPay.toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Monthly History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fdfaf6]">
              <div>
                <h3 className="text-2xl font-serif font-bold">Historial de Meses</h3>
                <p className="text-[#8E9299] text-sm">Resumen de ingresos y pagos pasados</p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 text-[#8E9299]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="py-10 text-center text-[#8E9299]">Cargando historial...</div>
              ) : history.length === 0 ? (
                <div className="py-10 text-center text-[#8E9299]">No hay datos históricos aún.</div>
              ) : (
                <div className="space-y-4">
                  {history.map(item => (
                    <div 
                      key={item.month} 
                      onClick={() => { setSelectedMonthDetail(item.month); setShowMonthDetail(true); }}
                      className="bg-[#fdfaf6] rounded-2xl p-6 border border-[#f0f0f0] cursor-pointer hover:border-[#C16991] hover:bg-rose-50/30 transition-all group"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-bold capitalize group-hover:text-[#C16991]">
                            {format(parseISO(item.month + '-01'), 'MMMM yyyy', { locale: es })}
                          </h4>
                          <ChevronRight size={18} className="text-[#8E9299] group-hover:text-[#C16991] group-hover:translate-x-1 transition-all" />
                        </div>
                        {item.month === format(now, 'yyyy-MM') ? (
                          <div className="text-xs font-bold bg-purple-100 text-purple-600 px-3 py-1 rounded-full border border-purple-200">
                            EN CURSO
                          </div>
                        ) : (
                          <div className="text-xs font-bold bg-[#C16991] text-white px-3 py-1 rounded-full">
                            CERRADO
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-[#8E9299] uppercase">Ingresos</p>
                          <p className="text-sm font-bold text-[#4a4a4a]">${item.gross_revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#8E9299] uppercase">Spa (50%)</p>
                          <p className="text-sm font-bold text-green-600">${item.spa_profit.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#8E9299] uppercase">Pagos Netos</p>
                          <p className="text-sm font-bold text-purple-600">${item.net_worker_pay.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#8E9299] uppercase">Préstamos</p>
                          <p className="text-sm font-bold text-red-500">-${item.total_loans.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-8 border-t border-[#f0f0f0] bg-gray-50 text-center">
              <p className="text-xs text-[#8E9299]">
                Los datos históricos se basan en el total acumulado de cada mes calendario.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Summary Modal */}
      {showWeeklySummary && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fdfaf6]">
              <h3 className="text-2xl font-serif font-bold">Resumen Semanal</h3>
              <button
                onClick={() => setShowWeeklySummary(false)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 text-[#8E9299]"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f0f0f0]">
                <div className="w-10 h-10 bg-rose-50 text-[#C16991] rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp size={20} />
                </div>
                <p className="text-[#8E9299] text-[10px] font-bold uppercase tracking-widest mb-1">Total Ingresos</p>
                <h3 className="text-lg font-bold truncate" title={totalRevenue.toLocaleString()}>${totalRevenue.toLocaleString()}</h3>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f0f0f0]">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                  <Sparkles size={20} />
                </div>
                <p className="text-[#8E9299] text-[10px] font-bold uppercase tracking-widest mb-1">Ganancia Spa (50%)</p>
                <h3 className="text-lg font-bold truncate" title={totalSpaShare.toLocaleString()}>${totalSpaShare.toLocaleString()}</h3>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f0f0f0]">
                <div className="w-10 h-10 bg-rose-50 text-[#C16991] rounded-xl flex items-center justify-center mb-3">
                  <Wallet size={20} />
                </div>
                <p className="text-[#8E9299] text-[10px] font-bold uppercase tracking-widest mb-1">Total Préstamos</p>
                <h3 className="text-lg font-bold truncate" title={totalLoans.toLocaleString()}>${totalLoans.toLocaleString()}</h3>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#f0f0f0]">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                  <Users size={20} />
                </div>
                <p className="text-[#8E9299] text-[10px] font-bold uppercase tracking-widest mb-1">Trabajadoras</p>
                <h3 className="text-lg font-bold">{stats.length}</h3>
              </div>
            </div>

            <div className="p-8 bg-rose-50/30 border-t border-[#f0f0f0] text-center">
              <p className="text-sm font-medium text-[#C16991]">
                Cálculos basados en el periodo del {format(parseISO(startDate), 'd')} al {format(parseISO(endDate), 'd')} de {format(parseISO(endDate), 'MMMM', { locale: es })}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Month detail (Weekly breakdown) Modal */}
      {showMonthDetail && selectedMonthDetail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-[#f0f0f0] flex justify-between items-center bg-[#fdfaf6]">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowMonthDetail(false)}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 text-[#C16991] transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="text-2xl font-serif font-bold capitalize">
                    {format(parseISO(selectedMonthDetail + '-01'), 'MMMM yyyy', { locale: es })}
                  </h3>
                  <p className="text-[#8E9299] text-sm">Resumen Detallado por Semanas</p>
                </div>
              </div>
              <button
                onClick={() => { setShowMonthDetail(false); setShowHistory(false); }}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 text-[#8E9299]"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              {(() => {
                const monthDate = parseISO(selectedMonthDetail + '-01');
                const monthStart = startOfMonth(monthDate);
                const monthEnd = endOfMonth(monthDate);

                // Find all weeks that belong to this month
                const weeksStarts = eachWeekOfInterval({
                  start: monthStart,
                  end: monthEnd
                }, { weekStartsOn: 0 });

                const weeklyData = weeksStarts.map(weekStartVal => {
                  const weekEndVal = endOfWeek(weekStartVal, { weekStartsOn: 0 });
                  
                  const weekApts = allAppointments.filter(apt => {
                    const aptDate = parseISO(apt.date);
                    return isWithinInterval(aptDate, { start: weekStartVal, end: weekEndVal });
                  });

                  const weekLoans = allLoans.filter(l => {
                    const lDate = parseISO(l.date.split(' ')[0]);
                    return isWithinInterval(lDate, { start: weekStartVal, end: weekEndVal });
                  });

                  const gross = weekApts.reduce((sum, a) => sum + a.price, 0);
                  const loans = weekLoans.reduce((sum, l) => sum + l.amount, 0);
                  const workersShare = gross * 0.5;
                  
                  return {
                    start: weekStartVal,
                    end: weekEndVal,
                    count: weekApts.length,
                    gross,
                    loans,
                    spaProfit: gross * 0.5,
                    netPay: workersShare - loans
                  };
                });

                return (
                  <div className="grid gap-4">
                    {weeklyData.map((week, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setStartDate(format(week.start, 'yyyy-MM-dd'));
                          setEndDate(format(week.end, 'yyyy-MM-dd'));
                          setShowMonthDetail(false);
                          setShowHistory(false);
                          fetchStats();
                        }}
                        className="bg-white border border-[#f0f0f0] rounded-2xl p-6 hover:border-[#C16991] hover:bg-rose-50/20 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[#C16991] font-bold text-sm">Semana {idx + 1}</p>
                            <p className="text-[#8E9299] text-xs">
                              {format(week.start, 'd MMM')} al {format(week.end, 'd MMM, yyyy', { locale: es })}
                            </p>
                          </div>
                          <div className="bg-[#fdfaf6] px-3 py-1 rounded-full text-[10px] font-bold text-[#8E9299] border border-[#f0f0f0] group-hover:bg-[#C16991]/10 group-hover:text-[#C16991] group-hover:border-[#C16991]/20 transition-colors">
                            VER DETALLE
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-[#8E9299] uppercase flex items-center gap-1">
                              <DollarSign size={10} /> Ingresos
                            </p>
                            <p className="font-bold text-[#4a4a4a] text-sm">${week.gross.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-green-600 uppercase flex items-center gap-1">
                              <Sparkles size={10} /> Ganancia (50%)
                            </p>
                            <p className="font-bold text-green-600 text-sm">${week.spaProfit.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-purple-600 uppercase flex items-center gap-1">
                              <Users size={10} /> Servicios
                            </p>
                            <p className="font-bold text-purple-600 text-sm">{week.count}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                              <Wallet size={10} /> Préstamos
                            </p>
                            <p className="font-bold text-red-500 text-sm">-${week.loans.toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[#8E9299] uppercase">Pago Neto Trabajadoras:</span>
                          <span className="text-[#C16991] font-bold">${week.netPay.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-[#f0f0f0] text-center">
              <p className="text-xs text-[#8E9299]">
                Haz clic en una semana para cargar el resumen detallado en el panel principal.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
