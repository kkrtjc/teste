import { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Lock, RefreshCw, AlertTriangle, 
  Smartphone, Monitor, Share2
} from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { getNotificationPermission } from '../../lib/notificationEngine';

interface UnblockNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (perm: NotificationPermission | 'unsupported') => void;
}

export function UnblockNotificationModal({
  isOpen,
  onClose,
  onStatusUpdated
}: UnblockNotificationModalProps) {
  useModalScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc'>('android');
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRecheck = () => {
    setChecking(true);
    setStatusMsg(null);
    setTimeout(() => {
      const current = getNotificationPermission();
      setChecking(false);
      if (onStatusUpdated) onStatusUpdated(current);

      if (current === 'granted') {
        setStatusMsg('🎉 Permissão concedida com sucesso!');
        setTimeout(() => onClose(), 1200);
      } else if (current === 'denied') {
        setStatusMsg('Ainda consta como Bloqueado. Siga os passos acima no navegador e tente novamente.');
      } else {
        setStatusMsg('Permissão redefinida. Agora você pode clicar em "Ativar Notificações".');
      }
    }, 600);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Lock size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Como Desbloquear Notificações</h2>
              <p className="text-[11px] text-theme-text-muted">Passo a passo rápido para seu dispositivo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-theme-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Device Tabs */}
        <div className="flex border-b border-theme-border/60 bg-theme-base/40 p-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'android'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Smartphone size={14} />
            <span>Android / Chrome</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Share2 size={14} />
            <span>iPhone / iOS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pc'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Monitor size={14} />
            <span>Computador</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
          {activeTab === 'android' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={15} /> Notificações bloqueadas pelo navegador
                </p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Por segurança, os navegadores não deixam o site pedir permissão de novo após um bloqueio. Você só precisa liberar nas configurações do site em 3 passos:
                </p>
              </div>

              <ol className="space-y-3">
                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-bold text-white">Toque no ícone de Ajustes / Cadeado</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      No canto superior da tela, ao lado do link do site, toque no ícone de cadeado 🔒 ou nas barrinhas de ajuste 🎚️.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-bold text-white">Toque em "Permissões" ➔ "Notificações"</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Selecione a opção <b>Notificações</b> e altere para <b>"Permitir"</b> (ou toque no botão <b>"Redefinir permissões"</b>).
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-bold text-white">Toque em "Verificar Novamente" abaixo</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Assim que liberar, clique no botão amarelo abaixo para atualizar o status e receber os alertas.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Share2 size={15} /> Como funciona no iPhone (iOS)
                </p>
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  A Apple (iOS 16.4+) só autoriza envio de notificações quando o site está adicionado como App na Tela de Início.
                </p>
              </div>

              <ol className="space-y-3">
                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-bold text-white">Toque no botão Compartilhar do Safari</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Na barra inferior do Safari, toque no ícone do quadrado com a setinha para cima ⎋.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-bold text-white">Escolha "Adicionar à Tela de Início"</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Role o menu um pouco para baixo e toque em <b>Adicionar à Tela de Início</b> e confirme em "Adicionar".
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <div>
                    <p className="font-bold text-white">Abra pelo ícone na Tela de Início</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Abra o aplicativo pelo novo ícone que apareceu no seu celular e toque em "Ativar Notificações".
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'pc' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Monitor size={15} /> Desbloquear no Chrome / Edge / Opera
                </p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Basta um clique no cadeado da barra de endereço para permitir:
                </p>
              </div>

              <ol className="space-y-3">
                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <div>
                    <p className="font-bold text-white">Clique no Cadeado 🔒 na barra de endereços</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Fica no canto esquerdo superior, antes de <code>https://...</code>.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-3 rounded-xl bg-theme-base/60 border border-theme-border/60">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <div>
                    <p className="font-bold text-white">Ative a opção "Notificações"</p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5">
                      Mude a chave de Bloquear para <b>Permitir</b>.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {/* Feedback message */}
          {statusMsg && (
            <div className="p-3 rounded-xl bg-theme-base border border-theme-border text-center text-xs font-bold text-white animate-fade-in">
              {statusMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border shrink-0 flex items-center justify-between gap-3 bg-theme-surface/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-theme-base border border-theme-border rounded-xl text-xs font-bold text-white hover:border-white/20 transition-all cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleRecheck}
            disabled={checking}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Verificando...' : '🔄 Já Desbloqueei / Verificar'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
