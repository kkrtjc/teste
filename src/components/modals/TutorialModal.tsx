import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ChevronLeft, ChevronRight, LayoutDashboard, Bird, 
  Dna, Settings, HelpCircle, Check
} from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';

export function TutorialModal() {
  const { isTutorialOpen, closeTutorial } = useAppContext();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeElementRect, setActiveElementRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Monitor screen size adjustments
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const slides = [
    {
      title: "Bem-vindo ao Mura Manager!",
      icon: HelpCircle,
      gradient: "from-amber-400 to-orange-500",
      route: "/",
      selector: null,
      mobileSelector: null,
      content: "Este é o seu painel de controle premium para gerenciamento de criatórios de aves de elite. Vamos fazer um tour guiado de 2 minutos para você conhecer e dominar cada função sem erro!"
    },
    {
      title: "Dashboard & Busca Rápida 📊",
      icon: LayoutDashboard,
      gradient: "from-blue-400 to-indigo-500",
      route: "/",
      selector: "#search-bar-container",
      mobileSelector: "#search-bar-container",
      content: "Busca Inteligente: Digite o número da anilha ou o nome da ave para ver a ficha dela instantaneamente. Dica: digite o número da baia para ver o resumo completo das aves nela!"
    },
    {
      title: "Aves & Raças (Seu Plantel) 🐔",
      icon: Bird,
      gradient: "from-green-400 to-emerald-500",
      route: "/birds",
      selector: "#nav-link-birds",
      mobileSelector: "#mobile-nav-link-birds",
      content: "Gerenciamento de Plantel: Veja suas aves divididas por raça. Aqui você cadastra aves e pode adicionar até 10 fotos por ave com uma galeria moderna."
    },
    {
      title: "Genética & Cruzamentos 🧬",
      icon: Dna,
      gradient: "from-purple-400 to-pink-500",
      route: "/genetics",
      selector: "#nav-link-genetics",
      mobileSelector: "#mobile-nav-link-genetics",
      content: "Controle de Cruzamentos: Monte casais com 1 macho e até 10 fêmeas, colete ovos mapeados por matriz e acompanhe a contagem de choco automaticamente."
    },
    {
      title: "Configurações & Backups ⚙️",
      icon: Settings,
      gradient: "from-stone-400 to-slate-500",
      route: "/settings",
      selector: "#nav-link-settings",
      mobileSelector: "#header-profile-button",
      content: "Segurança e Cadastro: Personalize o nome e foto do criatório. Dica de ouro: faça backups periódicos nesta página para nunca perder os seus dados!"
    }
  ];

  const current = slides[currentSlide];

  // Route navigation and element spotlight positioning
  useEffect(() => {
    if (!isTutorialOpen) return;

    // Navigate to the correct tab for this tutorial step
    if (current.route) {
      navigate(current.route);
    }

    let attempts = 0;
    const interval = setInterval(() => {
      const targetSelector = isMobile && current.mobileSelector ? current.mobileSelector : current.selector;
      if (!targetSelector) {
        setActiveElementRect(null);
        clearInterval(interval);
        return;
      }

      const el = document.querySelector(targetSelector);
      if (el) {
        setActiveElementRect(el.getBoundingClientRect());
        clearInterval(interval);
      } else {
        attempts++;
        if (attempts > 15) { // Stop after 1.5s
          setActiveElementRect(null);
          clearInterval(interval);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentSlide, isTutorialOpen, navigate, isMobile, current.route, current.selector, current.mobileSelector]);

  // Handle window resizing or orientation adjustments during tutorial
  useEffect(() => {
    if (!isTutorialOpen) return;

    const updateRect = () => {
      const targetSelector = isMobile && current.mobileSelector ? current.mobileSelector : current.selector;
      if (targetSelector) {
        const el = document.querySelector(targetSelector);
        if (el) {
          setActiveElementRect(el.getBoundingClientRect());
        }
      }
    };

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [currentSlide, isTutorialOpen, isMobile, current.selector, current.mobileSelector]);

  if (!isTutorialOpen) return null;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      closeTutorial();
      setCurrentSlide(0);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    closeTutorial();
    setCurrentSlide(0);
  };

  return (
    <>
      {/* ── Screen Blocker Overlay (z-9998) ── */}
      {/* Fully blocks clicks/taps to rest of screen during tutorial */}
      <div className="fixed inset-0 z-[9998] bg-transparent pointer-events-auto cursor-default" />

      {/* ── Spotlight Element Highlight (z-[9999]) ── */}
      {/* Creates a spotlight overlay centered on target element */}
      {activeElementRect ? (
        <div 
          className="fixed z-[9999] border-2 border-theme-primary rounded-xl pointer-events-none transition-all duration-300 shadow-[0_0_0_9999px_rgba(8,8,14,0.85),_0_0_20px_rgba(245,158,11,0.6)]"
          style={{
            left: activeElementRect.left - 4,
            top: activeElementRect.top - 4,
            width: activeElementRect.width + 8,
            height: activeElementRect.height + 8,
          }}
        />
      ) : (
        /* Full overlay fallback when no element targeted */
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm pointer-events-none transition-all duration-300" />
      )}

      {/* ── Floating Tour Card (z-[10000]) ── */}
      <div 
        className="fixed z-[10000] w-[92vw] max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col bg-theme-surface transition-all duration-300 left-1/2 -translate-x-1/2"
        style={{
          bottom: isMobile ? '24px' : '40px',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        {/* Progress indicator */}
        <div className="h-1 w-full bg-theme-border overflow-hidden rounded-t-2xl">
          <div 
            className="h-full bg-gradient-to-r from-theme-primary to-orange-500 transition-all duration-300"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Card Header */}
        <div className="p-5 border-b border-theme-border flex items-center justify-between bg-theme-base/20">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${current.gradient} text-black font-black`}>
              <current.icon size={16} />
            </div>
            <h4 className="font-bold text-white text-sm tracking-tight">{current.title}</h4>
          </div>
          <button 
            onClick={handleSkip} 
            className="text-theme-text-muted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all active:scale-95"
            title="Pular Tutorial"
          >
            <X size={16} />
          </button>
        </div>

        {/* Card Content */}
        <div className="p-5 flex-1 select-none">
          <p className="text-xs text-theme-text-muted leading-relaxed font-medium">
            {current.content}
          </p>
        </div>

        {/* Card Footer controls */}
        <div className="p-4 border-t border-theme-border bg-theme-base/30 flex items-center justify-between gap-4">
          {/* Skip Link */}
          <button
            onClick={handleSkip}
            className="text-[10px] text-theme-text-muted hover:text-white font-bold transition-colors py-1.5 px-2 hover:bg-white/5 rounded-lg uppercase tracking-wider"
          >
            Pular
          </button>

          {/* Dots Indicator */}
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <div 
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${
                  i === currentSlide ? 'bg-theme-primary w-3.5' : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-1.5">
            {currentSlide > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 bg-theme-base border border-theme-border hover:border-theme-primary hover:text-white rounded-lg text-[10px] font-bold text-theme-text-muted flex items-center gap-0.5 transition-all active:scale-95"
              >
                <ChevronLeft size={12} />
                <span>Voltar</span>
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3 py-1.5 bg-theme-primary hover:bg-amber-400 text-black rounded-lg text-[10px] font-black flex items-center gap-0.5 transition-all active:scale-95 shadow-md shadow-theme-primary/10"
            >
              <span>{currentSlide === slides.length - 1 ? 'Concluir' : 'Avançar'}</span>
              {currentSlide === slides.length - 1 ? <Check size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
