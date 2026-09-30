import { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Smartphone, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Copy, 
  Sparkles, 
  Apple, 
  AlertCircle,
  MessageCircle,
  MoreHorizontal,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ios' | 'android';
}

export function PWAInstallGuideModal({
  isOpen,
  onClose,
  defaultTab
}: PWAInstallGuideModalProps) {
  // Detecção precisa do sistema operacional do aparelho
  const isIOSDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/i.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const isAndroidDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android/i.test(navigator.userAgent);
  };

  const detectedIsIOS = isIOSDevice();
  const detectedIsAndroid = isAndroidDevice();

  const [activeTab, setActiveTab] = useState<'ios' | 'android'>(() => {
    if (defaultTab) return defaultTab;
    if (detectedIsAndroid) return 'android';
    return 'ios';
  });

  const [copiedLink, setCopiedLink] = useState(false);

  useModalScrollLock(isOpen);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Número oficial de suporte WhatsApp (lê env ou fallback)
  const supportPhone = (import.meta.env.VITE_SUPPORT_WHATSAPP || '5514477751630').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(
    'Olá! Estou com dificuldades para instalar o aplicativo Mura Manager no meu celular. Pode me auxiliar passo a passo?'
  )}`;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)] pl-[max(env(safe-area-inset-left),12px)] pr-[max(env(safe-area-inset-right),12px)] bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden touch-none select-none"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="w-full max-w-lg bg-[#0f0f14] border border-amber-500/35 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[calc(100dvh-max(env(safe-area-inset-top),16px)-max(env(safe-area-inset-bottom),16px)-24px)] overscroll-contain animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border-b border-white/5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 flex-shrink-0">
              <div className="w-full h-full bg-[#070709] rounded-[14px] flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Instalar Aplicativo
                </h2>
                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
                  {detectedIsIOS ? 'iPhone Detectado' : detectedIsAndroid ? 'Android Detectado' : 'Celular'}
                </span>
              </div>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Tenha o ícone do Mura Manager na tela do seu celular e acesse em tela cheia!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Seletor de Plataforma (iPhone vs Android) */}
        <div className="p-3 sm:p-4 border-b border-white/5 bg-[#0a0a0e] shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Apple size={16} />
              <span>iPhone / iPad (iOS)</span>
              {detectedIsIOS && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Seu dispositivo" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone size={16} />
              <span>Android</span>
              {detectedIsAndroid && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" title="Seu dispositivo" />
              )}
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll Suave e Isolado */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm flex-1 min-h-0 modal-scrollable-content overscroll-contain touch-pan-y custom-scrollbar">
          {activeTab === 'ios' ? (
            <div className="space-y-4">
              
              {/* Box de Instrução Principal no iPhone */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/35 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="font-black text-amber-300 text-sm uppercase tracking-wide">
                    Como Instalar no iPhone (Passo a Passo)
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Passo 1 */}
                  <div className="flex items-start gap-3 p-3 bg-black/50 rounded-xl border border-white/5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-md">
                      1
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Toque nos</span>
                        <strong className="text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <MoreHorizontal size={14} /> 3 pontinhos (...)
                        </strong>
                      </p>
                      <p className="text-zinc-300 leading-relaxed">
                        No navegador do seu iPhone, toque no botão dos <strong>3 pontinhos (...)</strong> localizado na barra inferior da tela (ou no topo).
                      </p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-3 p-3 bg-black/50 rounded-xl border border-white/5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-md">
                      2
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Toque em</span>
                        <strong className="text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <Share size={13} /> Compartilhar
                        </strong>
                      </p>
                      <p className="text-zinc-300 leading-relaxed">
                        No menu de opções que se abrir, clique na opção de <strong>Compartilhar</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-3 p-3 bg-black/50 rounded-xl border border-white/5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-md">
                      3
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Toque em</span>
                        <strong className="text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <PlusSquare size={13} /> Adicionar à Tela de Início
                        </strong>
                      </p>
                      <p className="text-zinc-300 leading-relaxed">
                        Procure o botão com o ícone de <strong>(+)</strong> e confirme em <strong>"Adicionar"</strong> no canto superior direito.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD DE DESTAQUE: CASO NÃO ENCONTRE A OPÇÃO */}
              <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400/50 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
                  <AlertCircle size={16} className="text-amber-400 shrink-0" />
                  <span>Caso não encontre essa opção de primeira:</span>
                </div>
                <div className="space-y-2 text-xs text-amber-100/90 leading-relaxed">
                  <div className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-amber-500/20">
                    <span className="font-bold text-amber-400 shrink-0">•</span>
                    <p>
                      Nessa mesma tela de compartilhamento, clique em <strong className="text-white underline">"Ver mais"</strong> e procure por <strong className="text-amber-300">"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-amber-500/20">
                    <span className="font-bold text-amber-400 shrink-0">•</span>
                    <p>
                      Ou role até o final do menu, toque em <strong className="text-white underline inline-flex items-center gap-1"><SlidersHorizontal size={12} /> "Editar Ações..."</strong> e selecione / ative <strong className="text-amber-300">"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Alternativa Safari */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-xs space-y-1">
                <p className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Apple size={14} className="text-amber-400" />
                  <span>Está usando o Safari (Navegador nativo da Apple)?</span>
                </p>
                <p className="text-zinc-400 leading-relaxed">
                  Basta tocar direto no ícone de <strong>Compartilhar (o quadradinho com a seta para cima ⎋)</strong> na barra inferior do Safari e tocar em <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>

              {/* SUPORTE WHATSAPP - CASO NÃO CONSIGA */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-black border-2 border-emerald-500/40 text-center space-y-3 shadow-xl">
                <div>
                  <h4 className="font-black text-white text-xs sm:text-sm flex items-center justify-center gap-1.5">
                    <MessageCircle size={16} className="text-emerald-400" />
                    <span>Caso não consiga, chame nosso assistente!</span>
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Nosso suporte técnico te ajuda em tempo real a colocar o aplicativo no seu iPhone.
                  </p>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle size={18} className="fill-black" />
                  <span>Chamar Assistente no WhatsApp</span>
                  <ExternalLink size={14} />
                </a>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Box de Instrução Principal no Android */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/35 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="font-black text-amber-300 text-sm uppercase tracking-wide">
                    Como Instalar no Android (Passo a Passo)
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Passo 1 */}
                  <div className="flex items-start gap-3 p-3 bg-black/50 rounded-xl border border-white/5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-md">
                      1
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Toque nos</span>
                        <strong className="text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <MoreHorizontal size={14} /> 3 pontinhos (...)
                        </strong>
                      </p>
                      <p className="text-zinc-300 leading-relaxed">
                        No navegador do seu Android (Chrome), toque no ícone dos <strong>3 pontinhos (...)</strong> localizado no canto superior direito da tela (ou na barra inferior se usar o Samsung Internet).
                      </p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-3 p-3 bg-black/50 rounded-xl border border-white/5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-md">
                      2
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Toque em</span>
                        <strong className="text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <Smartphone size={13} /> Instalar aplicativo
                        </strong>
                        <span className="text-zinc-400 font-normal">ou</span>
                        <strong className="text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <PlusSquare size={13} /> Adicionar à tela inicial
                        </strong>
                      </p>
                      <p className="text-zinc-300 leading-relaxed">
                        No menu de opções que se abrir, localize e toque na opção de <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-3 p-3 bg-black/50 rounded-xl border border-white/5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-md">
                      3
                    </div>
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                        <span>Confirme tocando em</span>
                        <strong className="text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <CheckCircle2 size={13} /> Instalar / Adicionar
                        </strong>
                      </p>
                      <p className="text-zinc-300 leading-relaxed">
                        Na janela de confirmação que surgir na tela, confirme em <strong>"Instalar"</strong>. O ícone do Mura Manager será criado na tela inicial do seu aparelho e abrirá em tela cheia!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD DE DESTAQUE: DICAS PARA OUTROS NAVEGADORES */}
              <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-400/50 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
                  <AlertCircle size={16} className="text-amber-400 shrink-0" />
                  <span>Dicas se não encontrar de primeira:</span>
                </div>
                <div className="space-y-2 text-xs text-amber-100/90 leading-relaxed">
                  <div className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-amber-500/20">
                    <span className="font-bold text-amber-400 shrink-0">•</span>
                    <p>
                      <strong>Google Chrome:</strong> Se a opção "Instalar aplicativo" não aparecer, role um pouco o menu para baixo e procure por <strong className="text-amber-300">"Adicionar à tela inicial"</strong> logo abaixo de "Compartilhar".
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-black/40 p-2.5 rounded-xl border border-amber-500/20">
                    <span className="font-bold text-amber-400 shrink-0">•</span>
                    <p>
                      <strong>Samsung Internet:</strong> Toque no menu (três risquinhos ☰ ou ⋯ na barra inferior) &gt; toque em <strong className="text-white underline">"Adicionar página a"</strong> &gt; selecione <strong className="text-amber-300">"Tela inicial"</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* SUPORTE WHATSAPP - CASO NÃO CONSIGA */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/30 to-black border-2 border-emerald-500/40 text-center space-y-3 shadow-xl">
                <div>
                  <h4 className="font-black text-white text-xs sm:text-sm flex items-center justify-center gap-1.5">
                    <MessageCircle size={16} className="text-emerald-400" />
                    <span>Caso não consiga, chame nosso assistente!</span>
                  </h4>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Nosso suporte técnico te ajuda em tempo real a colocar o aplicativo no seu Android.
                  </p>
                </div>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle size={18} className="fill-black" />
                  <span>Chamar Assistente no WhatsApp</span>
                  <ExternalLink size={14} />
                </a>
              </div>

            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 sm:p-5 bg-[#0a0a0e] border-t border-white/5 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            onClick={handleCopyUrl}
            className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            {copiedLink ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link do App'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Entendi, Fechar</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
