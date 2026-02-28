import React, { useState, useEffect } from 'react';
import { Loan, User } from '../types';
import { Plus, Trash2, Wallet, Calendar, MessageSquare, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
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

    const handleDeleteLoan = async (id: number) => {
        if (!confirm('¿Estás segura de eliminar este registro de préstamo?')) return;

        try {
            const res = await fetch(`/api/loans/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchLoans();
            }
        } catch (err) {
            alert('Error al eliminar el préstamo');
        }
    };

    if (loading) return <div className="py-20 text-center">Cargando préstamos...</div>;

    const totalLoans = loans.reduce((sum, l) => sum + l.amount, 0);

    return (
        <div className="space-y-8">
            {/* Summary Header */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#f0f0f0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-[#4a4a4a]">Préstamos</h2>
                        <p className="text-[#8E9299] text-sm font-medium">Gestiona tus adelantos y préstamos</p>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <p className="text-[#8E9299] text-xs font-bold uppercase tracking-widest mb-1">Total Pedido</p>
                    <p className="text-3xl font-serif font-bold text-[#C16991]">${totalLoans.toLocaleString()}</p>
                </div>
            </div>

            {/* Add Loan Button */}
            <button
                onClick={() => setShowAddModal(true)}
                className="w-full bg-[#C16991] text-white font-bold py-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-[#A14971] transition-all shadow-lg shadow-[#C16991]/20"
            >
                <Plus size={24} /> Registrar Nuevo Préstamo
            </button>

            {/* Loans List */}
            <div className="grid gap-4">
                <h3 className="text-xl font-serif font-bold px-2">Historial de Préstamos</h3>
                {loans.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-[#e5e5e5]">
                        <p className="text-[#8E9299]">No tienes préstamos registrados.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {loans.map(loan => (
                            <div key={loan.id} className="bg-white rounded-3xl p-6 shadow-sm border border-[#f0f0f0] flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-[#fdfaf6] rounded-xl flex items-center justify-center text-[#C16991]">
                                        <DollarSign size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-lg font-bold text-[#4a4a4a]">${loan.amount.toLocaleString()}</p>
                                        {user.role === 'admin' && (
                                            <p className="text-xs font-bold text-gray-500 uppercase">{loan.worker_name}</p>
                                        )}
                                        <div className="flex items-center gap-2 text-[#8E9299] text-sm">
                                            <Calendar size={14} />
                                            <span>{loan.date}</span>
                                        </div>
                                        {loan.observation && (
                                            <div className="flex items-start gap-2 text-gray-600 text-sm mt-2 bg-gray-50 p-3 rounded-xl italic">
                                                <MessageSquare size={14} className="mt-1 flex-shrink-0" />
                                                <span>{loan.observation}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={() => handleDeleteLoan(loan.id)}
                                        className="w-10 h-10 text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Loan Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl">
                        <h3 className="text-2xl font-serif font-bold mb-6">Pedir Préstamo</h3>
                        <form onSubmit={handleAddLoan} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-[#8E9299] uppercase mb-2 px-1">Monto del Préstamo</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C16991]" size={18} />
                                    <input
                                        type="number"
                                        required
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full bg-[#fdfaf6] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#C16991]"
                                        placeholder="0"
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
                                        className="w-full bg-[#fdfaf6] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#C16991] min-h-[100px]"
                                        placeholder="Escribe el motivo..."
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

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
                                    className="flex-1 bg-[#C16991] text-white font-bold py-4 rounded-2xl hover:bg-[#A14971] transition-all shadow-lg shadow-[#C16991]/20"
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
