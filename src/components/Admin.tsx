import { useState, useEffect } from 'react';
import { WorkerStats } from '../types';
import { TrendingUp, Users, Sparkles, PieChart, Wallet, Calendar, X, Filter } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AdminProps {
  token: string;
}

export default function Admin({ token }: AdminProps) {
  const [stats, setStats] = useState<WorkerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  const totalRevenue = stats.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);
  const totalSpaShare = totalRevenue * 0.5;
  const totalLoans = stats.reduce((sum, s) => sum + Number(s.total_loans || 0), 0);

  if (loading) return <div className="py-20 text-center">Cargando estadísticas...</div>;

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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0]">
          <div className="w-12 h-12 bg-rose-50 text-[#C16991] rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest mb-1">Total Ingresos</p>
          <h3 className="text-2xl font-serif font-bold">${totalRevenue.toLocaleString()}</h3>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0]">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles size={24} />
          </div>
          <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest mb-1">Ganancia Spa (50%)</p>
          <h3 className="text-2xl font-serif font-bold">${totalSpaShare.toLocaleString()}</h3>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0]">
          <div className="w-12 h-12 bg-rose-50 text-[#C16991] rounded-2xl flex items-center justify-center mb-4">
            <Wallet size={24} />
          </div>
          <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest mb-1">Total Préstamos</p>
          <h3 className="text-2xl font-serif font-bold">${totalLoans.toLocaleString()}</h3>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#f0f0f0]">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Users size={24} />
          </div>
          <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest mb-1">Trabajadoras</p>
          <h3 className="text-2xl font-serif font-bold">{stats.length}</h3>
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
                <tr key={worker.id} className="hover:bg-[#fdfaf6] transition-colors">
                  <td className="px-8 py-5 font-bold">{worker.name}</td>
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
                    <div key={item.month} className="bg-[#fdfaf6] rounded-2xl p-6 border border-[#f0f0f0]">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold capitalize">
                          {format(parseISO(item.month + '-01'), 'MMMM yyyy', { locale: es })}
                        </h4>
                        <div className="text-xs font-bold bg-[#C16991] text-white px-3 py-1 rounded-full">
                          CERRADO
                        </div>
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
    </div>
  );
}
