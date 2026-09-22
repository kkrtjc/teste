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
      // Inicia a animação cinematográfica de zoom in e dissolução suave ao encerrar
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        if (onFinish) onFinish();
      }, 600); // 600ms sincronizados com as transições de CSS
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setIsFadingOut(false);
    }
  }, [isLoading, onFinish]);

  // Blindagem de segurança: nunca trava o usuário na splash por mais de 15 segundos em caso de perda total de conexão
  useEffect(() => {
    if (!isLoading) return;
    const safetyTimer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setShouldRender(false);
        if (onFinish) onFinish();
      }, 600);
    }, 15000);
    return () => clearTimeout(safetyTimer);
  }, [isLoading, onFinish]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070709] transition-opacity duration-600 ease-out select-none pointer-events-none ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Luzes sutis de fundo com expansão suave no encerramento */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none transition-all duration-600 ease-out ${
          isFadingOut ? 'scale-150 opacity-0' : 'scale-100 opacity-100 animate-pulse'
        }`} 
      />

      {/* Container Central com Animação de Zoom In / Expansão Cinematográfica no Encerramento */}
      <div
        className={`flex flex-col items-center gap-5 transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${
          isFadingOut 
            ? 'scale-125 opacity-0 blur-[2px] -translate-y-2' 
            : 'scale-100 opacity-100 blur-0 translate-y-0'
        }`}
      >
        {/* Container da Logo com Efeito de Brilho & Borda Dourada */}
        <div className="relative">
          <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl blur-md opacity-40 animate-pulse" />
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-black flex items-center justify-center">
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
        <div className={`w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4 relative transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite] w-full" />
        </div>
        <p className={`text-[11px] text-amber-300/80 font-medium tracking-wide transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100 animate-pulse'}`}>
          Carregando informações do criatório...
        </p>
      </div>
    </div>
  );
}
