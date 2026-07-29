import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Save, Phone, Mail, Home, LogOut, HelpCircle, 
  Download, Upload, CheckCircle2, AlertCircle, 
  Database, Sparkles, ChevronRight, Copy, MessageSquare, X, ExternalLink
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { compressImage } from '../lib/imageCompression';

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
  onOpenPaymentModal 
}: { 
  trialInfo: { isTrial: boolean; remainingDays: number; expiresAt: string | null };
  onOpenPaymentModal: () => void;
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

  if (!trialInfo.isTrial || !trialInfo.expiresAt) {
    return (
      <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black w-fit">
        <span>👑 Plano Ativo · Acesso Liberado</span>
      </div>
    );
  }

  const isUrgent = (timeLeft?.days ?? trialInfo.remainingDays) <= 3;

  return (
    <div className="flex flex-col items-start gap-2 mt-2">
      {/* Timer badge */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-md ${
        isUrgent
          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse'
          : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
      }`}>
        <div className="flex items-center gap-1.5 font-black text-xs">
          <span className="text-sm">{isUrgent ? '⏳' : '⏱️'}</span>
          <span>{isUrgent ? 'Teste Gratuito Acabando:' : 'Teste Gratuito:'}</span>
        </div>

        <div className="flex items-center gap-1 font-mono font-black text-xs text-white bg-black/60 px-2.5 py-0.5 rounded-lg border border-white/10 shadow-inner">
          {timeLeft ? (
            <>
              <span className="text-amber-400 font-bold">{timeLeft.days}d</span> :
              <span>{String(timeLeft.hours).padStart(2, '0')}h</span> :
              <span>{String(timeLeft.minutes).padStart(2, '0')}m</span> :
              <span className="text-orange-400">{String(timeLeft.seconds).padStart(2, '0')}s</span>
            </>
          ) : (
            <span>{trialInfo.remainingDays} dias restantes</span>
          )}
        </div>
      </div>

      {/* 💳 BOTÃO / LINK DE PAGAMENTO ANTECIPADO LOGO ABAIXO DO TIMER */}
      <button
        type="button"
        onClick={onOpenPaymentModal}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-500/20 hover:from-amber-500/30 hover:to-orange-500/35 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-white text-xs font-black transition-all active:scale-95 shadow-lg group cursor-pointer"
      >
        <Sparkles size={14} className="text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
        <span>Antecipar Pagamento / Renovar Assinatura</span>
        <ChevronRight size={14} className="text-amber-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </button>
    </div>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const { 
    farmSettings, updateFarmSettings,
    breeds, birds, couples, eggLots, meatLots,
    coupleEggs, incubationLots,
    importBackup, openTutorial
  } = useAppContext();
  const { signOut, isLocalMode, cpf, user, trialInfo, triggerWebhookPayment } = useAuth();

  const [name, setName] = useState(farmSettings.name);
  const [email, setEmail] = useState(farmSettings.email || user?.email || '');
  const [phone, setPhone] = useState(farmSettings.phone);
  const [previewImage, setPreviewImage] = useState<string>(farmSettings.photo);
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  // Estado para Modal de Pagamento Antecipado da Assinatura
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [copiedPix, setCopiedPix] = useState(false);

  const handleCopyPix = () => {
    navigator.clipboard.writeText('mura.manager.pay@gmail.com');
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza estado quando farmSettings mudar
  useEffect(() => {
    setName(farmSettings.name);
    setEmail(farmSettings.email || user?.email || '');
    setPhone(farmSettings.phone);
    setPreviewImage(farmSettings.photo);
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

    const confirmImport = window.confirm(
      "ATENÇÃO: A importação substituirá todos os dados locais e sincronizará com sua conta na nuvem.\n\nDeseja restaurar as informações deste arquivo de backup?"
    );
    if (!confirmImport) {
      e.target.value = '';
      return;
    }

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
      } finally {
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setImportMessage('Não foi possível ler o arquivo selecionado.');
      setTimeout(() => setImportStatus('idle'), 6000);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleSave = () => {
    updateFarmSettings({
      name,
      email,
      phone,
      photo: previewImage
    });
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleConfirmSignOut = () => {
    if (window.confirm("Deseja realmente sair da sua conta? Seus dados continuarão salvos com segurança na nuvem.")) {
      signOut();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 max-w-3xl mx-auto">
      
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

            {/* ⏱️ TIMER DO TESTE GRATUITO COM LINK DE PAGAMENTO ANTECIPADO */}
            <TrialCountdownTimer 
              trialInfo={trialInfo} 
              onOpenPaymentModal={() => setIsPaymentModalOpen(true)} 
            />

            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                isLocalMode 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {isLocalMode ? '🟡 Armazenamento Local' : '🟢 Sincronizado na Nuvem Supabase'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RESUMO DOS DADOS SALVOS & ATALHOS RÁPIDOS DE NAVEGAÇÃO ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aves Registradas', value: birds.length, icon: '🐓', color: 'text-blue-400', path: '/birds' },
          { label: 'Raças & Linhagens', value: breeds.length, icon: '🧬', color: 'text-purple-400', path: '/birds' },
          { label: 'Lotes de Ovos', value: eggLots.length, icon: '🥚', color: 'text-amber-400', path: '/eggs' },
          { label: 'Lotes de Corte/Engorda', value: meatLots.length, icon: '🍗', color: 'text-orange-400', path: '/lots' },
        ].map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => navigate(item.path)}
            className="bg-theme-surface border border-theme-border/60 p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-2 hover:border-theme-primary/80 hover:bg-theme-surface-hover transition-all cursor-pointer group active:scale-95"
            title={`Clique para ir para ${item.label}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-theme-text-muted uppercase font-bold leading-tight truncate">{item.label}</p>
              </div>
            </div>
            <div className="w-6 h-6 rounded-lg bg-theme-base border border-theme-border flex items-center justify-center text-theme-primary group-hover:bg-theme-primary group-hover:text-black transition-colors shrink-0">
              <ExternalLink size={12} />
            </div>
          </div>
        ))}
      </div>

      {/* ── CARD 1: DADOS DO CRIATÓRIO E PERFIL ── */}
      <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
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
      <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
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
          {user?.email || (cpf ? `CPF: ${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}` : 'Usuário Ativo')}
        </div>

        <button
          onClick={handleConfirmSignOut}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
        >
          <LogOut size={16} /> Sair da Conta (Logout)
        </button>
      </div>

      {/* 💳 MODAL PORTAL DE PAGAMENTO ANTECIPADO DA ASSINATURA */}
      {isPaymentModalOpen && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5 animate-scale-up relative">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Antecipar Assinatura / Pagamento</h3>
                  <p className="text-[10px] text-theme-text-muted">Ativação instantânea via Pix ou Cartão</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Plan selection */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setSelectedPlan('monthly')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedPlan === 'monthly' ? 'border-amber-500 bg-amber-500/10' : 'border-theme-border bg-theme-base/40'
                }`}
              >
                <p className="font-bold text-xs text-white">Plano Mensal</p>
                <p className="text-lg font-black text-amber-400 mt-1">R$ 19,90<span className="text-[9px] text-theme-text-muted font-normal">/mês</span></p>
              </div>

              <div 
                onClick={() => setSelectedPlan('yearly')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                  selectedPlan === 'yearly' ? 'border-amber-500 bg-amber-500/10' : 'border-theme-border bg-theme-base/40'
                }`}
              >
                <span className="absolute top-0 right-0 bg-amber-500 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg">Promo</span>
                <p className="font-bold text-xs text-white">Plano Anual</p>
                <p className="text-lg font-black text-emerald-400 mt-1">R$ 199,90<span className="text-[9px] text-theme-text-muted font-normal">/ano</span></p>
              </div>
            </div>

            {/* Pix Key */}
            <div className="bg-theme-base/60 border border-theme-border p-4 rounded-2xl space-y-3 text-center">
              <p className="text-xs font-bold text-white">Chave Pix Oficial para Pagamento</p>
              <div className="flex items-center justify-between bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-xs">
                <span className="font-mono text-white text-[11px] truncate">mura.manager.pay@gmail.com</span>
                <button
                  onClick={handleCopyPix}
                  className="p-1.5 text-amber-400 font-bold text-[10px] flex items-center gap-1 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                >
                  {copiedPix ? <CheckCircle2 size={12}/> : <Copy size={12}/>}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="pt-2 space-y-2.5">
                <button 
                  onClick={async () => {
                    const { error } = await triggerWebhookPayment(selectedPlan, cpf);
                    if (!error) {
                      alert('Assinatura ativada com sucesso! Seu criatório está com acesso total renovado.');
                      setIsPaymentModalOpen(false);
                    } else {
                      alert('Erro ao enviar Notificação de Pagamento.');
                    }
                  }}
                  className="w-full py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 text-xs shadow-lg shadow-amber-500/20"
                >
                  <Sparkles size={16} />
                  <span>Confirmar Pagamento e Ativar Agora</span>
                </button>

                <a 
                  href={`https://wa.me/55${farmSettings.phone.replace(/\D/g, '') || '5599999999999'}?text=${encodeURIComponent(`Olá! Realizei o pagamento antecipado da assinatura do Mura Manager (${cpf ? 'CPF: ' + cpf : 'Usuário'}). Segue comprovante para baixa.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-theme-text-muted hover:text-white bg-theme-surface border border-theme-border text-[11px]"
                >
                  <MessageSquare size={14} />
                  <span>Enviar Comprovante pelo WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 bg-theme-base hover:bg-white/5 border border-theme-border text-white rounded-xl text-xs font-bold transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
