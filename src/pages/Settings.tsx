import { useState, useRef, useEffect } from 'react';
import { 
  Camera, Save, Phone, Mail, Home, LogOut, HelpCircle, 
  Download, Upload, CheckCircle2, AlertCircle, 
  Database, Smartphone, Zap
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useAuth, type TrialInfo } from '../lib/AuthContext';
import { compressImage } from '../lib/imageCompression';
import { uploadFarmLogo } from '../lib/storageService';
import { PWAInstallGuideModal } from '../components/modals/PWAInstallGuideModal';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { LandingCheckoutModal } from '../components/LandingCheckoutModal';
import { RenewalModal } from '../components/modals/RenewalModal';

function calcTimeLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  const targetTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = targetTime - now;

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diffMs % (1000 * 60)) / 1000)
  };
}

function TrialCountdownTimer({ 
  trialInfo, 
  onOpenPaymentModal,
  isAdmin 
}: { 
  trialInfo: TrialInfo;
  onOpenPaymentModal: () => void;
  isAdmin?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(() => calcTimeLeft(trialInfo.expiresAt));

  useEffect(() => {
    if (!trialInfo.expiresAt) return;

    const updateTimer = () => {
      setTimeLeft(calcTimeLeft(trialInfo.expiresAt));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [trialInfo.expiresAt]);

  if (isAdmin) {
    return (
      <div className="flex items-center gap-2 mt-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black w-fit shadow-md">
        <span>👑 Administrador Principal · Acesso Vitalício</span>
      </div>
    );
  }

  if (!trialInfo.expiresAt) {
    return null;
  }

  const isExpired = timeLeft ? (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) : trialInfo.remainingDays <= 0;
  const isPaid = Boolean(trialInfo.isPaid || (!trialInfo.isTrial && (timeLeft?.days ?? trialInfo.remainingDays) > 0));
  const isUrgent = (timeLeft?.days ?? trialInfo.remainingDays) <= 3;

  return (
    <div className="flex flex-col items-start gap-2 mt-2">
      {/* Timer badge */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-md ${
        isExpired
          ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
          : isUrgent
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
            : isPaid
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
      }`}>
        <div className="flex items-center gap-1.5 font-black text-xs">
          <span className="text-sm">{isExpired ? '⚠️' : isUrgent ? '⏳' : isPaid ? '⭐' : '⏱️'}</span>
          <span>
            {isExpired
              ? 'Acesso Expirado:'
              : isUrgent
                ? (isPaid ? 'Assinatura Vencendo:' : 'Teste Gratuito Acabando:')
                : (isPaid 
                    ? (trialInfo.planType === 'yearly' ? 'Plano Anual Ativo:' : 'Plano Mensal Ativo:') 
                    : 'Teste Gratuito:')
            }
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono font-black text-xs text-white bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/10 shadow-inner">
          {timeLeft ? (
            <>
              <span className={isPaid ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{timeLeft.days}d</span> :
              <span>{String(timeLeft.hours).padStart(2, '0')}h</span> :
              <span>{String(timeLeft.minutes).padStart(2, '0')}m</span> :
              <span className="text-orange-400">{String(timeLeft.seconds).padStart(2, '0')}s</span>
            </>
          ) : (
            <span>{trialInfo.remainingDays} dias restantes</span>
          )}
        </div>
      </div>

      {/* 🚀 BOTÃO DE AÇÃO / RENOVAÇÃO / PLANOS */}
      <button
        type="button"
        onClick={onOpenPaymentModal}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md cursor-pointer mt-1 ${
          isExpired
            ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
            : isPaid
              ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/15'
              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/15'
        }`}
      >
        <Zap size={13} />
        <span>{isExpired ? 'Renovar Acesso Agora' : isPaid ? 'Antecipar Renovação' : 'Ver Planos'}</span>
      </button>

      {/* Mensagem informativa sobre soma de dias na renovação */}
      {isPaid && !isExpired && (
        <p className="text-[10.5px] text-emerald-400/80 font-medium">
          ✨ Se renovar antes de vencer, os novos dias são somados ao seu tempo atual.
        </p>
      )}
    </div>
  );
}

export function Settings() {
  const { 
    farmSettings, updateFarmSettings,
    breeds, birds, couples, eggLots, meatLots,
    coupleEggs, incubationLots,
    importBackup, openTutorial, showToast, recoverAllBirds
  } = useAppContext();
  const { signOut, isLocalMode, cpf, user, trialInfo, isAdmin, isExpired, activateSubscription } = useAuth();

  const [name, setName] = useState(farmSettings.name);
  const [email, setEmail] = useState(farmSettings.email || user?.email || '');
  const [phone, setPhone] = useState(farmSettings.phone);
  const [city, setCity] = useState(farmSettings.city || '');
  const [state, setState] = useState(farmSettings.state || '');
  const [previewImage, setPreviewImage] = useState<string>(farmSettings.photo);
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryReport, setRecoveryReport] = useState<string | null>(null);

  const handleDeepRecovery = async () => {
    setIsRecovering(true);
    try {
      const res = await recoverAllBirds();
      setRecoveryReport(res.report);
      if (res.count > 0) {
        setImportStatus('success');
        setImportMessage(`Varredura concluída! ${res.count} aves foram recuperadas e consolidadas no seu dispositivo.`);
        showToast(`${res.count} aves recuperadas com sucesso!`, 'success');
      } else {
        setImportStatus('idle');
        showToast('Varredura concluída. Nenhuma ave identificada.', 'info');
      }
    } catch (err: any) {
      setImportStatus('error');
      setImportMessage('Erro ao executar varredura profunda: ' + (err.message || 'Falha'));
    } finally {
      setIsRecovering(false);
    }
  };

  // Estado para Modal de Pagamento Antecipado da Assinatura
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPwaGuideOpen, setIsPwaGuideOpen] = useState(false);

  // Detecta se o app já está instalado na tela inicial ou rodando como aplicativo
  const [isAppInstalled, setIsAppInstalled] = useState(() => {
    try {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('@mura-manager:pwa-installed') === 'true'
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkInstalled = () => {
      try {
        const isStandalone = 
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true ||
          document.referrer.includes('android-app://') ||
          localStorage.getItem('@mura-manager:pwa-installed') === 'true';
        setIsAppInstalled(isStandalone);
      } catch {}
    };

    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', checkInstalled);

    const onAppInstalled = () => {
      try { localStorage.setItem('@mura-manager:pwa-installed', 'true'); } catch {}
      setIsAppInstalled(true);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      media.removeEventListener?.('change', checkInstalled);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [backupToImport, setBackupToImport] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const lastSettingsRef = useRef({ ...farmSettings, userEmail: user?.email });
  useEffect(() => {
    const currentEmail = farmSettings.email || user?.email || '';
    if (
      lastSettingsRef.current.name !== farmSettings.name ||
      lastSettingsRef.current.email !== currentEmail ||
      lastSettingsRef.current.phone !== farmSettings.phone ||
      lastSettingsRef.current.photo !== farmSettings.photo ||
      lastSettingsRef.current.city !== farmSettings.city ||
      lastSettingsRef.current.state !== farmSettings.state
    ) {
      lastSettingsRef.current = { ...farmSettings, email: currentEmail, userEmail: user?.email };
      setName(farmSettings.name);
      setEmail(currentEmail);
      setPhone(farmSettings.phone);
      setCity(farmSettings.city || '');
      setState(farmSettings.state || '');
      setPreviewImage(farmSettings.photo);
    }
  }, [farmSettings, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 400, 400, 0.82);
        setPreviewImage(compressedBase64);
      } catch (err) {
        console.error("Erro ao comprimir imagem de perfil", err);
      }
    }
  };

  const handleExportBackup = () => {
    const data = {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      userEmail: user?.email || email,
      stats: {
        totalBirds: birds.length,
        totalBreeds: breeds.length,
        totalCouples: couples.length,
        totalEggLots: eggLots.length,
        totalMeatLots: meatLots.length,
      },
      breeds,
      birds,
      couples,
      coupleEggs,
      incubationLots,
      egglots: eggLots,
      meatlots: meatLots,
      settings: {
        ...farmSettings,
        name,
        email,
        phone,
        photo: previewImage
      }
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nomeCriatorio = name ? name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 'mura-manager';
    a.download = `${nomeCriatorio}-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupToImport(file);
    e.target.value = '';
  };

  const executeBackupImport = () => {
    if (!backupToImport) return;
    const file = backupToImport;
    setBackupToImport(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (!parsed.breeds && !parsed.birds) {
          throw new Error('Formato de arquivo de backup inválido.');
        }

        await importBackup(parsed);
        setImportStatus('success');
        setImportMessage(`Backup restaurado! (${parsed.birds?.length || 0} aves e ${parsed.breeds?.length || 0} raças importadas).`);
        setTimeout(() => setImportStatus('idle'), 6000);
      } catch (err: any) {
        console.error('Erro na importação de backup:', err);
        setImportStatus('error');
        setImportMessage(err.message || 'Erro ao ler arquivo de backup.');
        setTimeout(() => setImportStatus('idle'), 6000);
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setImportMessage('Não foi possível ler o arquivo selecionado.');
      setTimeout(() => setImportStatus('idle'), 6000);
    };
    reader.readAsText(file);
  };

  const handleSave = async () => {
    let finalPhoto = previewImage;
    if (previewImage) {
      finalPhoto = await uploadFarmLogo(previewImage, user?.id || 'default');
    }

    updateFarmSettings({
      name,
      email,
      phone,
      photo: finalPhoto,
      city: city.trim(),
      state: state.trim()
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleConfirmSignOut = () => {
    setConfirmSignOutOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto w-full overflow-x-hidden">
      
      {/* ── HEADER DA PÁGINA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-theme-surface border border-theme-border/60 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            {previewImage ? (
              <img src={previewImage} alt="Criatório" className="w-16 h-16 rounded-2xl object-cover border-2 border-theme-primary shadow-md" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-theme-base border-2 border-theme-border flex items-center justify-center text-2xl font-black text-theme-primary">
                🐓
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-theme-surface ${isLocalMode ? 'bg-amber-400' : 'bg-emerald-400'}`} title={isLocalMode ? 'Modo Local' : 'Nuvem Conectada'} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white leading-tight">
              {name || 'Seu Criatório'}
            </h2>
            <p className="text-xs text-theme-text-muted mt-0.5">
              {user?.email || email || 'Conta do Mura Manager'}
            </p>

            {/* ⏱️ TIMER DO TESTE GRATUITO COM BOTÃO VER PLANOS */}
            <TrialCountdownTimer 
              trialInfo={trialInfo} 
              onOpenPaymentModal={() => setIsPaymentModalOpen(true)} 
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </div>

      {/* ── PAINEL DE ADMINISTRADOR PRINCIPAL (VISÍVEL PARA CONTAS DE ADM) ── */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-amber-500/10 via-theme-surface to-amber-500/5 border-2 border-amber-500/50 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <h3 className="text-base font-black text-amber-400 font-serif">Painel de Controle de Administrador</h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black">Acesso Vitalício</span>
              </div>
              <p className="text-xs text-theme-text-muted leading-relaxed max-w-xl">
                Sua conta <strong className="text-white font-mono">{isAdmin ? 'galosmurabrasill@gmail.com' : (user?.email || 'galosmurabrasill@gmail.com')}</strong> está ativada como Administrador Principal (CPF: 144.777.516-30). Você tem acesso ilimitado para cadastrar novos criadores, autorizar CPFs e gerenciar assinaturas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-admin-modal'))}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>🛡️ Gerenciar Clientes & Liberações</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CARD ESPECIAL: INSTALAR NO CELULAR (IPHONE & ANDROID) ── */}
      {!isAppInstalled && (
        <div id="install-pwa-card" className="bg-gradient-to-br from-amber-500/15 via-[#0f0f14] to-[#070709] border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                <Smartphone size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">
                    Instalar Aplicativo no Celular
                  </h3>
                  <span className="bg-amber-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-1 max-w-xl">
                  Adicione o ícone do Mura Manager na tela inicial do seu <strong>iPhone</strong> ou <strong>Android</strong>. Abre em tela cheia instantaneamente e mantém seu login sempre salvo!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPwaGuideOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              <Smartphone size={16} />
              <span>Como Instalar (Passo a Passo)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CARD 1: DADOS DO CRIATÓRIO E PERFIL ── */}
      <div id="settings-farm-info" className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="border-b border-theme-border/40 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Home size={18} className="text-theme-primary" /> Informações do Criatório
          </h3>
          <p className="text-xs text-theme-text-muted mt-1">
            Personalize o nome e foto do seu criatório. Essas informações aparecem em relatórios exportados.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group shrink-0">
            {previewImage ? (
              <img src={previewImage} alt="Preview" className="w-24 h-24 rounded-2xl object-cover border-2 border-theme-primary shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-theme-base border-2 border-theme-border flex items-center justify-center text-4xl shadow-inner">
                🐓
              </div>
            )}
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs gap-1"
            >
              <Camera size={20} />
              <span>Alterar Foto</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-4 flex-1 w-full">
            <div>
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block mb-1.5">
                Nome do Criatório
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Criatório Mura Elite"
                className="w-full bg-theme-base border border-theme-border/60 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-theme-primary transition-colors font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Mail size={14} /> E-mail de Contato
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="contato@criatorio.com"
                  className="w-full bg-theme-base border border-theme-border/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-theme-primary transition-colors font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Phone size={14} /> WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-theme-base border border-theme-border/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-theme-primary transition-colors font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Home size={14} /> Cidade
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ex: Cuiabá"
                  className="w-full bg-theme-base border border-theme-border/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-theme-primary transition-colors font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Home size={14} /> Estado (UF)
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="Ex: MT"
                  maxLength={2}
                  className="w-full bg-theme-base border border-theme-border/60 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-theme-primary transition-colors font-medium uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-theme-border/40 pt-4">
          {isSaved ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 size={16} /> Dados salvos com sucesso!
            </span>
          ) : <span />}

          <button
            onClick={handleSave}
            className="btn-primary !px-5 !py-2.5 flex items-center gap-2 text-xs font-black shadow-lg shadow-theme-primary/20 active:scale-95 transition-all"
          >
            <Save size={16} /> Salvar Alterações
          </button>
        </div>
      </div>

      {/* ── CARD 2: BACKUP E SEGURANÇA DOS DADOS ── */}
      <div id="settings-backup-card" className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="border-b border-theme-border/40 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Database size={18} className="text-theme-primary" /> Cópia de Segurança (Backup)
          </h3>
          <p className="text-xs text-theme-text-muted mt-1 leading-relaxed">
            Seus dados são sincronizados automaticamente na nuvem. Você também pode exportar um arquivo JSON com todo o histórico do criatório para guardar no computador ou celular.
          </p>
        </div>

        {importStatus !== 'idle' && (
          <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
            importStatus === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {importStatus === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{importMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2.5 p-3.5 bg-theme-base hover:bg-theme-surface-hover border border-theme-border hover:border-theme-primary/60 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
          >
            <Download size={16} className="text-theme-primary" />
            <span>Fazer Backup (Exportar JSON)</span>
          </button>

          <button
            onClick={() => importFileInputRef.current?.click()}
            className="flex items-center justify-center gap-2.5 p-3.5 bg-theme-base hover:bg-theme-surface-hover border border-theme-border hover:border-blue-500/60 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
          >
            <Upload size={16} className="text-blue-400" />
            <span>Restaurar Backup (Importar JSON)</span>
          </button>

          <input
            type="file"
            ref={importFileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Botão de Resgate Profundo de Aves */}
        <div className="pt-3 border-t border-theme-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div>
              <h4 className="text-xs font-black text-amber-400">Varredura de Emergência de Aves</h4>
              <p className="text-[11px] text-theme-text-muted mt-0.5">
                Vasculha todos os bancos IndexedDB e memórias locais deste celular para resgatar aves cadastradas anteriormente.
              </p>
            </div>
            <button
              onClick={handleDeepRecovery}
              disabled={isRecovering}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
            >
              {isRecovering ? 'Executando Varredura...' : '🔍 Escanear & Restaurar Aves'}
            </button>
          </div>

          {recoveryReport && (
            <div className="mt-3 p-3 bg-black/50 border border-theme-border/50 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-theme-text-muted">Relatório da Varredura:</span>
                <button
                  onClick={() => setRecoveryReport(null)}
                  className="text-[10px] text-theme-text-muted hover:text-white"
                >
                  Fechar
                </button>
              </div>
              <pre className="text-[10px] font-mono text-amber-200/90 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                {recoveryReport}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 3: AJUDA E TUTORIAL GUIADO ── */}
      <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <HelpCircle size={18} className="text-theme-primary" /> Central de Ajuda &amp; Treinamento
          </h3>
          <p className="text-xs text-theme-text-muted mt-1 leading-relaxed">
            Dúvidas sobre como cadastrar matrizes, gerenciar ovos ou interpretar o pedigree? Reveja nosso tutorial guiado a qualquer momento.
          </p>
        </div>

        <button
          onClick={openTutorial}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-theme-primary to-orange-500 hover:from-amber-400 hover:to-orange-600 text-black rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-theme-primary/10"
        >
          📖 Iniciar Tutorial Guiado Interativo
        </button>
      </div>

      {/* ── CARD 4: SESSÃO & LOGOUT ── */}
      <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-theme-text-muted">
          <span className="font-bold text-white block">Sessão Conectada:</span>
          {isAdmin ? (
            <div>
              <p className="font-semibold text-amber-400">galosmurabrasill@gmail.com (Administrador Principal)</p>
              <p className="text-[11px] text-theme-text-muted">CPF: 144.777.516-30</p>
            </div>
          ) : (
            user?.email || (cpf ? `CPF: ${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}` : 'Usuário Ativo')
          )}
        </div>

        <button
          onClick={handleConfirmSignOut}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
        >
          <LogOut size={16} /> Sair da Conta (Logout)
        </button>
      </div>

      {/* 💳 CHECKOUT OFICIAL / MODAL DE RENOVAÇÃO INTELIGENTE */}
      {(trialInfo?.isPaid || isExpired) ? (
        <RenewalModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          currentPlan={trialInfo?.planType || 'monthly'}
          daysRemaining={trialInfo?.remainingDays ?? 0}
          currentUser={{
            cpf,
            nome: name || farmSettings.name,
            email: email || farmSettings.email || user?.email,
            whatsapp: phone || farmSettings.phone,
          }}
          onRenewSuccess={async (renewedPlan) => {
            await activateSubscription(renewedPlan);
            showToast('Assinatura renovada com sucesso! Seu criatório está ativo.', 'success');
          }}
        />
      ) : (
        <LandingCheckoutModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          initialPlan="yearly"
          currentUser={{
            cpf,
            nome: name || farmSettings.name,
            email: email || farmSettings.email || user?.email,
            whatsapp: phone || farmSettings.phone,
          }}
          onSuccess={async () => {
            await activateSubscription('yearly');
            showToast('Assinatura ativada com sucesso! Seu criatório está liberado.', 'success');
          }}
        />
      )}

      {/* Modal de Instruções de Instalação PWA (iPhone e Android) */}
      <PWAInstallGuideModal
        isOpen={isPwaGuideOpen}
        onClose={() => setIsPwaGuideOpen(false)}
      />

      {/* Confirmação de Saída de Conta */}
      <ConfirmDialog
        isOpen={confirmSignOutOpen}
        title="Sair da Conta?"
        message="Deseja realmente sair da sua conta? Seus dados continuarão salvos com segurança na nuvem."
        confirmLabel="Sair da Conta"
        confirmVariant="danger"
        onConfirm={async () => {
          setConfirmSignOutOpen(false);
          await signOut();
        }}
        onCancel={() => setConfirmSignOutOpen(false)}
      />

      {/* Confirmação de Restauração de Backup */}
      <ConfirmDialog
        isOpen={Boolean(backupToImport)}
        title="Restaurar Backup?"
        message="ATENÇÃO: A importação substituirá todos os dados locais e sincronizará com sua conta na nuvem. Deseja restaurar as informações deste arquivo?"
        confirmLabel="Restaurar Dados"
        confirmVariant="warning"
        onConfirm={executeBackupImport}
        onCancel={() => setBackupToImport(null)}
      />

    </div>
  );
}
