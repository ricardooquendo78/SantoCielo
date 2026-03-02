import React, { useState, useEffect } from 'react';
import { Loan, User } from '../types';
import { Plus, Trash2, Wallet, Calendar, MessageSquare, DollarSign, History, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface LoansProps {
    user: User;
    token: string;
}

export default function Loans({ user, token }: LoansProps) {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState('');
    const [observation, setObservation] = useState('');
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const fetchLoans = async () => {
        try {
            const res = await fetch('/api/loans', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setLoans(data);
        } catch (err) {
            console.error('Error fetching loans:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans();
    }, [token]);

    const handleAddLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!amount || parseFloat(amount) <= 0) {
            setError('Por favor ingresa un monto válido.');
            return;
        }

        try {
            const res = await fetch('/api/loans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    observation,
                    date: format(new Date(), 'yyyy-MM-dd HH:mm')
                })
            });

            if (res.ok) {
                setAmount('');
                setObservation('');
                setShowAddModal(false);
                fetchLoans();
            } else {
                const data = await res.json();
                setError(data.error || 'Error al registrar préstamo');
            }
        } catch (err) {
            setError('Error al conectar con el servidor');
        }
    };

    const handleDeleteLoan = async (loan: Loan) => {
        if (user.role !== 'admin') {
            const loanDate = new Date(loan.date.replace(' ', 'T'));
            if (differenceInHours(new Date(), loanDate) >= 2) {
                alert('No puedes eliminar un préstamo después de 2 horas de haberlo registrado. Por favor contacta al administrador.');
                return;
            }
        }

        if (!confirm('¿Estás segura de eliminar este registro de préstamo?')) return;

        try {
            const res = await fetch(`/api/loans/${loan.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchLoans();
            } else {
                const data = await res.json();
                alert(data.error || 'Error al eliminar el préstamo');
            }
        } catch (err) {
            alert('Error al conectar con el servidor');
        }
    };

    const now = new Date();
    // Sunday as start of week
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const currentWeekLoans = loans.filter(loan => {
        try {
            // date format is 'yyyy-MM-dd HH:mm'
            const datePart = loan.date.split(' ')[0];
            const loanDate = new Date(datePart.replace(/-/g, '/'));
            return isWithinInterval(loanDate, { start: weekStart, end: weekEnd });
        } catch (e) {
            return false;
        }
    });

    const historicalLoans = loans.filter(loan => {
        try {
            const datePart = loan.date.split(' ')[0];
            const loanDate = new Date(datePart.replace(/-/g, '/'));
            return !isWithinInterval(loanDate, { start: weekStart, end: weekEnd });
        } catch (e) {
            return false;
        }
    });

    if (loading) return <div className="py-20 text-center">Cargando préstamos...</div>;

    const totalCurrentWeek = currentWeekLoans.reduce((sum, l) => sum + l.amount, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Summary Header */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#f0f0f0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-rose-50 text-[#C16991] rounded-2xl flex items-center justify-center">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-[#4a4a4a]">Mis Préstamos</h2>
                        <div className="flex items-center gap-2 text-[#8E9299] text-xs font-medium bg-[#fcf8f3] px-3 py-1 rounded-full mt-1">
                            <Calendar size={12} className="text-[#C16991]" />
                            <span>Semana Actual: {format(weekStart, 'd MMM')} - {format(weekEnd, 'd MMM', { locale: es })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <p className="text-[#8E9299] text-[10px] font-bold uppercase tracking-widest mb-1">Total esta Semana</p>
                    <p className="text-3xl font-serif font-bold text-[#C16991]">${totalCurrentWeek.toLocaleString()}</p>
                </div>
            </div>

            {/* Add Loan Button */}
            <button
                onClick={() => setShowAddModal(true)}
                className="w-full bg-[#C16991] text-white font-bold py-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-[#A14971] transition-all shadow-lg shadow-[#C16991]/20 active:scale-[0.98]"
            >
                <Plus size={24} /> Pedir Adelanto / Préstamo
            </button>

            {/* Current Week Loans List */}
            <div className="grid gap-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-serif font-bold text-[#4a4a4a]">Esta Semana</h3>
                    <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Activo</div>
                </div>

                {currentWeekLoans.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-[#e5e5e5] flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Plus size={32} />
                        </div>
                        <div>
                            <p className="text-[#8E9299] font-medium">No has pedido préstamos esta semana.</p>
                            <p className="text-xs text-gray-400">Tus registros se reinician visualmente cada domingo.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {currentWeekLoans.map(loan => (
                            <div key={loan.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#f0f0f0] flex flex-col sm:flex-row justify-between gap-4 hover:border-[#C16991]/30 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#fdfaf6] rounded-xl flex items-center justify-center text-[#C16991] shadow-sm">
                                        <DollarSign size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl font-bold text-[#4a4a4a]">${loan.amount.toLocaleString()}</p>
                                        <div className="flex items-center gap-2 text-[#8E9299] text-xs font-medium">
                                            <Calendar size={12} />
                                            <span>{loan.date}</span>
                                        </div>
                                        {loan.observation && (
                                            <div className="flex items-start gap-2 text-gray-600 text-sm mt-3 bg-[#fdfaf6] p-4 rounded-2xl italic border border-[#fcf8f3]">
                                                <MessageSquare size={14} className="mt-1 flex-shrink-0 text-[#C16991]" />
                                                <span>{loan.observation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    {(user.role === 'admin' || differenceInHours(new Date(), new Date(loan.date.replace(' ', 'T'))) < 2) ? (
                                        <button
                                            onClick={() => handleDeleteLoan(loan)}
                                            className="w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center transition-all bg-gray-50"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    ) : (
                                        <div className="w-10 h-10 text-gray-300 flex items-center justify-center" title="No se puede eliminar después de 2 horas">
                                            <Lock size={16} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Historical Loans Toggle */}
            {historicalLoans.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl text-[#8E9299] hover:bg-gray-100 transition-colors"
                    >
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <History size={18} />
                            Ver Préstamos Pasados
                        </div>
                        {showHistory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {showHistory && (
                        <div className="mt-4 grid gap-3 animate-in slide-in-from-top-2 duration-300">
                            {historicalLoans.map(loan => (
                                <div key={loan.id} className="bg-white/50 rounded-2xl p-4 border border-[#f0f0f0] flex justify-between items-center opacity-70">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                            <DollarSign size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-600 text-sm">${loan.amount.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">{loan.date.split(' ')[0]}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 italic max-w-[150px] truncate">{loan.observation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add Loan Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6 transition-all">
                    <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-serif font-bold">Pedir Préstamo</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleAddLoan} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-[#8E9299] uppercase mb-2 px-1">Monto del Préstamo</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C16991] font-bold text-xl">$</span>
                                    <input
                                        type="number"
                                        required
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full bg-[#fdfaf6] border-none rounded-2xl py-4 pl-10 pr-4 focus:ring-2 focus:ring-[#C16991] font-bold text-xl"
                                        placeholder="0"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#8E9299] uppercase mb-2 px-1">Observación / Motivo</label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-4 top-4 text-[#8E9299]" size={18} />
                                    <textarea
                                        value={observation}
                                        onChange={e => setObservation(e.target.value)}
                                        className="w-full bg-[#fdfaf6] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#C16991] min-h-[100px] text-sm"
                                        placeholder="¿Para qué necesitas el adelanto?"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-xl border border-red-100 font-bold">{error}</p>}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-[#C16991] text-white font-bold py-4 rounded-2xl hover:bg-[#A14971] transition-all shadow-lg shadow-[#C16991]/20 active:scale-95"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
