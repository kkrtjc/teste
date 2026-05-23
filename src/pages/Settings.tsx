import { useState, useRef, useEffect } from 'react';
import { Camera, Save, Phone, Mail, Home } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { compressImage } from '../lib/imageCompression';

export function Settings() {
  const { farmSettings, updateFarmSettings } = useAppContext();
  
  const [name, setName] = useState(farmSettings.name);
  const [email, setEmail] = useState(farmSettings.email);
  const [phone, setPhone] = useState(farmSettings.phone);
  const [previewImage, setPreviewImage] = useState<string>(farmSettings.photo);
  const [isSaved, setIsSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    </div>
  );
}
