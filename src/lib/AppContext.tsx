import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import localforage from 'localforage';

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

  // Load data from localforage on mount
  useEffect(() => {
    async function loadData() {
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
            // Migration fallback: se não tem no IndexedDB, puxa do localStorage antigo
            const oldData = localStorage.getItem(item.key);
            if (oldData) {
              data = JSON.parse(oldData);
              await localforage.setItem(item.key, data);
              localStorage.removeItem(item.key); // Limpa o velho limite de 5MB
            }
          }
          
          if (data) {
            item.setter(data);
          }
        } catch (error) {
          console.error(`Erro ao carregar ${item.key}:`, error);
        }
      }
      setIsReady(true);
    }
    
    loadData();
  }, []);

  // Modals
  const [isAddBirdModalOpen, setIsAddBirdModalOpen] = useState(false);
  const [preSelectedBreedForNewBird, setPreSelectedBreedForNewBird] = useState('');
  const [birdToEditId, setBirdToEditId] = useState<string | null>(null);
  const [selectedBirdProfileId, setSelectedBirdProfileId] = useState<string | null>(null);

  const addBreed = (breed: Breed) => {
    setBreeds(prev => {
      const next = [...prev, breed];
      localforage.setItem('@mura-manager:breeds', next).catch(err => console.error(err));
      return next;
    });
  };
  const editBreed = (id: string, updatedBreed: Partial<Breed>) => {
    setBreeds(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updatedBreed } : b);
      localforage.setItem('@mura-manager:breeds', next).catch(err => console.error(err));
      return next;
    });
  };

  const addBird = (bird: Bird) => {
    setBirds(prev => {
      const next = [...prev, bird];
      localforage.setItem('@mura-manager:birds', next).catch(err => console.error(err));
      return next;
    });
  };
  const editBird = (id: string, updatedBird: Partial<Bird>) => {
    setBirds(prev => {
      const next = prev.map(b => b.id === id ? { ...b, ...updatedBird } : b);
      localforage.setItem('@mura-manager:birds', next).catch(err => console.error(err));
      return next;
    });
  };

  const addCouple = (couple: Couple) => {
    setCouples(prev => {
      const next = [...prev, couple];
      localforage.setItem('@mura-manager:couples', next).catch(err => console.error(err));
      return next;
    });
  };
  const editCouple = (id: string, updatedCouple: Partial<Couple>) => {
    setCouples(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...updatedCouple } : c);
      localforage.setItem('@mura-manager:couples', next).catch(err => console.error(err));
      return next;
    });
  };

  const addEggLot = (lot: EggLot) => {
    setEggLots(prev => {
      const next = [...prev, lot];
      localforage.setItem('@mura-manager:egglots', next).catch(err => console.error(err));
      return next;
    });
  };
  const editEggLot = (id: string, updatedLot: Partial<EggLot>) => {
    setEggLots(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updatedLot } : l);
      localforage.setItem('@mura-manager:egglots', next).catch(err => console.error(err));
      return next;
    });
  };

  const addMeatLot = (lot: MeatLot) => {
    setMeatLots(prev => {
      const next = [...prev, lot];
      localforage.setItem('@mura-manager:meatlots', next).catch(err => console.error(err));
      return next;
    });
  };
  const editMeatLot = (id: string, updatedLot: Partial<MeatLot>) => {
    setMeatLots(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updatedLot } : l);
      localforage.setItem('@mura-manager:meatlots', next).catch(err => console.error(err));
      return next;
    });
  };

  const updateFarmSettings = (settings: Partial<FarmSettings>) => {
    setFarmSettings(prev => {
      const next = { ...prev, ...settings };
      localforage.setItem('@mura-manager:settings', next).catch(err => console.error(err));
      return next;
    });
  };

  const importBackup = async (backupData: any) => {
    if (!backupData) return;
    if (backupData.breeds) {
      setBreeds(backupData.breeds);
      await localforage.setItem('@mura-manager:breeds', backupData.breeds);
    }
    if (backupData.birds) {
      setBirds(backupData.birds);
      await localforage.setItem('@mura-manager:birds', backupData.birds);
    }
    if (backupData.couples) {
      setCouples(backupData.couples);
      await localforage.setItem('@mura-manager:couples', backupData.couples);
    }
    if (backupData.egglots) {
      setEggLots(backupData.egglots);
      await localforage.setItem('@mura-manager:egglots', backupData.egglots);
    }
    if (backupData.meatlots) {
      setMeatLots(backupData.meatlots);
      await localforage.setItem('@mura-manager:meatlots', backupData.meatlots);
    }
    if (backupData.settings) {
      setFarmSettings(backupData.settings);
      await localforage.setItem('@mura-manager:settings', backupData.settings);
    }
  };

  const openAddBirdModal = (breedName?: string, birdId?: string) => {
    setPreSelectedBreedForNewBird(breedName || '');
    setBirdToEditId(birdId || null);
    setIsAddBirdModalOpen(true);
    setSelectedBirdProfileId(null); // Fecha o perfil se for editar
  };

  const openBirdProfile = (birdId: string) => {
    setSelectedBirdProfileId(birdId);
    setIsAddBirdModalOpen(false); // Fecha a edição se abrir o perfil
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
