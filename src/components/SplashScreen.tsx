import { useState, useEffect } from 'react';
import muraLogo from '../assets/mura_logo.jpg';

interface SplashScreenProps {
  isLoading: boolean;
  onFinish?: () => void;
}

export function SplashScreen({ isLoading, onFinish }: SplashScreenProps) {
  const [shouldRender, setShouldRender] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Inicia a animação de saída (scale down + fade out)
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        if (onFinish) onFinish();
      }, 650); // Duração sincronizada da animação (650ms)
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setIsFadingOut(false);
    }
  }, [isLoading, onFinish]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070709] transition-all duration-700 ease-out select-none pointer-events-none ${
        isFadingOut ? 'opacity-0 scale-105 backdrop-blur-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Luzes sutis de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

      <div
        className={`flex flex-col items-center gap-5 transition-all duration-700 ease-out transform-gpu ${
          isFadingOut ? 'scale-90 opacity-0 -translate-y-4' : 'scale-100 opacity-100 translate-y-0'
        }`}
      >
        {/* Container da Logo com Efeito de Brilho & Borda Dourada */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl blur-md opacity-40 animate-pulse" />
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-black flex items-center justify-center">
            <img
              src={muraLogo}
              alt="Mura Manager Logo"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Título e Subtítulo do Aplicativo */}
        <div className="text-center space-y-1.5 px-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase font-serif drop-shadow-md">
            MURA <span className="text-amber-400">MANAGER</span>
          </h1>
          <p className="text-xs text-amber-200/70 font-semibold tracking-widest uppercase">
            Gestão Inteligente de Criatórios
          </p>
        </div>

        {/* Barra de Progresso/Indicador Suave */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4 relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite] w-full" />
        </div>
      </div>
    </div>
  );
}
