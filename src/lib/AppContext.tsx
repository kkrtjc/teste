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
  tempoCrescimento?: number;
  pesoMedio?: string;
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
  imagens?: string[];
  vacinas?: string;
  origem?: 'Criatório' | 'Externo' | 'Cruzamento';
  casalId?: string;
  paiId?: string;
  maeId?: string;
  isPaiExterno?: boolean;
  isMaeExterno?: boolean;
  dataNascimento?: string;
  peso?: string;
  dataBaixa?: string;
};

export type Couple = {
  id: string;
  machoId: string;
  femeaId: string;           // mantido para compat. com dados antigos
  femeaIds?: string[];       // múltiplas fêmeas (até 10)
  cageName?: string;         // número/nome do cruzador
  raca?: string;             // raça do casal
  objetivo: string;
  dataInicio: string;
  status: 'Ativo' | 'Separado';
  ovosDisponiveis?: number;
  isHibrido?: boolean;
  racaFemea?: string;
};

export type CoupleEgg = {
  id: string;
  coupleId: string;
  femeaId: string;           // qual fêmea botou o ovo
  status: 'Em Espera' | 'Em Choco' | 'Eclodido' | 'Perdido';
  dataIntroducao: string;    // data de introdução ao cruzador
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
  removeBird: (id: string) => void;
  couples: Couple[];
  addCouple: (couple: Couple) => void;
  editCouple: (id: string, updatedCouple: Partial<Couple>) => void;
  removeCouple: (id: string) => void;
  coupleEggs: CoupleEgg[];
  addCoupleEgg: (egg: CoupleEgg) => void;
  editCoupleEgg: (id: string, updated: Partial<CoupleEgg>) => void;
  removeCoupleEgg: (id: string) => void;
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
  isTutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
  activeBreed: string;
  setActiveBreed: (breed: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [coupleEggs, setCoupleEggs] = useState<CoupleEgg[]>([]);
  const [eggLots, setEggLots] = useState<EggLot[]>([]);
  const [meatLots, setMeatLots] = useState<MeatLot[]>([]);
  
  const [farmSettings, setFarmSettings] = useState<FarmSettings>({
    name: '',
    photo: '',
    email: '',
    phone: ''
  });

  const getStorageKey = (keyName: string) => {
    if (!user) return `@mura-manager:guest:${keyName}`;
    return `@mura-manager:${user.id}:${keyName}`;
  };

  // Load data from Supabase or LocalForage on mount / user change
  useEffect(() => {
    async function loadData() {
      setIsReady(false);

      if (!user) {
        setBreeds([]);
        setBirds([]);
        setCouples([]);
        setCoupleEggs([]);
        setEggLots([]);
        setMeatLots([]);
        setFarmSettings({
          name: '',
          photo: '',
          email: '',
          phone: ''
        });
        setActiveBreed('');
        setIsReady(true);
        return;
      }

      // ── MODO ONLINE: SUPABASE CONFIGURADO E USUÁRIO LOGADO ──
      if (isSupabaseConfigured && user) {
        // Carrega dados offline primeiro para resposta instantânea!
        await loadFromLocalForage();
        setIsReady(true);

        // Executa sincronização em segundo plano sem travar o carregamento inicial
        syncWithSupabaseBackground().catch(err => {
          console.error('Erro na sincronização em segundo plano:', err);
        });
      } else {
        // ── MODO OFFLINE (Bypass Local / Offline tradicional) ──
        await loadFromLocalForage();
        setIsReady(true);
      }
    }

    async function syncWithSupabaseBackground() {
      if (!isSupabaseConfigured || !user) return;

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
      const localBreeds: any = await localforage.getItem(getStorageKey('breeds'));
      const localBirds: any = await localforage.getItem(getStorageKey('birds'));
      const localCouples: any = await localforage.getItem(getStorageKey('couples'));
      const localEggLots: any = await localforage.getItem(getStorageKey('egglots'));
      const localMeatLots: any = await localforage.getItem(getStorageKey('meatlots'));
      const localSettings: any = await localforage.getItem(getStorageKey('settings'));

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

      // Grava no estado e sincroniza no cache localforage com preservação de propriedades locais
      const mappedBreeds = sbBreeds.map((b: any) => {
        const localBreed = (localBreeds || []).find((x: any) => x.id === b.id);
        return {
          id: b.id,
          nome: b.nome || '',
          foco: b.foco || '',
          descricao: b.descricao || '',
          imagem: b.imagem,
          totalAves: b.total_aves || b.totalAves || 0,
          tempoCrescimento: localBreed?.tempoCrescimento || 0,
          pesoMedio: localBreed?.pesoMedio || ''
        };
      });
      setBreeds(mappedBreeds);
      await localforage.setItem(getStorageKey('breeds'), mappedBreeds);

      // Mapeamento e mesclagem de imagens das aves
      const mappedBirds = sbBirds.map((b: any) => {
        const localBird = (localBirds || []).find((x: any) => x.id === b.id);
        let birdImagens = localBird?.imagens || [];
        
        if (birdImagens.length === 0 && b.imagem) {
          birdImagens = [b.imagem];
        } else if (b.imagem && birdImagens[0] !== b.imagem) {
          birdImagens = [b.imagem, ...birdImagens.filter((img: string) => img !== b.imagem)].slice(0, 10);
        }

        return {
          id: b.id,
          anilha: b.anilha || '',
          nome: b.nome || '',
          sexo: b.sexo || 'Macho',
          raca: b.raca || '',
          baia: b.baia || 'ND',
          status: b.status || 'Reprodutor',
          imagem: b.imagem,
          imagens: birdImagens,
          vacinas: b.vacinas,
          origem: b.origem,
          casalId: b.casal_id || b.casalId,
          paiId: b.pai_id || b.paiId,
          maeId: b.mae_id || b.maeId,
          isPaiExterno: b.is_pai_externo !== undefined ? b.is_pai_externo : b.isPaiExterno,
          isMaeExterno: b.is_mae_externo !== undefined ? b.is_mae_externo : b.isMaeExterno,
          dataNascimento: b.data_nascimento || b.dataNascimento,
          peso: b.peso,
          dataBaixa: localBird?.dataBaixa
        };
      });

      setBirds(mappedBirds);
      await localforage.setItem(getStorageKey('birds'), mappedBirds);

      // Mapeia casais de snake_case para camelCase
      const mappedCouples = sbCouples.map((c: any) => {
        const mapped = {
          id: c.id,
          machoId: c.macho_id || c.machoId || '',
          femeaId: c.femea_id || c.femeaId || '',
          objetivo: c.objetivo || '',
          dataInicio: c.data_inicio || c.dataInicio || '',
          status: c.status || 'Ativo',
          femeaIds: c.femeaIds || []
        };
        mapped.femeaIds = mapped.femeaIds.length > 0 ? mapped.femeaIds : (mapped.femeaId ? [mapped.femeaId] : []);
        return mapped;
      });
      setCouples(mappedCouples);
      await localforage.setItem(getStorageKey('couples'), mappedCouples);

      // Mapeia lotes de ovos de snake_case para camelCase
      const mappedEggLots = sbEggLots.map((l: any) => ({
        id: l.id,
        baia: l.baia || '',
        femeasIds: l.femeas_ids || l.femeasIds || [],
        expectativaDiaria: l.expectativa_diaria !== undefined ? l.expectativa_diaria : (l.expectativaDiaria || 0),
        dataInicio: l.data_inicio || l.dataInicio || '',
        status: l.status || 'Ativo'
      }));
      setEggLots(mappedEggLots);
      await localforage.setItem(getStorageKey('egglots'), mappedEggLots);

      // Mapeia lotes de corte de snake_case para camelCase
      const mappedMeatLots = sbMeatLots.map((l: any) => ({
        id: l.id,
        baia: l.baia || '',
        avesIds: l.aves_ids || l.avesIds || [],
        dataInicio: l.data_inicio || l.dataInicio || '',
        pesoMedioInicial: l.peso_medio_inicial || l.pesoMedioInicial || '',
        status: l.status || 'Crescimento'
      }));
      setMeatLots(mappedMeatLots);
      await localforage.setItem(getStorageKey('meatlots'), mappedMeatLots);

      if (sbSettings) {
        const settingsData = {
          name: sbSettings.name || '',
          photo: sbSettings.photo || '',
          email: sbSettings.email || '',
          phone: sbSettings.phone || ''
        };
        setFarmSettings(settingsData);
        await localforage.setItem(getStorageKey('settings'), settingsData);
      } else {
        const defaultSettings = {
          name: '',
          photo: '',
          email: '',
          phone: ''
        };
        setFarmSettings(defaultSettings);
        await supabase!.from('profiles').upsert({ id: user.id, ...defaultSettings });
        await localforage.setItem(getStorageKey('settings'), defaultSettings);
      }
    }

    async function loadFromLocalForage() {
      if (!user) return;
      const storageItems = [
        { suffix: 'breeds',      setter: setBreeds },
        { suffix: 'birds',       setter: setBirds },
        { suffix: 'couples',     setter: (d: any) => {
            const migrated = (d || []).map((c: any) => ({
              ...c,
              femeaIds: c.femeaIds || (c.femeaId ? [c.femeaId] : []),
            }));
            setCouples(migrated);
          }
        },
        { suffix: 'couple-eggs', setter: setCoupleEggs },
        { suffix: 'egglots',     setter: setEggLots },
        { suffix: 'meatlots',    setter: setMeatLots },
        { suffix: 'settings',    setter: setFarmSettings }
      ];

      for (const item of storageItems) {
        try {
          const userKey = getStorageKey(item.suffix);
          let data: any = await localforage.getItem(userKey);

          // Fallback para chaves antigas sem prefixo
          if (!data) {
            const legacyKey = `@mura-manager:${item.suffix}`;
            const legacyData = await localforage.getItem(legacyKey);
            if (legacyData) {
              data = legacyData;
              await localforage.setItem(userKey, data);
              await localforage.removeItem(legacyKey);
            } else {
              const oldData = localStorage.getItem(legacyKey);
              if (oldData) {
                data = JSON.parse(oldData);
                await localforage.setItem(userKey, data);
                localStorage.removeItem(legacyKey);
              }
            }
          }

          if (data) {
            (item.setter as any)(data);
          }
        } catch (error) {
          console.error(`Erro ao carregar do localforage (${item.suffix}):`, error);
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
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [activeBreed, setActiveBreed] = useState('');

  useEffect(() => {
    if (isReady) {
      localforage.getItem(getStorageKey('has-seen-tutorial')).then(val => {
        if (!val) {
          setIsTutorialOpen(true);
        }
      });
    }
  }, [isReady]);

  // Autopromoção de 'Crescimento' para 'Adulto' e migração de status obsoletos ('Ativo')
  useEffect(() => {
    if (!isReady || birds.length === 0) return;

    let hasUpdates = false;
    const updatedBirds = birds.map(bird => {
      let nextStatus = bird.status;

      // Migrar status obsoleto 'Ativo' para 'Adulto'
      if (bird.status === 'Ativo') {
        nextStatus = 'Adulto';
        hasUpdates = true;
      }

      // Autopromoção de 'Crescimento' para 'Adulto'
      if (bird.status === 'Crescimento' && bird.dataNascimento && breeds.length > 0) {
        const breedObj = breeds.find(b => b.nome === bird.raca);
        const tempoCrescimento = breedObj?.tempoCrescimento || 0;
        if (tempoCrescimento > 0) {
          const birthDate = new Date(bird.dataNascimento);
          const today = new Date();
          birthDate.setHours(0,0,0,0);
          today.setHours(0,0,0,0);
          const diffTime = today.getTime() - birthDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= tempoCrescimento) {
            nextStatus = 'Adulto';
            hasUpdates = true;
          }
        }
      }

      if (nextStatus !== bird.status) {
        return { ...bird, status: nextStatus };
      }
      return bird;
    });

    if (hasUpdates) {
      setBirds(updatedBirds);
      localforage.setItem(getStorageKey('birds'), updatedBirds).catch(err => console.error(err));
      if (isSupabaseConfigured && user) {
        const promises = updatedBirds
          .filter((b, idx) => b.status !== birds[idx].status)
          .map(b => 
            supabase!
              .from('birds')
              .update({ status: b.status })
              .eq('id', b.id)
          );
        Promise.all(promises).catch(err => console.error('Erro ao atualizar status Supabase:', err));
      }
    }
  }, [isReady, birds, breeds, user]);

  const addBreed = (breed: Breed) => {
    setBreeds(prev => {
      const next = [...prev, breed];
      localforage.setItem(getStorageKey('breeds'), next).catch(err => console.error(err));
      
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
      localforage.setItem(getStorageKey('breeds'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = {};
        if (updatedBreed.nome !== undefined) dbUpdate.nome = updatedBreed.nome;
        if (updatedBreed.foco !== undefined) dbUpdate.foco = updatedBreed.foco;
        if (updatedBreed.descricao !== undefined) dbUpdate.descricao = updatedBreed.descricao;
        if (updatedBreed.imagem !== undefined) dbUpdate.imagem = updatedBreed.imagem;

        supabase!
          .from('breeds')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editBreed:', error); });
      }
      return next;
    });
  };

  const addBird = (bird: Bird) => {
    setBirds(prev => {
      const next = [...prev, bird];
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      
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
            imagem: bird.imagens?.[0] || bird.imagem,
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
      const next = prev.map(b => {
        if (b.id === id) {
          const nextFields = { ...updatedBird };
          if ((updatedBird.status === 'Vendido' || updatedBird.status === 'Faleceu') && !b.dataBaixa) {
            nextFields.dataBaixa = new Date().toISOString().split('T')[0];
          }
          if (updatedBird.status && updatedBird.status !== 'Vendido' && updatedBird.status !== 'Faleceu') {
            nextFields.dataBaixa = undefined;
          }
          return { ...b, ...nextFields };
        }
        return b;
      });
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = { ...updatedBird };
        if (updatedBird.casalId !== undefined) { dbUpdate.casal_id = updatedBird.casalId; delete dbUpdate.casalId; }
        if (updatedBird.paiId !== undefined) { dbUpdate.pai_id = updatedBird.paiId; delete dbUpdate.paiId; }
        if (updatedBird.maeId !== undefined) { dbUpdate.mae_id = updatedBird.maeId; delete dbUpdate.maeId; }
        if (updatedBird.isPaiExterno !== undefined) { dbUpdate.is_pai_externo = updatedBird.isPaiExterno; delete dbUpdate.isPaiExterno; }
        if (updatedBird.isMaeExterno !== undefined) { dbUpdate.is_mae_externo = updatedBird.isMaeExterno; delete dbUpdate.isMaeExterno; }
        if (updatedBird.dataNascimento !== undefined) { dbUpdate.data_nascimento = updatedBird.dataNascimento; delete dbUpdate.dataNascimento; }
        if (updatedBird.imagens !== undefined) {
          dbUpdate.imagem = updatedBird.imagens?.[0] || null;
          delete dbUpdate.imagens;
        }
        delete dbUpdate.dataBaixa;

        supabase!
          .from('birds')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editBird:', error); });
      }
      return next;
    });
  };

  const removeBird = (id: string) => {
    setBirds(prev => {
      const next = prev.filter(b => b.id !== id);
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('birds')
          .delete()
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase removeBird:', error); });
      }
      return next;
    });
  };

  const addCouple = (couple: Couple) => {
    setCouples(prev => {
      const next = [...prev, couple];
      localforage.setItem(getStorageKey('couples'), next).catch(err => console.error(err));

      if (isSupabaseConfigured && user) {
        supabase!
          .from('couples')
          .insert({
            id: couple.id,
            user_id: user.id,
            macho_id: couple.machoId,
            femea_id: couple.femeaIds?.[0] || couple.femeaId || '',
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
      localforage.setItem(getStorageKey('couples'), next).catch(err => console.error(err));

      if (isSupabaseConfigured && user) {
        const dbUpdate: any = {};
        if (updatedCouple.machoId !== undefined) dbUpdate.macho_id = updatedCouple.machoId;
        if (updatedCouple.femeaId !== undefined) dbUpdate.femea_id = updatedCouple.femeaId;
        if (updatedCouple.femeaIds !== undefined) dbUpdate.femea_id = updatedCouple.femeaIds[0];
        if (updatedCouple.dataInicio !== undefined) dbUpdate.data_inicio = updatedCouple.dataInicio;
        if (updatedCouple.objetivo !== undefined) dbUpdate.objetivo = updatedCouple.objetivo;
        if (updatedCouple.status !== undefined) dbUpdate.status = updatedCouple.status;

        supabase!
          .from('couples')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editCouple:', error); });
      }
      return next;
    });
  };

  const removeCouple = (id: string) => {
    setCouples(prev => {
      const next = prev.filter(c => c.id !== id);
      localforage.setItem(getStorageKey('couples'), next).catch(err => console.error(err));

      if (isSupabaseConfigured && user) {
        supabase!
          .from('couples')
          .delete()
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase removeCouple:', error); });
      }
      return next;
    });
  };

  /* ── CoupleEgg CRUD (localforage only) ── */
  const addCoupleEgg = (egg: CoupleEgg) => {
    setCoupleEggs(prev => {
      const next = [...prev, egg];
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      return next;
    });
  };

  const editCoupleEgg = (id: string, updated: Partial<CoupleEgg>) => {
    setCoupleEggs(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...updated } : e);
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      return next;
    });
  };

  const removeCoupleEgg = (id: string) => {
    setCoupleEggs(prev => {
      const next = prev.filter(e => e.id !== id);
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      return next;
    });
  };

  const addEggLot = (lot: EggLot) => {
    setEggLots(prev => {
      const next = [...prev, lot];
      localforage.setItem(getStorageKey('egglots'), next).catch(err => console.error(err));
      
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
      localforage.setItem(getStorageKey('egglots'), next).catch(err => console.error(err));
      
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
      localforage.setItem(getStorageKey('meatlots'), next).catch(err => console.error(err));
      
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
      localforage.setItem(getStorageKey('meatlots'), next).catch(err => console.error(err));
      
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
      localforage.setItem(getStorageKey('settings'), next).catch(err => console.error(err));
      
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
      await localforage.setItem(getStorageKey('breeds'), backupData.breeds);
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
      await localforage.setItem(getStorageKey('birds'), backupData.birds);
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
      await localforage.setItem(getStorageKey('couples'), backupData.couples);
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
      await localforage.setItem(getStorageKey('egglots'), backupData.egglots);
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
      await localforage.setItem(getStorageKey('meatlots'), backupData.meatlots);
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
      await localforage.setItem(getStorageKey('settings'), backupData.settings);
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

  const openTutorial = () => {
    setIsTutorialOpen(true);
  };

  const closeTutorial = () => {
    setIsTutorialOpen(false);
    localforage.setItem(getStorageKey('has-seen-tutorial'), true).catch(console.error);
  };

  return (
    <AppContext.Provider value={{
      isReady,
      breeds, addBreed, editBreed,
      birds, addBird, editBird, removeBird,
      couples, addCouple, editCouple, removeCouple,
      coupleEggs, addCoupleEgg, editCoupleEgg, removeCoupleEgg,
      eggLots, addEggLot, editEggLot,
      meatLots, addMeatLot, editMeatLot,
      farmSettings, updateFarmSettings,
      importBackup,
      isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
      openAddBirdModal, openBirdProfile, closeModals,
      isTutorialOpen, openTutorial, closeTutorial,
      activeBreed, setActiveBreed
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
