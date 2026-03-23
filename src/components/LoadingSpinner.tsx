import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ message = 'Cargando...', fullScreen = false }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center animate-in fade-in duration-500 ${fullScreen ? 'h-screen bg-[#fdfaf6]' : 'py-20'}`}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[#C16991]/20 rounded-full blur-xl animate-pulse"></div>
        <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-lg shadow-[#C16991]/10 relative z-10 border border-[#f0f0f0]">
          <Loader2 className="text-[#C16991] animate-spin" size={36} />
          <Sparkles className="text-purple-400 absolute -top-2 -right-2 animate-pulse" size={20} />
        </div>
      </div>
      <h3 className="text-xl font-serif font-bold text-[#4a4a4a] mb-2 tracking-wide">Santo Cielo</h3>
      <p className="text-[#8E9299] text-sm font-medium animate-pulse">{message}</p>
    </div>
  );
}
