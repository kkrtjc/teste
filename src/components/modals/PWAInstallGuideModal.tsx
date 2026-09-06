import { useState, useEffect } from 'react';
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
  Compass, 
  MoreVertical, 
  DownloadCloud
} from 'lucide-react';

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
  // Detecta se é iOS para abrir na aba certa por padrão
  const isIOSDevice = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const [activeTab, setActiveTab] = useState<'ios' | 'android'>(() => {
    if (defaultTab) return defaultTab;
    return isIOSDevice() ? 'ios' : 'ios'; // iPhone como padrão conforme pedido do usuário
  });

  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open-lock');
    } else {
      document.body.classList.remove('modal-open-lock');
    }
    return () => {
      document.body.classList.remove('modal-open-lock');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0f0f14] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border-b border-white/5 flex items-start justify-between">
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
                  Tela Inicial
                </span>
              </div>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Acesse direto pelo celular em tela cheia e sem precisar logar toda vez
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Seletor de Plataforma (iOS vs Android) */}
        <div className="p-4 sm:p-5 border-b border-white/5 bg-[#0a0a0e]">
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'ios'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Apple size={16} />
              <span>iPhone / iPad (iOS)</span>
            </button>

            <button
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition-all ${
                activeTab === 'android'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone size={16} />
              <span>Android (Chrome)</span>
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll Suave */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-sm flex-1 custom-scrollbar">
          {activeTab === 'ios' ? (
            <div className="space-y-4">
              {/* Alerta importante sobre o Safari */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3">
                <Compass className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-300">Atenção no iPhone:</p>
                  <p className="text-zinc-300 mt-0.5">
                    O sistema da Apple (iOS) só permite colocar o ícone na tela inicial usando o navegador nativo <strong className="text-white font-bold">Safari</strong>. Se estiver em outro navegador, copie o link abaixo e abra no Safari.
                  </p>
                </div>
              </div>

              {/* Passo a Passo Ilustrado iOS */}
              <div className="space-y-3">
                {/* Passo 1 */}
                <div className="flex items-start gap-3.5 p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Toque no botão Compartilhar
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-amber-400 border border-white/15">
                        <Share size={13} />
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      Na barra inferior do seu navegador Safari, clique no ícone de quadrado com uma seta para cima.
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex items-start gap-3.5 p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Escolha "Adicionar à Tela de Início"
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-amber-400 border border-white/15">
                        <PlusSquare size={13} />
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      Role a lista de opções do menu para baixo até encontrar a opção com ícone de quadrado com o sinal de mais (+).
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex items-start gap-3.5 p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-xs sm:text-sm">
                      Confirme tocando em <span className="text-amber-400 font-extrabold">"Adicionar"</span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      No canto superior direito da tela do iPhone, toque em "Adicionar". O ícone oficial do Mura Manager será criado na sua tela inicial!
                    </p>
                  </div>
                </div>
              </div>

              {/* Vantagens */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-200">
                  Ao abrir pelo ícone, o app roda em <strong>tela cheia</strong>, <strong>sem barras do navegador</strong> e mantém seu criatório sempre conectado.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Passo a Passo Ilustrado Android */}
              <div className="space-y-3">
                {/* Passo 1 */}
                <div className="flex items-start gap-3.5 p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Abra o Menu do Chrome
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-amber-400 border border-white/15">
                        <MoreVertical size={13} />
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      Toque nos 3 pontinhos verticais no canto superior direito do navegador Google Chrome.
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex items-start gap-3.5 p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                      Toque em "Instalar Aplicativo"
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-amber-400 border border-white/15">
                        <DownloadCloud size={13} />
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">
                      Também pode aparecer com o nome "Adicionar à tela inicial".
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex items-start gap-3.5 p-3.5 bg-white/5 border border-white/5 rounded-2xl hover:border-amber-500/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-xs sm:text-sm">
                      Confirme a Instalação
                    </p>
                    <p className="text-xs text-zinc-400">
                      Toque em "Instalar". O aplicativo será instalado com carregamento instantâneo e offline.
                    </p>
                  </div>
                </div>
              </div>

              {/* Vantagens */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-200">
                  O app salva os dados do seu criatório localmente no celular para você consultar mesmo sem sinal de internet.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-4 sm:p-5 bg-[#0a0a0e] border-t border-white/5 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={handleCopyUrl}
            className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {copiedLink ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link para o Safari'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
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
