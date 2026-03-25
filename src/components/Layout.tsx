import React from 'react';
import { User, Role } from '../types';
import { Home, User as UserIcon, Settings, LogOut, Sparkle, Sparkles, LogOut as LogOutIcon, Scissors, BarChart3, Settings as SettingsIcon, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import logo from '../imgs/logoSantoCielo.jpeg';

interface LayoutProps {
  user: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>>;
  currentView: 'home' | 'profile' | 'admin' | 'services' | 'financials' | 'loans';
  setView: (view: 'home' | 'profile' | 'admin' | 'services' | 'financials' | 'loans') => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, setUser, currentView, setView, onLogout, children }: LayoutProps) {
  const handleProfilePictureUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona una imagen válida.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            try {
              const res = await fetch('/api/users/profile-picture', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ profile_picture: dataUrl })
              });
              if (res.ok) {
                const data = await res.json();
                if (setUser) {
                  const updatedUser = { ...user, profile_picture: data.profile_picture };
                  setUser(updatedUser);
                  localStorage.setItem('user', JSON.stringify(updatedUser));
                }
              }
            } catch(error) { console.error(error); }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-[#fdfaf6] text-[#4a4a4a] font-sans overflow-hidden">
      {/* Sidebar / Navigation */}
      <nav className="order-last md:order-first shrink-0 bg-white border-t border-[#e5e5e5] flex items-center md:flex-col md:w-64 md:h-full md:border-t-0 md:border-r md:justify-start md:py-10 z-50 overflow-x-auto scrollbar-hide">
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

      {/* Main Area Wrapper */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-[#e5e5e5] px-6 py-4 flex shrink-0 justify-between items-center shadow-sm z-40">
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
              <label className="w-10 h-10 bg-[#e5e5e5] rounded-full flex items-center justify-center overflow-hidden border border-gray-200 cursor-pointer relative group shrink-0">
                <input type="file" accept="image/*" onChange={handleProfilePictureUpdate} className="hidden" />
                <img src={user.profile_picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt="avatar" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[10px] text-white font-bold text-center leading-tight">Edit</span>
                </div>
              </label>
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

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="p-6 max-w-5xl mx-auto w-full h-full">
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
    </div>
  );
}
