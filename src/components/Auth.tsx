import React, { useState } from 'react';
import { User, Role } from '../types';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User, token: string) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('worker');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password } : { email, password, name, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Algo salió mal');

      if (isLogin) {
        onLogin(data.user, data.token);
      } else {
        setIsLogin(true);
        setError('Registro exitoso. Por favor inicia sesión.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-xl shadow-black/5 p-8 md:p-12">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-[#C16991] rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-[#C16991]/20">
            <Sparkles size={32} />
          </div>
          <h2 className="text-3xl font-serif font-bold text-center">Santo Cielo</h2>
          <p className="text-[#8E9299] text-center mt-2">
            {isLogin ? 'Bienvenida de nuevo' : 'Crea tu cuenta de trabajadora'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8E9299] mb-2 px-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f5f5f0] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#C16991] transition-all"
                placeholder="ejemplo@spa.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8E9299] mb-2 px-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E9299]" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f5f5f0] border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#C16991] transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C16991] text-white rounded-2xl py-4 font-bold shadow-lg shadow-[#C16991]/20 hover:bg-[#A14971] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Entrar'}
            {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <p className="text-center mt-8 text-sm text-[#8E9299]">
          Si no tienes cuenta, contacta a la administradora.
        </p>
      </div>
    </div>
  );
}
