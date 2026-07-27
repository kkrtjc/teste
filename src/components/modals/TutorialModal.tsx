import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ChevronLeft, ChevronRight, LayoutDashboard, Bird, 
  Settings, HelpCircle, Check, Layers, Egg
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
      title: "Introdução ao Mura Manager",
      icon: HelpCircle,
      gradient: "from-amber-400 to-orange-500",
      route: "/",
      selector: null,
      mobileSelector: null,
      content: "Este guia rápido apresentará as principais ferramentas da plataforma. Aprenda a gerenciar seu plantel de aves, monitorar lotes de postura e engorda, registrar produções diárias de ovos e manter seus dados sincronizados e seguros."
    },
    {
      title: "Painel de Controle (Dashboard)",
      icon: LayoutDashboard,
      gradient: "from-blue-400 to-indigo-500",
      route: "/",
      selector: "#search-bar-container",
      mobileSelector: "#search-bar-container",
      content: "Acompanhe métricas consolidadas do plantel (aves registradas, gênero e raças). Clique em qualquer indicador para abrir listagens rápidas filtradas. Use a barra de pesquisa para localizar instantaneamente aves ou baias."
    },
    {
      title: "Gestão do Plantel",
      icon: Bird,
      gradient: "from-green-400 to-emerald-500",
      route: "/birds",
      selector: "#nav-link-birds",
      mobileSelector: "#mobile-nav-link-birds",
      content: "Cadastre e catalogue suas aves e raças. Cada ficha individual suporta informações detalhadas como número de anilha, sexo, peso, baia atual e galeria com até 10 fotos para acompanhamento evolutivo."
    },
    {
      title: "Lotes de Criação",
      icon: Layers,
      gradient: "from-purple-400 to-pink-500",
      route: "/lots",
      selector: "#nav-link-lots",
      mobileSelector: "#mobile-nav-link-lots",
      content: "Gerencie de forma segmentada seus lotes de Postura, Engorda, Pintinhos e aves em Crescimento. Acompanhe a evolução de peso, controle a quantidade de aves e filtre-as por baia."
    },
    {
      title: "Produção de Ovos",
      icon: Egg,
      gradient: "from-yellow-400 to-amber-500",
      route: "/eggs",
      selector: "#nav-link-eggs",
      mobileSelector: "#mobile-nav-link-eggs",
      content: "Monitore a produtividade dos lotes de postura. Registre coletas diárias de ovos, lance a quantidade de ovos vendidos ou perdidos, acompanhe o preço médio de venda e analise o faturamento e lucros através de painéis estatísticos intuitivos."
    },
    {
      title: "Configurações & Backup",
      icon: Settings,
      gradient: "from-stone-400 to-slate-500",
      route: "/settings",
      selector: "#nav-link-settings",
      mobileSelector: "#header-profile-button",
      content: "Personalize os dados de perfil do criatório. Nesta aba, você também pode exportar backups completos em formato JSON ou importar arquivos salvos anteriormente para evitar qualquer perda de informações."
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


  const getCardPositionStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      background: 'linear-gradient(145deg, rgba(28, 28, 35, 0.98) 0%, rgba(18, 18, 24, 0.99) 100%)',
      boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      position: 'fixed',
      zIndex: 10000,
      left: '50%',
    };

    if (!activeElementRect) {
      // Center of the screen
      return {
        ...baseStyle,
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const spotlightCenterY = activeElementRect.top + activeElementRect.height / 2;
    const screenHeight = window.innerHeight;

    if (spotlightCenterY < screenHeight / 2) {
      // Spotlight is in the upper half of the screen -> Place card in the lower half
      if (isMobile) {
        return {
          ...baseStyle,
          bottom: '100px', // above bottom bar and safe area
          transform: 'translateX(-50%)',
        };
      } else {
        return {
          ...baseStyle,
          top: '60%',
          transform: 'translateX(-50%)',
        };
      }
    } else {
      // Spotlight is in the lower half of the screen -> Place card in the upper half
      if (isMobile) {
        return {
          ...baseStyle,
          top: '100px', // below header and safe area
          transform: 'translateX(-50%)',
        };
      } else {
        return {
          ...baseStyle,
          top: '20%',
          transform: 'translateX(-50%)',
        };
      }
    }
  };

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
        <div className="fixed inset-0 z-[9999] bg-black/85 pointer-events-none transition-all duration-300" />
      )}

      {/* ── Floating Tour Card (z-[10000]) ── */}
      <div 
        className="w-[92vw] max-w-md rounded-2xl border border-white/10 flex flex-col bg-theme-surface transition-all duration-300"
        style={getCardPositionStyle()}
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
          <p className="text-sm text-theme-text-muted leading-relaxed font-medium">
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
