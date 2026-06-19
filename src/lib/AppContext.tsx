import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import localforage from 'localforage';
import { useAuth } from './AuthContext';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export type Breed = {
  id: string;
  nome: string;
  foco: string;
  descricao: string;
  totalAves: number;
  imagem?: string;
};

export type Bird = {
  id: string;
  anilha: string;
  nome: string;
  sexo: string;
  raca: string;
  baia: string;
  status: string;
  imagem?: string;
  vacinas?: string;
  origem?: 'Criatório' | 'Externo' | 'Cruzamento';
  casalId?: string;
  paiId?: string;
  maeId?: string;
  isPaiExterno?: boolean;
  isMaeExterno?: boolean;
  dataNascimento?: string;
  peso?: string;
};

export type Couple = {
  id: string;
  machoId: string;
  femeaId: string;
  objetivo: string;
  dataInicio: string;
  status: 'Ativo' | 'Separado';
};

export type EggLot = {
  id: string;
  baia: string;
  femeasIds: string[];
  expectativaDiaria: number;
  dataInicio: string;
  status: 'Ativo' | 'Encerrado';
};

export type MeatLot = {
  id: string;
  baia: string;
  avesIds: string[];
  dataInicio: string;
  pesoMedioInicial: string;
  status: 'Crescimento' | 'Terminação' | 'Abatido';
};

export type FarmSettings = {
  name: string;
  photo: string;
  email: string;
  phone: string;
};

type AppContextType = {
  isReady: boolean;
  breeds: Breed[];
  addBreed: (breed: Breed) => void;
  editBreed: (id: string, updatedBreed: Partial<Breed>) => void;
  birds: Bird[];
  addBird: (bird: Bird) => void;
  editBird: (id: string, updatedBird: Partial<Bird>) => void;
  couples: Couple[];
  addCouple: (couple: Couple) => void;
  editCouple: (id: string, updatedCouple: Partial<Couple>) => void;
  eggLots: EggLot[];
  addEggLot: (lot: EggLot) => void;
  editEggLot: (id: string, updatedLot: Partial<EggLot>) => void;
  meatLots: MeatLot[];
  addMeatLot: (lot: MeatLot) => void;
  editMeatLot: (id: string, updatedLot: Partial<MeatLot>) => void;
  
  farmSettings: FarmSettings;
  updateFarmSettings: (settings: Partial<FarmSettings>) => void;
  importBackup: (backupData: any) => Promise<void>;

  // Modals state
  isAddBirdModalOpen: boolean;
  preSelectedBreedForNewBird: string;
  birdToEditId: string | null;
  selectedBirdProfileId: string | null;
  openAddBirdModal: (breedName?: string, birdId?: string) => void;
  openBirdProfile: (birdId: string) => void;
  closeModals: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [eggLots, setEggLots] = useState<EggLot[]>([]);
  const [meatLots, setMeatLots] = useState<MeatLot[]>([]);
  
  const [farmSettings, setFarmSettings] = useState<FarmSettings>({
    name: 'Criatório Mura',
    photo: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=600&auto=format&fit=crop',
    email: '',
    phone: ''
  });

  // Load data from Supabase or LocalForage on mount / user change
  useEffect(() => {
    async function loadData() {
      setIsReady(false);

      // Se o Supabase estiver ativo mas NÃO houver usuário logado, limpa o estado
      if (isSupabaseConfigured && !user) {
        setBreeds([]);
        setBirds([]);
        setCouples([]);
        setEggLots([]);
        setMeatLots([]);
        setFarmSettings({
          name: 'Criatório Mura',
          photo: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=600&auto=format&fit=crop',
          email: '',
          phone: ''
        });
        setIsReady(true);
        return;
      }

      // ── MODO ONLINE: SUPABASE CONFIGURADO E USUÁRIO LOGADO ──
      if (isSupabaseConfigured && user) {
        try {
          // Busca em paralelo todos os dados do Supabase
          const [
            resBreeds,
            resBirds,
            resCouples,
            resEggLots,
            resMeatLots,
            resSettings
          ] = await Promise.all([
            supabase!.from('breeds').select('*').order('nome', { ascending: true }),
            supabase!.from('birds').select('*').order('anilha', { ascending: true }),
            supabase!.from('couples').select('*'),
            supabase!.from('egg_lots').select('*'),
            supabase!.from('meat_lots').select('*'),
            supabase!.from('profiles').select('*').eq('id', user.id).maybeSingle()
          ]);

          let sbBreeds = resBreeds.data || [];
          let sbBirds = resBirds.data || [];
          let sbCouples = resCouples.data || [];
          let sbEggLots = resEggLots.data || [];
          let sbMeatLots = resMeatLots.data || [];
          let sbSettings = resSettings.data || null;

          // ── PRIMEIRA INICIALIZAÇÃO / MIGRAÇÃO LOCAL ──
          // Se o banco da nuvem estiver completamente vazio, mas houver dados locais, envia para a nuvem
          const localBreeds: any = await localforage.getItem('@mura-manager:breeds');
          const localBirds: any = await localforage.getItem('@mura-manager:birds');
          const localCouples: any = await localforage.getItem('@mura-manager:couples');
          const localEggLots: any = await localforage.getItem('@mura-manager:egglots');
          const localMeatLots: any = await localforage.getItem('@mura-manager:meatlots');
          const localSettings: any = await localforage.getItem('@mura-manager:settings');

          const isSbEmpty = sbBreeds.length === 0 && sbBirds.length === 0;
          const hasLocalData = (localBreeds && localBreeds.length > 0) || (localBirds && localBirds.length > 0);

          if (isSbEmpty && hasLocalData) {
            console.log('Migrando dados locais do IndexedDB para o Supabase...');
            
            if (localBreeds && localBreeds.length > 0) {
              const breedsToInsert = localBreeds.map((b: any) => ({ id: b.id, user_id: user.id, nome: b.nome, foco: b.foco, descricao: b.descricao, imagem: b.imagem }));
              await supabase!.from('breeds').insert(breedsToInsert);
              sbBreeds = breedsToInsert;
            }
            if (localBirds && localBirds.length > 0) {
              const birdsToInsert = localBirds.map((b: any) => ({
                id: b.id,
                user_id: user.id,
                anilha: b.anilha,
                nome: b.nome,
                sexo: b.sexo,
                raca: b.raca,
                baia: b.baia,
                status: b.status,
                imagem: b.imagem,
                vacinas: b.vacinas,
                origem: b.origem,
                casal_id: b.casalId,
                pai_id: b.paiId,
                mae_id: b.maeId,
                is_pai_externo: b.isPaiExterno,
                is_mae_externo: b.isMaeExterno,
                data_nascimento: b.dataNascimento,
                peso: b.peso
              }));
              await supabase!.from('birds').insert(birdsToInsert);
              sbBirds = birdsToInsert;
            }
            if (localCouples && localCouples.length > 0) {
              const couplesToInsert = localCouples.map((c: any) => ({
                id: c.id,
                user_id: user.id,
                macho_id: c.machoId,
                femea_id: c.femeaId,
                objetivo: c.objetivo,
                data_inicio: c.dataInicio,
                status: c.status
              }));
              await supabase!.from('couples').insert(couplesToInsert);
              sbCouples = couplesToInsert;
            }
            if (localEggLots && localEggLots.length > 0) {
              const eggLotsToInsert = localEggLots.map((l: any) => ({
                id: l.id,
                user_id: user.id,
                baia: l.baia,
                femeas_ids: l.femeasIds,
                expectativa_diaria: l.expectativaDiaria,
                data_inicio: l.dataInicio,
                status: l.status
              }));
              await supabase!.from('egg_lots').insert(eggLotsToInsert);
              sbEggLots = eggLotsToInsert;
            }
            if (localMeatLots && localMeatLots.length > 0) {
              const meatLotsToInsert = localMeatLots.map((l: any) => ({
                id: l.id,
                user_id: user.id,
                baia: l.baia,
                aves_ids: l.avesIds,
                data_inicio: l.dataInicio,
                peso_medio_inicial: l.pesoMedioInicial,
                status: l.status
              }));
              await supabase!.from('meat_lots').insert(meatLotsToInsert);
              sbMeatLots = meatLotsToInsert;
            }
            if (localSettings) {
              const settingsToInsert = { id: user.id, name: localSettings.name, photo: localSettings.photo, email: localSettings.email, phone: localSettings.phone };
              await supabase!.from('profiles').upsert(settingsToInsert);
              sbSettings = settingsToInsert;
            }
          }

          // Grava no estado e sincroniza no cache localforage
          setBreeds(sbBreeds);
          await localforage.setItem('@mura-manager:breeds', sbBreeds);

          setBirds(sbBirds);
          await localforage.setItem('@mura-manager:birds', sbBirds);

          setCouples(sbCouples);
          await localforage.setItem('@mura-manager:couples', sbCouples);

          setEggLots(sbEggLots);
          await localforage.setItem('@mura-manager:egglots', sbEggLots);

          setMeatLots(sbMeatLots);
          await localforage.setItem('@mura-manager:meatlots', sbMeatLots);

          if (sbSettings) {
            const settingsData = {
              name: sbSettings.name || 'Criatório Mura',
              photo: sbSettings.photo || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=600&auto=format&fit=crop',
              email: sbSettings.email || '',
              phone: sbSettings.phone || ''
            };
            setFarmSettings(settingsData);
            await localforage.setItem('@mura-manager:settings', settingsData);
          } else {
            const defaultSettings = {
              name: 'Criatório Mura',
              photo: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?q=80&w=600&auto=format&fit=crop',
              email: user.email || '',
              phone: ''
            };
            setFarmSettings(defaultSettings);
            await supabase!.from('profiles').upsert({ id: user.id, ...defaultSettings });
            await localforage.setItem('@mura-manager:settings', defaultSettings);
          }

        } catch (err) {
          console.error('Erro ao sincronizar dados com o Supabase, usando backup offline:', err);
          await loadFromLocalForage();
        }
      } else {
        // ── MODO OFFLINE (Bypass Local / Offline tradicional) ──
        await loadFromLocalForage();
      }

      setIsReady(true);
    }

    async function loadFromLocalForage() {
      const storageItems = [
        { key: '@mura-manager:breeds', setter: setBreeds },
        { key: '@mura-manager:birds', setter: setBirds },
        { key: '@mura-manager:couples', setter: setCouples },
        { key: '@mura-manager:egglots', setter: setEggLots },
        { key: '@mura-manager:meatlots', setter: setMeatLots },
        { key: '@mura-manager:settings', setter: setFarmSettings }
      ];

      for (const item of storageItems) {
        try {
          let data: any = await localforage.getItem(item.key);
          
          if (!data) {
            const oldData = localStorage.getItem(item.key);
            if (oldData) {
              data = JSON.parse(oldData);
              await localforage.setItem(item.key, data);
              localStorage.removeItem(item.key);
            }
          }
          
          if (data) {
            item.setter(data);
          }
        } catch (error) {
          console.error(`Erro ao carregar do localforage (${item.key}):`, error);
        }
      }
    }
    
    loadData();
  }, [user]);

  // Modals
  const [isAddBirdModalOpen, setIsAddBirdModalOpen] = useState(false);
  const [preSelectedBreedForNewBird, setPreSelectedBreedForNewBird] = useState('');
  const [birdToEditId, setBirdToEditId] = useState<string | null>(null);
  const [selectedBirdProfileId, setSelectedBirdProfileId] = useState<string | null>(null);

  const addBreed = (breed: Breed) => {
    setBreeds(prev => {
      const next = [...prev, breed];
      localforage.setItem('@mura-manager:breeds', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('breeds')
          .insert({ id: breed.id, user_id: user.id, nome: breed.nome, foco: breed.foco, descricao: breed.descricao, imagem: breed.imagem })
          .then(({ error }) => { if (error) console.error('Erro Supabase addBreed:', error); });
      }
      return next;
    });
  };
  
  const editBreed = (id: string, updatedBreed: Partial<Breed>) => {
    setBreeds(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updatedBreed } : b);
      localforage.setItem('@mura-manager:breeds', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('breeds')
          .update(updatedBreed)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editBreed:', error); });
      }
      return next;
    });
  };

  const addBird = (bird: Bird) => {
    setBirds(prev => {
      const next = [...prev, bird];
      localforage.setItem('@mura-manager:birds', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('birds')
          .insert({
            id: bird.id,
            user_id: user.id,
            anilha: bird.anilha,
            nome: bird.nome,
            sexo: bird.sexo,
            raca: bird.raca,
            baia: bird.baia,
            status: bird.status,
            imagem: bird.imagem,
            vacinas: bird.vacinas,
            origem: bird.origem,
            casal_id: bird.casalId,
            pai_id: bird.paiId,
            mae_id: bird.maeId,
            is_pai_externo: bird.isPaiExterno,
            is_mae_externo: bird.isMaeExterno,
            data_nascimento: bird.dataNascimento,
            peso: bird.peso
          })
          .then(({ error }) => { if (error) console.error('Erro Supabase addBird:', error); });
      }
      return next;
    });
  };
  
  const editBird = (id: string, updatedBird: Partial<Bird>) => {
    setBirds(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updatedBird } : b);
      localforage.setItem('@mura-manager:birds', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = { ...updatedBird };
        if (updatedBird.casalId !== undefined) { dbUpdate.casal_id = updatedBird.casalId; delete dbUpdate.casalId; }
        if (updatedBird.paiId !== undefined) { dbUpdate.pai_id = updatedBird.paiId; delete dbUpdate.paiId; }
        if (updatedBird.maeId !== undefined) { dbUpdate.mae_id = updatedBird.maeId; delete dbUpdate.maeId; }
        if (updatedBird.isPaiExterno !== undefined) { dbUpdate.is_pai_externo = updatedBird.isPaiExterno; delete dbUpdate.isPaiExterno; }
        if (updatedBird.isMaeExterno !== undefined) { dbUpdate.is_mae_externo = updatedBird.isMaeExterno; delete dbUpdate.isMaeExterno; }
        if (updatedBird.dataNascimento !== undefined) { dbUpdate.data_nascimento = updatedBird.dataNascimento; delete dbUpdate.dataNascimento; }

        supabase!
          .from('birds')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editBird:', error); });
      }
      return next;
    });
  };

  const addCouple = (couple: Couple) => {
    setCouples(prev => {
      const next = [...prev, couple];
      localforage.setItem('@mura-manager:couples', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('couples')
          .insert({
            id: couple.id,
            user_id: user.id,
            macho_id: couple.machoId,
            femea_id: couple.femeaId,
            objetivo: couple.objetivo,
            data_inicio: couple.dataInicio,
            status: couple.status
          })
          .then(({ error }) => { if (error) console.error('Erro Supabase addCouple:', error); });
      }
      return next;
    });
  };
  
  const editCouple = (id: string, updatedCouple: Partial<Couple>) => {
    setCouples(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updatedCouple } : c);
      localforage.setItem('@mura-manager:couples', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = { ...updatedCouple };
        if (updatedCouple.machoId !== undefined) { dbUpdate.macho_id = updatedCouple.machoId; delete dbUpdate.machoId; }
        if (updatedCouple.femeaId !== undefined) { dbUpdate.femea_id = updatedCouple.femeaId; delete dbUpdate.femeaId; }
        if (updatedCouple.dataInicio !== undefined) { dbUpdate.data_inicio = updatedCouple.dataInicio; delete dbUpdate.dataInicio; }

        supabase!
          .from('couples')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editCouple:', error); });
      }
      return next;
    });
  };

  const addEggLot = (lot: EggLot) => {
    setEggLots(prev => {
      const next = [...prev, lot];
      localforage.setItem('@mura-manager:egglots', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('egg_lots')
          .insert({
            id: lot.id,
            user_id: user.id,
            baia: lot.baia,
            femeas_ids: lot.femeasIds,
            expectativa_diaria: lot.expectativaDiaria,
            data_inicio: lot.dataInicio,
            status: lot.status
          })
          .then(({ error }) => { if (error) console.error('Erro Supabase addEggLot:', error); });
      }
      return next;
    });
  };
  
  const editEggLot = (id: string, updatedLot: Partial<EggLot>) => {
    setEggLots(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updatedLot } : l);
      localforage.setItem('@mura-manager:egglots', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = { ...updatedLot };
        if (updatedLot.femeasIds !== undefined) { dbUpdate.femeas_ids = updatedLot.femeasIds; delete dbUpdate.femeasIds; }
        if (updatedLot.expectativaDiaria !== undefined) { dbUpdate.expectativa_diaria = updatedLot.expectativaDiaria; delete dbUpdate.expectativaDiaria; }
        if (updatedLot.dataInicio !== undefined) { dbUpdate.data_inicio = updatedLot.dataInicio; delete dbUpdate.dataInicio; }

        supabase!
          .from('egg_lots')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editEggLot:', error); });
      }
      return next;
    });
  };

  const addMeatLot = (lot: MeatLot) => {
    setMeatLots(prev => {
      const next = [...prev, lot];
      localforage.setItem('@mura-manager:meatlots', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('meat_lots')
          .insert({
            id: lot.id,
            user_id: user.id,
            baia: lot.baia,
            aves_ids: lot.avesIds,
            data_inicio: lot.dataInicio,
            peso_medio_inicial: lot.pesoMedioInicial,
            status: lot.status
          })
          .then(({ error }) => { if (error) console.error('Erro Supabase addMeatLot:', error); });
      }
      return next;
    });
  };
  
  const editMeatLot = (id: string, updatedLot: Partial<MeatLot>) => {
    setMeatLots(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updatedLot } : l);
      localforage.setItem('@mura-manager:meatlots', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = { ...updatedLot };
        if (updatedLot.avesIds !== undefined) { dbUpdate.aves_ids = updatedLot.avesIds; delete dbUpdate.avesIds; }
        if (updatedLot.dataInicio !== undefined) { dbUpdate.data_inicio = updatedLot.dataInicio; delete dbUpdate.dataInicio; }
        if (updatedLot.pesoMedioInicial !== undefined) { dbUpdate.peso_medio_inicial = updatedLot.pesoMedioInicial; delete dbUpdate.pesoMedioInicial; }

        supabase!
          .from('meat_lots')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editMeatLot:', error); });
      }
      return next;
    });
  };

  const updateFarmSettings = (settings: Partial<FarmSettings>) => {
    setFarmSettings(prev => {
      const next = { ...prev, ...settings };
      localforage.setItem('@mura-manager:settings', next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('profiles')
          .upsert({ id: user.id, name: next.name, photo: next.photo, email: next.email, phone: next.phone })
          .then(({ error }) => { if (error) console.error('Erro Supabase updateFarmSettings:', error); });
      }
      return next;
    });
  };

  const importBackup = async (backupData: any) => {
    if (!backupData) return;
    
    if (backupData.breeds) {
      setBreeds(backupData.breeds);
      await localforage.setItem('@mura-manager:breeds', backupData.breeds);
      if (isSupabaseConfigured && user) {
        await supabase!.from('breeds').delete().eq('user_id', user.id);
        const toInsert = backupData.breeds.map((b: any) => ({
          id: b.id,
          user_id: user.id,
          nome: b.nome,
          foco: b.foco,
          descricao: b.descricao,
          imagem: b.imagem
        }));
        await supabase!.from('breeds').insert(toInsert);
      }
    }
    if (backupData.birds) {
      setBirds(backupData.birds);
      await localforage.setItem('@mura-manager:birds', backupData.birds);
      if (isSupabaseConfigured && user) {
        await supabase!.from('birds').delete().eq('user_id', user.id);
        const toInsert = backupData.birds.map((b: any) => ({
          id: b.id,
          user_id: user.id,
          anilha: b.anilha,
          nome: b.nome,
          sexo: b.sexo,
          raca: b.raca,
          baia: b.baia,
          status: b.status,
          imagem: b.imagem,
          vacinas: b.vacinas,
          origem: b.origem,
          casal_id: b.casalId,
          pai_id: b.paiId,
          mae_id: b.maeId,
          is_pai_externo: b.isPaiExterno,
          is_mae_externo: b.isMaeExterno,
          data_nascimento: b.dataNascimento,
          peso: b.peso
        }));
        await supabase!.from('birds').insert(toInsert);
      }
    }
    if (backupData.couples) {
      setCouples(backupData.couples);
      await localforage.setItem('@mura-manager:couples', backupData.couples);
      if (isSupabaseConfigured && user) {
        await supabase!.from('couples').delete().eq('user_id', user.id);
        const toInsert = backupData.couples.map((c: any) => ({
          id: c.id,
          user_id: user.id,
          macho_id: c.machoId,
          femea_id: c.femeaId,
          objetivo: c.objetivo,
          data_inicio: c.dataInicio,
          status: c.status
        }));
        await supabase!.from('couples').insert(toInsert);
      }
    }
    if (backupData.egglots) {
      setEggLots(backupData.egglots);
      await localforage.setItem('@mura-manager:egglots', backupData.egglots);
      if (isSupabaseConfigured && user) {
        await supabase!.from('egg_lots').delete().eq('user_id', user.id);
        const toInsert = backupData.egglots.map((l: any) => ({
          id: l.id,
          user_id: user.id,
          baia: l.baia,
          femeas_ids: l.femeasIds,
          expectativa_diaria: l.expectativaDiaria,
          data_inicio: l.dataInicio,
          status: l.status
        }));
        await supabase!.from('egg_lots').insert(toInsert);
      }
    }
    if (backupData.meatlots) {
      setMeatLots(backupData.meatlots);
      await localforage.setItem('@mura-manager:meatlots', backupData.meatlots);
      if (isSupabaseConfigured && user) {
        await supabase!.from('meat_lots').delete().eq('user_id', user.id);
        const toInsert = backupData.meatlots.map((l: any) => ({
          id: l.id,
          user_id: user.id,
          baia: l.baia,
          aves_ids: l.avesIds,
          data_inicio: l.dataInicio,
          peso_medio_inicial: l.pesoMedioInicial,
          status: l.status
        }));
        await supabase!.from('meat_lots').insert(toInsert);
      }
    }
    if (backupData.settings) {
      setFarmSettings(backupData.settings);
      await localforage.setItem('@mura-manager:settings', backupData.settings);
      if (isSupabaseConfigured && user) {
        await supabase!.from('profiles').upsert({
          id: user.id,
          name: backupData.settings.name,
          photo: backupData.settings.photo,
          email: backupData.settings.email,
          phone: backupData.settings.phone
        });
      }
    }
  };

  const openAddBirdModal = (breedName?: string, birdId?: string) => {
    setPreSelectedBreedForNewBird(breedName || '');
    setBirdToEditId(birdId || null);
    setIsAddBirdModalOpen(true);
    setSelectedBirdProfileId(null);
  };

  const openBirdProfile = (birdId: string) => {
    setSelectedBirdProfileId(birdId);
    setIsAddBirdModalOpen(false);
  };

  const closeModals = () => {
    setIsAddBirdModalOpen(false);
    setSelectedBirdProfileId(null);
    setBirdToEditId(null);
  };

  return (
    <AppContext.Provider value={{ 
      isReady,
      breeds, addBreed, editBreed,
      birds, addBird, editBird,
      couples, addCouple, editCouple,
      eggLots, addEggLot, editEggLot,
      meatLots, addMeatLot, editMeatLot,
      farmSettings, updateFarmSettings,
      importBackup,
      isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
      openAddBirdModal, openBirdProfile, closeModals
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
