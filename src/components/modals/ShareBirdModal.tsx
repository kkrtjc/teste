import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Share2, Copy, Check, Lock, Globe, 
  Loader2, Sparkles, Send, ExternalLink, FileText,
  MessageCircle
} from 'lucide-react';
import { useAppContext, type Bird } from '../../lib/AppContext';
import { useAuth } from '../../lib/AuthContext';
import { publishShowcase, generateQrCodeUrl } from '../../lib/showcaseShare';
// PDF generator is dynamically imported on demand to keep the initial bundle small
import { useHaptics } from '../../hooks/useHaptics';

interface ShareBirdModalProps {
  bird: Bird;
  pai?: Bird | null;
  mae?: Bird | null;
  inbreeding?: number;
  onClose: () => void;
}

export function ShareBirdModal({
  bird,
  pai,
  mae,
  inbreeding = 0,
  onClose
}: ShareBirdModalProps) {
  const { 
    farmSettings, updateFarmSettings, vitrineBirds, showToast,
    canShareBird, registerBirdShare, trialSharesCount, maxTrialShares, openUpgradeModal 
  } = useAppContext();
  const { trialInfo, isAdmin } = useAuth();
  const { triggerLight, triggerSuccess, triggerWarning } = useHaptics();

  const isTrialUser = Boolean(trialInfo?.isTrial && !trialInfo?.isPaid && !isAdmin);
  const isBlockedByTrial = isTrialUser && !canShareBird(bird.id);

  const [mode, setMode] = useState<'private' | 'public'>('public');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(!isBlockedByTrial);
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [sellerWhatsapp, setSellerWhatsapp] = useState<string>(
    farmSettings?.phone || farmSettings?.whatsapp || ''
  );

  const handleWhatsappChange = (val: string) => {
    setSellerWhatsapp(val);
    updateFarmSettings({ phone: val, whatsapp: val });
  };

  // Obtém APENAS as outras aves que foram explicitamente marcadas na vitrine pelo criador
  const availableVitrineBirds = useMemo(() => {
    return (vitrineBirds || []).filter(b => b && b.id !== bird.id && !!b.inVitrine);
  }, [vitrineBirds, bird.id]);

  // Gera a publicação e o link público ao abrir o modal ou mudar o modo
  useEffect(() => {
    let isMounted = true;
    async function initShare() {
      if (isBlockedByTrial) {
        setIsPublishing(false);
        setShareUrl('');
        return;
      }

      setIsPublishing(true);
      try {
        const otherVitrineBirds = mode === 'public'
          ? availableVitrineBirds.map(b => ({
              ...b,
              id: b.id,
              anilha: b.anilha,
              nome: b.nome || '',
              raca: b.raca || '',
              sexo: b.sexo || '',
              status: b.status || 'Disponível',
              peso: b.peso || '',
              dataNascimento: b.dataNascimento || '',
              vacinas: b.vacinas || '',
              observacoes: b.observacoes || '',
              imagem: b.imagem || (b.imagens && b.imagens[0]) || '',
              imagens: b.imagens && b.imagens.length > 0 ? b.imagens : (b.imagem ? [b.imagem] : []),
              vitrinePrice: b.vitrinePrice || (b.valorEstimado ? `R$ ${b.valorEstimado}` : ''),
              vitrineStatus: b.vitrineStatus || 'Disponível'
            }))
          : [];

        const activePhone = sellerWhatsapp || farmSettings?.phone || farmSettings?.whatsapp || '';

        const url = await publishShowcase({
          id: bird.id,
          bird,
          farmSettings: {
            name: farmSettings?.name,
            responsible: farmSettings?.responsible,
            phone: activePhone,
            city: farmSettings?.city,
            state: farmSettings?.state,
            logo: farmSettings?.logo,
            whatsapp: activePhone
          },
          pai,
          mae,
          inbreeding,
          mode,
          vitrineBirds: otherVitrineBirds,
          createdAt: new Date().toISOString()
        });

        if (isMounted) {
          setShareUrl(url);
          // Registra compartilhamento no período de teste
          await registerBirdShare(bird.id);
        }
      } catch (err) {
        console.error('Erro ao gerar link de compartilhamento:', err);
      } finally {
        if (isMounted) {
          setIsPublishing(false);
        }
      }
    }

    initShare();
    return () => { isMounted = false; };
  }, [bird, pai, mae, inbreeding, mode, availableVitrineBirds, farmSettings, isBlockedByTrial, registerBirdShare, sellerWhatsapp]);

  const qrCodeUrl = shareUrl ? generateQrCodeUrl(shareUrl, 320) : '';

  const getBirdShareText = () => {
    const criatorio = farmSettings?.name || 'Mura Manager';
    const vitrineNotice = mode === 'public' && availableVitrineBirds.length > 0
      ? `\n🏪 *Veja também nossa vitrine com mais ${availableVitrineBirds.length} aves disponíveis no link!*`
      : '';
    const priceText = bird.vitrinePrice ? `\n💰 *Valor:* ${bird.vitrinePrice}` : '';
    const statusText = bird.vitrineStatus && bird.vitrineStatus !== 'Disponível' ? `\n🏷️ *Status:* ${bird.vitrineStatus}` : '';

    return `🐔 *Ficha Técnica da Ave - ${bird.anilha}*\n` +
      (bird.nome ? `*Nome:* ${bird.nome}\n` : '') +
      `*Raça:* ${bird.raca}\n` +
      (bird.sexo ? `*Sexo:* ${bird.sexo}\n` : '') +
      (bird.peso ? `*Peso:* ${bird.peso}\n` : '') +
      priceText +
      statusText +
      `\n*Criatório:* ${criatorio}` +
      vitrineNotice + `\n\n` +
      `👉 *Acesse a ficha interativa com fotos e pedigree:* \n${shareUrl}`;
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      const textToCopy = getBirdShareText();
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      triggerSuccess();
      showToast('Ficha e link copiados com sucesso!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Não foi possível copiar.', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    if (isBlockedByTrial) {
      triggerWarning();
      showToast('Limite de 5 fichas do teste atingido. Assine o Plano PRO para liberar!', 'warning');
      onClose();
      openUpgradeModal('yearly');
      return;
    }
    if (!shareUrl) return;
    triggerLight();
    const text = getBirdShareText();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const { generateBirdPdf, sharePdfFile } = await import('../../lib/pdfGenerator');
      const blob = await generateBirdPdf({
        bird,
        farmSettings,
        pai,
        mae,
        inbreeding,
      });
      const filename = `ficha-tecnica-${bird.anilha || 'ave'}.pdf`;
      await sharePdfFile(
        blob,
        filename,
        `Ficha Técnica - ${bird.anilha}`,
        `Ficha Técnica oficial da ave ${bird.anilha} (${farmSettings?.name || 'Mura Manager'})`
      );
      showToast('Ficha técnica em PDF baixada!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92dvh] animate-scale-up relative"
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/60 shrink-0">
          <div className="flex items-center gap-2">
            <Share2 className="text-theme-primary" size={20} />
            <h3 className="font-bold text-base sm:text-lg text-white">Compartilhar Ficha da Ave</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div 
          className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 modal-scrollable-content touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Trial Share Counter Badge */}
          {isTrialUser && (
            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs animate-fade-in ${
              isBlockedByTrial 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles size={16} className={isBlockedByTrial ? 'text-rose-400' : 'text-amber-400'} />
                <span className="font-bold">
                  {isBlockedByTrial ? 'Limite do teste atingido' : 'Fichas do Período de Teste'}
                </span>
              </div>
              <span className={`font-mono font-black px-2.5 py-0.5 rounded-full text-[11px] ${
                isBlockedByTrial ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {trialSharesCount}/{maxTrialShares} utilizadas
              </span>
            </div>
          )}

          {/* Bird Summary Card */}
          <div className="flex items-center gap-3 p-3 bg-theme-base/60 border border-theme-border/70 rounded-xl">
            <div className="w-14 h-14 rounded-lg bg-theme-surface overflow-hidden border border-theme-border shrink-0">
              {bird.imagem || (bird.imagens && bird.imagens[0]) ? (
                <img 
                  src={bird.imagem || bird.imagens![0]} 
                  alt={bird.anilha} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-theme-text-muted">
                  Sem foto
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-theme-primary">{bird.anilha}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">{bird.sexo}</span>
              </div>
              <p className="text-xs text-white font-bold truncate mt-0.5">{bird.nome || 'Sem nome'}</p>
              <p className="text-[11px] text-theme-text-muted truncate">{bird.raca}</p>
            </div>
          </div>

          {/* Privacy Mode Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
              Modo de Visualização do Link:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMode('private');
                  triggerLight();
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'private'
                    ? 'bg-amber-500/15 border-amber-500/60 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-theme-base/40 border-theme-border text-theme-text-muted hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Lock size={14} className={mode === 'private' ? 'text-amber-400' : ''} />
                  <span>Modo Privado</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 leading-tight">
                  Mostra <b>somente</b> esta ave. Nenhuma outra ave do criatório fica visível.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('public');
                  triggerLight();
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'public'
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-lg shadow-emerald-500/5'
                    : 'bg-theme-base/40 border-theme-border text-theme-text-muted hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Globe size={14} className={mode === 'public' ? 'text-emerald-400' : ''} />
                  <span>Vitrine Pública</span>
                  {availableVitrineBirds.length > 0 && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 font-black">
                      +{availableVitrineBirds.length} aves
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 leading-tight">
                  Mostra esta ave e o cliente pode ver a <b>vitrine do seu criatório ({availableVitrineBirds.length} outras aves)</b>.
                </p>
              </button>
            </div>

            {mode === 'public' && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2">
                <Sparkles size={14} className="shrink-0 text-emerald-400" />
                <span>
                  {availableVitrineBirds.length > 0 
                    ? `O cliente verá um botão em destaque para ver as outras ${availableVitrineBirds.length} aves da sua vitrine!`
                    : 'Modo vitrine ativo! Ao adicionar mais aves no seu plantel, elas estarão visíveis na vitrine.'}
                </span>
              </div>
            )}
          </div>

          {/* Se atingiu o limite do teste: Card de Upgrade PRO */}
          {isBlockedByTrial ? (
            <div className="p-5 bg-gradient-to-br from-amber-500/15 via-theme-base/80 to-theme-base border-2 border-amber-500/40 rounded-2xl text-center space-y-3.5 animate-scale-up shadow-xl shadow-amber-500/10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
                <Lock size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">Limite de 5 Fichas Gratuitas Atingido</h4>
                <p className="text-xs text-theme-text-muted leading-relaxed max-w-sm mx-auto">
                  Você já compartilhou 5 fichas no período de testes. Assine o <strong>Plano PRO</strong> para compartilhar sem limites, exibir sua vitrine completa e alavancar suas vendas!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openUpgradeModal('yearly');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 transition-all"
              >
                <Sparkles size={16} />
                <span>Desbloquear Compartilhamento Ilimitado (Plano PRO)</span>
              </button>
            </div>
          ) : (
            <>
              {/* Campo WhatsApp para Vendas / Contato dos Clientes */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-theme-base/80 to-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-emerald-400 shrink-0" />
                    <span>Seu WhatsApp de Vendas:</span>
                  </label>
                  {sellerWhatsapp ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <Check size={11} /> Vinculado à Ficha
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                      ⚠️ Obrigatório p/ Botão
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={sellerWhatsapp}
                    onChange={e => handleWhatsappChange(e.target.value)}
                    placeholder="Ex: (11) 99999-9999"
                    className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono tracking-wider"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  O cliente terá o botão <b className="text-emerald-400">"Tenho interesse, chamar no WhatsApp"</b> na ficha e falará direto com você.
                </p>
              </div>

              {/* QR Code Preview & Direct Link */}
              <div className="p-4 bg-theme-base/50 border border-theme-border rounded-2xl flex flex-col items-center gap-3 text-center">
                {isPublishing ? (
                  <div className="w-36 h-36 flex flex-col items-center justify-center gap-2 text-theme-text-muted">
                    <Loader2 size={24} className="animate-spin text-theme-primary" />
                    <span className="text-[11px]">Gerando ficha...</span>
                  </div>
              ) : qrCodeUrl ? (
                <div className="p-2 bg-[#121214] border-2 border-amber-500/40 rounded-xl shadow-xl shadow-amber-500/10">
                  <img src={qrCodeUrl} alt="QR Code da Ave" className="w-32 h-32 rounded-lg" />
                </div>
              ) : null}

              <div className="w-full space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Link da Ficha Interativa:
                </span>
                <div className="flex items-center gap-1.5 bg-theme-surface border border-theme-border rounded-xl p-1.5 pr-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareUrl || 'Carregando link...'} 
                    className="bg-transparent text-xs text-zinc-300 flex-1 px-2 outline-none truncate font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={isPublishing || !shareUrl}
                    className="px-3 py-1.5 rounded-lg bg-theme-primary hover:bg-orange-500 text-black font-black text-xs flex items-center gap-1 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={!isBlockedByTrial && (isPublishing || !shareUrl)}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 ${
                isBlockedByTrial
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-600/25'
              }`}
            >
              {isBlockedByTrial ? (
                <>
                  <Sparkles size={16} />
                  <span>Liberar Compartilhamento no Plano PRO</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Enviar Ficha no WhatsApp</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (shareUrl) window.open(shareUrl, '_blank');
                }}
                disabled={isBlockedByTrial || isPublishing || !shareUrl}
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ExternalLink size={14} />
                <span>Visualizar Ficha</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                <span>Baixar em PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
