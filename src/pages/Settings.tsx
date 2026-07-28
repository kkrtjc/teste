import { useState, useRef, useEffect } from 'react';
import { 
  Camera, Save, Phone, Mail, Home, LogOut, HelpCircle, 
  Download, Upload, CheckCircle2, AlertCircle, 
  ShieldCheck, Database
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { compressImage } from '../lib/imageCompression';

function TrialCountdownTimer({ trialInfo }: { trialInfo: { isTrial: boolean; remainingDays: number; expiresAt: string | null } }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!trialInfo.expiresAt) return;

    const updateTimer = () => {
      const targetTime = new Date(trialInfo.expiresAt!).getTime();
      const now = Date.now();
      const diffMs = targetTime - now;

      if (diffMs <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
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
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2 px-3 py-1.5 rounded-xl border transition-all shadow-md ${
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
  );
}

export function Settings() {
  const { 
    farmSettings, updateFarmSettings,
    breeds, birds, couples, eggLots, meatLots,
    coupleEggs, incubationLots,
    importBackup, openTutorial
  } = useAppContext();
  const { signOut, isLocalMode, cpf, user, trialInfo } = useAuth();

  const [name, setName] = useState(farmSettings.name);
  const [email, setEmail] = useState(farmSettings.email || user?.email || '');
  const [phone, setPhone] = useState(farmSettings.phone);
  const [previewImage, setPreviewImage] = useState<string>(farmSettings.photo);
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

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

            {/* ⏱️ TIMER DO TESTE GRATUITO SOBRE O NOME DO CRIATÓRIO */}
            <TrialCountdownTimer trialInfo={trialInfo} />

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

      {/* ── RESUMO DOS DADOS SALVOS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Aves Registradas', value: birds.length, icon: '🐓', color: 'text-blue-400' },
          { label: 'Raças & Linhagens', value: breeds.length, icon: '🧬', color: 'text-purple-400' },
          { label: 'Lotes de Ovos', value: eggLots.length, icon: '🥚', color: 'text-amber-400' },
          { label: 'Lotes de Corte/Engorda', value: meatLots.length, icon: '🍗', color: 'text-orange-400' },
        ].map((item, idx) => (
          <div key={idx} className="bg-theme-surface border border-theme-border/60 p-3.5 rounded-xl shadow-md flex items-center gap-3">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className={`text-lg font-black ${item.color}`}>{item.value}</p>
              <p className="text-[10px] text-theme-text-muted uppercase font-bold leading-tight">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── CARD 1: DADOS DO CRIATÓRIO E PERFIL ── */}
      <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="border-b border-theme-border/40 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Home size={18} className="text-theme-primary" /> Perfil do Criatório
          </h3>
          <p className="text-xs text-theme-text-muted mt-0.5">Informações exibidas nos relatórios e fichas do sistema.</p>
        </div>

        {/* Foto */}
        <div className="flex flex-col items-center">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            className="hidden" 
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-theme-border flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary cursor-pointer bg-theme-base transition-all overflow-hidden group shadow-lg"
          >
            {previewImage ? (
              <>
                <img src={previewImage} alt="Logo do Criatório" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera size={22} className="mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Alterar</span>
                </div>
              </>
            ) : (
              <>
                <Camera size={26} className="mb-1 opacity-60" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Enviar Logo</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-theme-text-muted mt-2">Clique para enviar ou alterar a foto do seu criatório</p>
          
          {/* ⏱️ TIMER DO TESTE GRATUITO ABAIXO DA FOTO */}
          <TrialCountdownTimer trialInfo={trialInfo} />
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-2">
              <Home size={13} /> Nome do Criatório
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors" 
              placeholder="Ex: Criatório Mura &amp; Genética" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-2">
                <Mail size={13} /> E-mail de Contato
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors" 
                placeholder="Ex: contato@criatorio.com" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-2">
                <Phone size={13} /> Telefone / WhatsApp
              </label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors" 
                placeholder="Ex: (11) 99999-9999" 
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full btn-primary flex justify-center items-center gap-2 py-3 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all"
        >
          {isSaved ? (
            <span className="flex items-center gap-2 text-black font-black"><CheckCircle2 size={18} /> Salvo com Sucesso!</span>
          ) : (
            <><Save size={18} /> Salvar Alterações do Perfil</>
          )}
        </button>
      </div>

      {/* ── CARD 2: ESCLARECIMENTO DE NUVEM & BACKUP ── */}
      <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="border-b border-theme-border/40 pb-3">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" /> Sincronização Automática na Nuvem
          </h3>
          <p className="text-xs text-theme-text-muted mt-0.5">Segurança dos seus dados em tempo real.</p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            Seus dados estão protegidos e salvos na Nuvem (Supabase)!
          </p>
          <p className="text-[11px] leading-relaxed text-emerald-200/90">
            Toda ave cadastrada, raça, lote ou registro de ovos é <strong>salvo automaticamente no seu perfil da nuvem</strong> a cada alteração. Mesmo que você troque de celular, formate o aparelho ou use outro navegador, basta fazer login com sua conta <strong>({user?.email || 'Google/E-mail'})</strong> para acessar todos os seus dados instantaneamente.
          </p>
        </div>

        {/* Central de Backup Manual */}
        <div className="pt-2 space-y-3">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Database size={14} className="text-theme-primary" /> Backup Manual (Cópia de Segurança Offline)
          </h4>
          <p className="text-xs text-theme-text-muted leading-relaxed">
            Você pode baixar um arquivo <code>.json</code> contendo uma cópia completa dos seus dados para guardar no seu computador, WhatsApp ou Google Drive por precaução.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 p-3 bg-theme-base hover:bg-theme-surface-hover border border-theme-border hover:border-theme-primary text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
            >
              <Download size={16} className="text-theme-primary" /> Exportar Backup (Baixar JSON)
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".json"
                ref={importFileInputRef}
                onChange={handleImportBackup}
                className="hidden"
              />
              <button
                onClick={() => importFileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 bg-theme-base hover:bg-theme-surface-hover border border-theme-border hover:border-theme-primary text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md"
              >
                <Upload size={16} className="text-blue-400" /> Restaurar Backup (Importar JSON)
              </button>
            </div>
          </div>

          {importStatus === 'success' && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> {importMessage}
            </div>
          )}

          {importStatus === 'error' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
              <AlertCircle size={16} /> {importMessage}
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
          {user?.email || (cpf ? `CPF: ${cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}` : 'Usuário Ativo')}
        </div>

        <button
          onClick={handleConfirmSignOut}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
        >
          <LogOut size={16} /> Sair da Conta (Logout)
        </button>
      </div>

    </div>
  );
}
