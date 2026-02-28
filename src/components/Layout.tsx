import React from 'react';
import { User, Role } from '../types';
import { Home, User as UserIcon, Settings, LogOut, Sparkle, Sparkles, LogOut as LogOutIcon, Scissors, BarChart3, Settings as SettingsIcon, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../imgs/logoSantoCielo.jpeg';

interface LayoutProps {
  user: User;
  currentView: 'home' | 'profile' | 'admin' | 'services' | 'financials' | 'loans';
  setView: (view: 'home' | 'profile' | 'admin' | 'services' | 'financials' | 'loans') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, currentView, setView, onLogout, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#4a4a4a] font-sans">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e5e5e5] flex items-center md:top-0 md:bottom-auto md:flex-col md:w-64 md:h-screen md:border-t-0 md:border-r md:justify-start md:py-10 z-50 overflow-x-auto scrollbar-hide">
        <div className="flex flex-row md:flex-col items-center justify-between md:justify-start w-full min-w-max md:min-w-0 px-2 py-2 md:px-4 md:gap-2">
          <div className="hidden md:flex items-center gap-3 mb-12 px-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm border border-[#f0f0f0]">
              <img src={logo} alt="Santo Cielo Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-serif font-bold tracking-tight text-[#C16991]">Santo Cielo</span>
          </div>

          <button
            onClick={() => setView('home')}
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl md:rounded-full transition-colors ${currentView === 'home' ? 'bg-[#C16991] text-white' : 'hover:bg-[#f0f0f0]'
              }`}
          >
            <Home size={20} />
            <span className="text-xs md:text-sm font-medium">Inicio</span>
          </button>

          <button
            onClick={() => setView('profile')}
            className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl md:rounded-full transition-colors ${currentView === 'profile' ? 'bg-[#C16991] text-white' : 'hover:bg-[#f0f0f0]'
              }`}
          >
            <UserIcon size={20} />
            <span className="text-xs md:text-sm font-medium">
              {user.role === 'admin' ? 'Trabajadoras' : 'Mi Perfil'}
            </span>
          </button>

          {user.role === 'worker' && (
            <button
              onClick={() => setView('loans')}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl md:rounded-full transition-colors ${currentView === 'loans' ? 'bg-[#C16991] text-white' : 'hover:bg-[#f0f0f0]'
                }`}
            >
              <Wallet size={20} />
              <span className="text-xs md:text-sm font-medium">Préstamos</span>
            </button>
          )}

          {user.role === 'admin' && (
            <>
              <button
                onClick={() => setView('services')}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl md:rounded-full transition-colors ${currentView === 'services' ? 'bg-[#C16991] text-white' : 'hover:bg-[#f0f0f0]'
                  }`}
              >
                <Sparkle size={20} />
                <span className="text-xs md:text-sm font-medium">Servicios</span>
              </button>
              <button
                onClick={() => setView('financials')}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl md:rounded-full transition-colors ${currentView === 'financials' ? 'bg-[#C16991] text-white' : 'hover:bg-[#f0f0f0]'
                  }`}
              >
                <BarChart3 size={20} />
                <span className="text-xs md:text-sm font-medium">Finanzas</span>
              </button>
              <button
                onClick={() => setView('admin')}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl md:rounded-full transition-colors ${currentView === 'admin' ? 'bg-[#C16991] text-white' : 'hover:bg-[#f0f0f0]'
                  }`}
              >
                <SettingsIcon size={20} />
                <span className="text-xs md:text-sm font-medium">Admin</span>
              </button>
            </>
          )}

          <div className="md:mt-auto block md:w-full">
            <button
              onClick={onLogout}
              className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl md:rounded-full transition-colors text-red-500 hover:bg-red-50"
            >
              <LogOut size={20} />
              <span className="text-xs md:text-sm font-medium">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-24 md:pb-0 md:pl-64 min-h-screen">
        <header className="bg-white border-b border-[#e5e5e5] px-6 py-4 sticky top-0 z-40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg overflow-hidden border border-[#f0f0f0] md:hidden">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-serif font-bold md:text-2xl">
              {currentView === 'home' && 'Citas de Hoy'}
              {currentView === 'profile' && (user.role === 'admin' ? 'Gestión de Trabajadoras' : 'Mi Panel de Trabajo')}
              {currentView === 'loans' && 'Gestión de Préstamos'}
              {currentView === 'services' && 'Gestión de Servicios'}
              {currentView === 'financials' && 'Resumen Financiero'}
              {currentView === 'admin' && 'Administración'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
              <div className="w-10 h-10 bg-[#e5e5e5] rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all md:hidden"
              title="Cerrar Sesión"
            >
              <LogOutIcon size={22} />
            </button>
          </div>
        </header>

        <div className="p-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
