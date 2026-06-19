import { useState, useRef, useEffect } from 'react';
import { Camera, Save, Phone, Mail, Home, LogOut } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { compressImage } from '../lib/imageCompression';

export function Settings() {
  const { 
    farmSettings, updateFarmSettings,
    breeds, birds, couples, eggLots, meatLots,
    importBackup
  } = useAppContext();
  const { user, signOut, isLocalMode } = useAuth();
  
  const [name, setName] = useState(farmSettings.name);
  const [email, setEmail] = useState(farmSettings.email);
  const [phone, setPhone] = useState(farmSettings.phone);
  const [previewImage, setPreviewImage] = useState<string>(farmSettings.photo);
  const [isSaved, setIsSaved] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if farmSettings changes externally
  useEffect(() => {
    setName(farmSettings.name);
    setEmail(farmSettings.email);
    setPhone(farmSettings.phone);
    setPreviewImage(farmSettings.photo);
  }, [farmSettings]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 600, 600, 0.7);
        setPreviewImage(compressedBase64);
      } catch (err) {
        console.error("Erro ao comprimir imagem de perfil", err);
      }
    }
  };

  const handleExportBackup = () => {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      breeds,
      birds,
      couples,
      egglots: eggLots,
      meatlots: meatLots,
      settings: farmSettings
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mura-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (!parsed.breeds && !parsed.birds) {
          throw new Error('Formato de backup inválido');
        }

        await importBackup(parsed);
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 4000);
      } catch (err) {
        console.error(err);
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 4000);
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      setTimeout(() => setImportStatus('idle'), 4000);
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

  return (
    <div className="space-y-6 animate-fade-in h-full p-4 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Configurações</h2>
        <p className="text-sm text-theme-text-muted mt-1">Personalize o perfil do seu criatório.</p>
      </div>

      <div className="premium-card p-6 border border-theme-border/50 space-y-8">
        
        {/* Photo Upload */}
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
            className="relative w-32 h-32 rounded-full border-4 border-theme-border/50 flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary cursor-pointer bg-theme-base transition-all overflow-hidden group shadow-xl"
          >
            {previewImage ? (
              <>
                <img src={previewImage} alt="Foto de Perfil" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera size={24} className="mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Alterar</span>
                </div>
              </>
            ) : (
              <>
                <Camera size={28} className="mb-2 opacity-50" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Adicionar</span>
              </>
            )}
          </div>
          <p className="text-xs text-theme-text-muted mt-4">Clique para alterar a foto do perfil</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-2">
              <Home size={14} /> Nome do Criatório
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors" 
              placeholder="Ex: Criatório Mura" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-2">
              <Mail size={14} /> E-mail de Contato
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors" 
              placeholder="Ex: contato@criatoriomura.com" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-2">
              <Phone size={14} /> Número de Telefone / WhatsApp
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

        {/* Save Button */}
        <div className="pt-4 border-t border-theme-border/50">
          <button 
            onClick={handleSave}
            className="w-full btn-primary flex justify-center items-center gap-2 py-3 rounded-xl font-black text-lg"
          >
            {isSaved ? 'Salvo com Sucesso!' : <><Save size={20} /> Salvar Configurações</>}
          </button>
        </div>

      </div>

      {/* Backup and Sync Card */}
      <div className="premium-card p-6 border border-theme-border/50 space-y-6 mt-6">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            📂 Backup &amp; Sincronização Local
          </h3>
          <p className="text-xs text-theme-text-muted mt-1 leading-relaxed">
            Como o aplicativo funciona offline no seu aparelho, seus dados ficam guardados no navegador do seu celular ou computador. Se você limpar o histórico do navegador ou usar abas anônimas, os dados podem ser apagados pelo sistema do celular.
          </p>
        </div>

        <div className="bg-theme-base/30 p-4 rounded-xl border border-theme-border flex flex-col gap-3">
          <p className="text-xs text-amber-400 font-bold leading-relaxed">
            💡 Dica: Recomendamos exportar um backup regularmente e salvar o arquivo no seu WhatsApp ou Google Drive para nunca perder suas aves e raças!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export button */}
          <button
            onClick={handleExportBackup}
            className="flex items-center justify-center gap-2 p-3 bg-theme-base hover:bg-theme-surface-hover border border-theme-border hover:border-theme-primary text-white rounded-xl text-sm font-bold transition-all active:scale-95"
          >
            📥 Exportar Backup (Baixar Dados)
          </button>

          {/* Import button */}
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
              className="w-full flex items-center justify-center gap-2 p-3 bg-theme-base hover:bg-theme-surface-hover border border-theme-border hover:border-theme-primary text-white rounded-xl text-sm font-bold transition-all active:scale-95"
            >
              📤 Importar Backup (Restaurar)
            </button>
          </div>
        </div>

        {importStatus === 'success' && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs font-bold text-center animate-pulse">
            ✅ Dados restaurados com sucesso! Seu criatório foi atualizado.
          </div>
        )}

        {importStatus === 'error' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold text-center animate-pulse">
            ❌ Falha ao importar. Verifique se o arquivo de backup é válido.
          </div>
        )}

        <div className="border-t border-theme-border/30 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-theme-text-muted">
            <span className="font-bold text-white block">Sessão Ativa:</span>
            {user?.email} {isLocalMode ? '(Modo Local Offline)' : '(Sincronizado na Nuvem)'}
          </div>
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold transition-all active:scale-95 shrink-0"
          >
            <LogOut size={16} /> Sair da Conta (Logout)
          </button>
        </div>
      </div>
    </div>
  );
}
