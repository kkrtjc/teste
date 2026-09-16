import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, MessageCircle, 
  ChevronLeft, ChevronRight, Award, Calendar, 
  Scale, Dna, ArrowUpRight, Loader2,
  Store, ChevronDown, ArrowLeft
} from 'lucide-react';
import { fetchShowcase, type PublicShowcaseData } from '../lib/showcaseShare';

export function PublicBirdShowcase() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicShowcaseData | null>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [selectedVitrineBird, setSelectedVitrineBird] = useState<any | null>(null);
  const [highlightVitrine, setHighlightVitrine] = useState(false);
  const vitrineSectionRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const timerRef = useRef<any>(null);

  const isViewingVitrineBird = Boolean(selectedVitrineBird);
  const activeBird = selectedVitrineBird || data?.bird;

  // Reseta índice de imagens e pausa ao trocar de ave
  useEffect(() => {
    setCurrentImgIndex(0);
    isPausedRef.current = false;
  }, [selectedVitrineBird]);

  const handleSelectVitrineBird = (otherBird: any) => {
    setSelectedVitrineBird(otherBird);
    try {
      window.history.pushState({ vitrineBirdId: otherBird.id }, '');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromVitrineBird = () => {
    if (selectedVitrineBird) {
      setSelectedVitrineBird(null);
      try {
        if (window.history.state?.vitrineBirdId) {
          window.history.back();
        }
      } catch {}
      setTimeout(() => {
        vitrineSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setSelectedVitrineBird(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenVitrine = () => {
    if (vitrineSectionRef.current) {
      vitrineSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      setHighlightVitrine(true);
      setTimeout(() => setHighlightVitrine(false), 2500);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetchShowcase(id);
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.error('Erro ao carregar dados da ave:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [id]);

  const bird = activeBird;
  const images: string[] = bird?.imagens && bird.imagens.length > 0 
    ? (bird.imagens as string[]) 
    : bird?.imagem 
    ? [bird.imagem as string] 
    : [];

  // Carrossel automático de 3 segundos (sem causar re-render ao tocar na tela)
  useEffect(() => {
    if (images.length <= 1) return;

    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setCurrentImgIndex(prev => (prev + 1) % images.length);
      }
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [images.length, selectedVitrineBird]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-zinc-200 font-serif">Carregando Ficha Técnica...</h2>
        <p className="text-xs text-zinc-500 mt-1">Buscando dados autênticos do plantel</p>
      </div>
    );
  }

  if (!bird) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400">
          ✕
        </div>
        <h2 className="text-xl font-bold font-serif">Ficha não encontrada</h2>
        <p className="text-xs text-zinc-400 max-w-sm mt-2 leading-relaxed">
          Esta ficha técnica pode ter sido desativada ou o link expirou.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-2.5 rounded-xl bg-theme-primary text-black font-black text-xs uppercase tracking-wider"
        >
          Conhecer Mura Manager
        </button>
      </div>
    );
  }

  const farm = data?.farmSettings;
  const whatsappNumber = farm?.whatsapp || farm?.phone || '';
  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');

  const handleWhatsappContact = () => {
    if (!cleanWhatsapp || !bird) return;
    const msg = `Olá! Vi a ficha técnica da ave anilha *${bird.anilha}* (${bird.nome || 'Sem nome'}) e gostaria de mais informações.`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanWhatsapp}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleVitrineWhatsappContact = () => {
    if (!cleanWhatsapp || !bird) return;
    const priceText = bird.vitrinePrice ? ` (Valor: ${bird.vitrinePrice})` : '';
    const msg = `Olá! Gostei da ave anilha *${bird.anilha}* (${bird.nome || bird.raca})${priceText} que vi na vitrine do seu criatório e tenho interesse em negociar.`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanWhatsapp}&text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="w-full min-h-screen bg-[#0d0d12] text-zinc-100 flex flex-col items-center pb-36 relative overflow-x-hidden">
      {/* Top Header Bar with Safe Area Top */}
      <header className="w-full max-w-lg bg-[#14141c]/95 backdrop-blur-md border-b border-white/5 sticky top-0 z-50 px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {isViewingVitrineBird && (
            <button
              type="button"
              onClick={handleBackFromVitrineBird}
              className="w-8 h-8 rounded-full bg-[#1e1e2c] hover:bg-[#28283b] border border-white/10 hover:border-amber-500/60 text-zinc-300 hover:text-white shadow-md flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0 group animate-fade-in"
              title="Voltar para a vitrine"
              aria-label="Voltar para a vitrine"
            >
              <ArrowLeft size={16} className="text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-black text-xs shrink-0">
            M
          </div>
          <div className="min-w-0">
            <span className="font-mono text-xs font-black tracking-wider text-amber-400 block truncate">
              {isViewingVitrineBird ? 'VITRINE DO CRIATÓRIO' : 'MURA MANAGER'}
            </span>
            <span className="text-[10px] text-zinc-400 block -mt-0.5 truncate">
              {isViewingVitrineBird ? `Ave: ${bird.anilha}` : 'Certificado Digital'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isViewingVitrineBird ? (
            <button
              type="button"
              onClick={handleBackFromVitrineBird}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold hover:bg-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Store size={13} />
              <span>Voltar à Vitrine</span>
            </button>
          ) : (
            <a
              href="/"
              className="text-[11px] px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold hover:bg-amber-500/25 transition-all shrink-0 ml-2"
            >
              Criar Conta
            </a>
          )}
        </div>
      </header>

      <main className="w-full max-w-lg px-4 py-4 space-y-4">
        {/* Banner Indicativo quando estiver visualizando ave da vitrine */}
        {isViewingVitrineBird && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#161622] to-amber-500/10 border border-amber-500/30 shadow-md animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleBackFromVitrineBird}
                className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                title="Voltar à Vitrine"
              >
                <ArrowLeft size={14} />
              </button>
              <div className="min-w-0">
                <span className="text-xs font-black text-white block truncate">Ave Selecionada da Vitrine</span>
                <span className="text-[10px] text-amber-400 block truncate">Toque na seta para ver as outras aves</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBackFromVitrineBird}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline shrink-0 cursor-pointer pl-2"
            >
              Ver Todas
            </button>
          </div>
        )}

        {/* Criatório Header Info */}
        {farm?.name && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#171722] border border-white/5 shadow-lg gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {farm.logo ? (
                  <img src={farm.logo} alt={farm.name} className="w-full h-full object-cover" />
                ) : (
                  <Award className="text-amber-400" size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white truncate">{farm.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {farm.city && farm.state ? `${farm.city} - ${farm.state}` : 'Criatório Credenciado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold shrink-0">
              <ShieldCheck size={12} />
              <span>Plantel Ativo</span>
            </div>
          </div>
        )}

        {/* Botão em Destaque: Vitrine do Criatório (logo onde o cliente está vendo) */}
        {!isViewingVitrineBird && data?.mode === 'public' && data.vitrineBirds && data.vitrineBirds.length > 0 && (
          <button
            type="button"
            onClick={handleOpenVitrine}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border border-amber-500/40 text-left hover:border-amber-400 active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-amber-500/10 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Store size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">Ver Vitrine do Criatório</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black">
                    {data.vitrineBirds.length} aves disponíveis
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Toque para ver todas as outras aves disponíveis à venda
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 shrink-0 pl-1">
              <span>Abrir</span>
              <ChevronDown size={16} className="animate-bounce" />
            </div>
          </button>
        )}

        {/* Hero Photo Section with 3-Second Automated Carousel & Safe Touch Scrolling */}
        <div 
          className="relative rounded-3xl overflow-hidden bg-black aspect-[4/5] max-h-[58vh] border-2 border-amber-500/30 shadow-2xl group select-none"
          style={{ touchAction: 'pan-y' }}
          onTouchStart={() => { isPausedRef.current = true; }}
          onTouchEnd={() => { isPausedRef.current = false; }}
          onMouseDown={() => { isPausedRef.current = true; }}
          onMouseUp={() => { isPausedRef.current = false; }}
        >
          {/* Progress Bars on top (Instagram Stories Style) */}
          {images.length > 1 && (
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center gap-1.5 pointer-events-none">
              {images.map((_: string, idx: number) => (
                <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-amber-400 transition-all duration-300 ${
                      idx === currentImgIndex 
                        ? 'w-full' 
                        : idx < currentImgIndex 
                        ? 'w-full' 
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Current Photo */}
          {images.length > 0 ? (
            <div className="w-full h-full relative pointer-events-none">
              {/* Blurred background */}
              <div 
                className="absolute inset-0 opacity-40 blur-lg scale-110"
                style={{ backgroundImage: `url(${images[currentImgIndex]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              <img 
                src={images[currentImgIndex]} 
                alt={bird.anilha} 
                className="w-full h-full object-contain relative z-10" 
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
              <span className="text-sm">Sem foto cadastrada</span>
            </div>
          )}

          {/* Touch navigation zones */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImgIndex(prev => (prev - 1 + images.length) % images.length);
                }}
                className="absolute left-0 top-12 bottom-12 w-1/3 z-20 opacity-0 active:opacity-100 flex items-center pl-2"
                style={{ touchAction: 'pan-y' }}
                aria-label="Foto anterior"
              >
                <div className="p-2 rounded-full bg-black/50 text-white"><ChevronLeft size={20} /></div>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImgIndex(prev => (prev + 1) % images.length);
                }}
                className="absolute right-0 top-12 bottom-12 w-1/3 z-20 opacity-0 active:opacity-100 flex items-center justify-end pr-2"
                style={{ touchAction: 'pan-y' }}
                aria-label="Próxima foto"
              >
                <div className="p-2 rounded-full bg-black/50 text-white"><ChevronRight size={20} /></div>
              </button>
            </>
          )}

          {/* Overlay Tag / Status - Protected against collision */}
          <div className="absolute bottom-3 left-3 right-3 z-30 flex items-end justify-between pointer-events-none gap-2">
            <div className="bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl min-w-0 max-w-[65%]">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">Anilha Oficial</span>
              <span className="text-base font-black font-mono text-amber-400 block truncate">{bird.anilha}</span>
            </div>

            {bird.vitrinePrice && (
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-3.5 py-1.5 rounded-xl shadow-lg border border-emerald-400/40 shrink-0 max-w-[35%] text-right">
                <span className="text-[9px] text-emerald-100 uppercase font-black block">Valor</span>
                <span className="text-sm font-black text-white block truncate">{bird.vitrinePrice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Bird Technical Info Card */}
        <div className="p-5 rounded-3xl bg-[#171722] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-white font-serif tracking-tight break-words">
                {bird.nome || `Ave ${bird.anilha}`}
              </h1>
              <p className="text-xs text-amber-400/90 font-bold mt-0.5 truncate">{bird.raca}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap ${
                bird.sexo === 'Macho' 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              }`}>
                {bird.sexo}
              </span>
              {bird.status && (
                <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  {bird.status}
                </span>
              )}
            </div>
          </div>

          {/* Technical Grid Specs */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            {bird.peso && (
              <div className="p-3 bg-[#111118] border border-white/5 rounded-xl flex items-center gap-2.5 min-w-0 overflow-hidden">
                <Scale size={16} className="text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold truncate">Peso Atual</span>
                  <span className="font-bold text-white block truncate">{bird.peso}</span>
                </div>
              </div>
            )}

            {bird.dataNascimento && (
              <div className="p-3 bg-[#111118] border border-white/5 rounded-xl flex items-center gap-2.5 min-w-0 overflow-hidden">
                <Calendar size={16} className="text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold truncate">Nascimento</span>
                  <span className="font-bold text-white block truncate">
                    {new Date(bird.dataNascimento).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            )}

            {!isViewingVitrineBird && data?.pai && (
              <div className="p-3 bg-[#111118] border border-white/5 rounded-xl flex items-center gap-2.5 min-w-0 overflow-hidden">
                <Dna size={16} className="text-blue-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold truncate">Pai</span>
                  <span className="font-bold text-white truncate block font-mono text-[11px]">
                    {data.pai.anilha}
                  </span>
                </div>
              </div>
            )}

            {!isViewingVitrineBird && data?.mae && (
              <div className="p-3 bg-[#111118] border border-white/5 rounded-xl flex items-center gap-2.5 min-w-0 overflow-hidden">
                <Dna size={16} className="text-pink-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold truncate">Mãe</span>
                  <span className="font-bold text-white truncate block font-mono text-[11px]">
                    {data.mae.anilha}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Consanguinidade */}
          {!isViewingVitrineBird && data?.inbreeding !== undefined && data.inbreeding > 0 && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Consanguinidade (Inbreeding F):</span>
              <span className="font-mono font-black text-amber-400">
                {(data.inbreeding * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {/* Vacinas */}
          {bird.vacinas && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                Histórico Sanitário / Vacinas:
              </span>
              <p className="text-xs text-zinc-300 bg-[#111118] p-3 rounded-xl border border-white/5 leading-relaxed break-words">
                {bird.vacinas}
              </p>
            </div>
          )}

          {/* Observações */}
          {bird.observacoes && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                Observações do Criador:
              </span>
              <p className="text-xs text-zinc-300 bg-[#111118] p-3 rounded-xl border border-white/5 leading-relaxed italic break-words">
                "{bird.observacoes}"
              </p>
            </div>
          )}

          {/* Botão de Contato para Ave da Vitrine no corpo da ficha */}
          {isViewingVitrineBird && cleanWhatsapp && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleVitrineWhatsappContact}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer"
              >
                <MessageCircle size={19} className="shrink-0 animate-pulse" />
                <span>Gostei dessa, chamar no WhatsApp</span>
              </button>
            </div>
          )}
        </div>

        {/* Vitrine: Outras Aves Disponíveis deste Criador */}
        {data?.mode === 'public' && data.vitrineBirds && data.vitrineBirds.length > 0 && (
          <div 
            ref={vitrineSectionRef}
            className={`space-y-3 pt-3 scroll-mt-20 rounded-3xl p-3 -mx-3 transition-all duration-700 ${
              highlightVitrine ? 'bg-amber-500/15 ring-2 ring-amber-500/50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white font-serif">
                    {isViewingVitrineBird ? 'Outras Aves desta Vitrine' : 'Vitrine deste Criatório'}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    {isViewingVitrineBird ? 'Toque para ver a ficha completa de outra ave' : 'Aves disponíveis para negociação'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-black">
                {data.vitrineBirds.length} disponíveis
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {data.vitrineBirds
                .filter(otherBird => !isViewingVitrineBird || otherBird.id !== bird.id)
                .map((otherBird) => (
                <div 
                  key={otherBird.id}
                  onClick={() => handleSelectVitrineBird(otherBird)}
                  className="bg-[#171722] border border-white/5 rounded-2xl overflow-hidden shadow-lg p-2.5 space-y-2 cursor-pointer active:scale-95 transition-all hover:border-amber-500/40 group"
                >
                  <div className="aspect-square bg-black rounded-xl overflow-hidden relative">
                    {otherBird.imagem || (otherBird.imagens && otherBird.imagens[0]) ? (
                      <img 
                        src={otherBird.imagem || otherBird.imagens![0]} 
                        alt={otherBird.anilha} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600">
                        Sem foto
                      </div>
                    )}
                    {otherBird.vitrinePrice && (
                      <div className="absolute bottom-1.5 right-1.5 bg-emerald-600/95 text-[10px] font-black text-white px-2 py-0.5 rounded-md shadow">
                        {otherBird.vitrinePrice}
                      </div>
                    )}
                    {otherBird.sexo && (
                      <div className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                        {otherBird.sexo}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-mono text-[11px] font-black text-amber-400 block truncate">
                      {otherBird.anilha}
                    </span>
                    <p className="text-xs font-bold text-white truncate">
                      {otherBird.nome || otherBird.raca}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{otherBird.raca}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viral Banner: Powered by Mura Manager */}
        <div className="mt-8 p-5 rounded-3xl bg-gradient-to-br from-[#1c1a2e] to-[#12121c] border border-amber-500/30 text-center space-y-3 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
            <span>🏆</span>
            <span>Tecnologia Mura Manager</span>
          </div>

          <h3 className="text-base font-black text-white font-serif leading-snug">
            Crie Fichas Técnicas como esta e organize todo o seu Criatório
          </h3>

          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
            Controle árvores genealógicas, consanguinidade, lotes de ovos, vacinas e tenha sua própria vitrine digital.
          </p>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <span>Experimentar Mura Manager Grátis</span>
            <ArrowUpRight size={15} />
          </a>
        </div>
      </main>

      {/* Sticky Bottom Action Bar with Vitrine Button & WhatsApp */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-[#121218]/95 backdrop-blur-lg border-t border-white/10 flex justify-center pb-[max(env(safe-area-inset-bottom,0px),12px)] shadow-[0_-10px_30px_rgba(0,0,0,0.7)]">
        <div className="w-full max-w-lg flex items-center gap-2">
          {isViewingVitrineBird ? (
            <>
              <button
                type="button"
                onClick={handleBackFromVitrineBird}
                className="py-3 px-3.5 rounded-2xl bg-[#1e1e2c] border border-white/10 hover:border-amber-500/50 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 shadow-lg"
                title="Voltar para a vitrine"
                aria-label="Voltar para a vitrine"
              >
                <ArrowLeft size={17} className="text-amber-400" />
                <span className="hidden sm:inline">Vitrine</span>
              </button>

              {cleanWhatsapp && (
                <button
                  onClick={handleVitrineWhatsappContact}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer truncate"
                >
                  <MessageCircle size={19} className="shrink-0 animate-pulse" />
                  <span className="truncate">Gostei dessa, chamar no WhatsApp</span>
                </button>
              )}
            </>
          ) : (
            <>
              {data?.mode === 'public' && data.vitrineBirds && data.vitrineBirds.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenVitrine}
                  className="py-3 px-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-400 font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 shadow-lg shadow-amber-500/10"
                >
                  <Store size={18} />
                  <span>Vitrine ({data.vitrineBirds.length})</span>
                </button>
              )}

              {cleanWhatsapp && (
                <button
                  onClick={handleWhatsappContact}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer truncate"
                >
                  <MessageCircle size={19} className="shrink-0" />
                  <span className="truncate">Negociar no WhatsApp</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
