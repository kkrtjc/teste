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

  // Load data from localforage on mount
  useEffect(() => {
    async function loadData() {
      const storageItems = [
        { key: '@mura-manager:breeds', setter: setBreeds },
        { key: '@mura-manager:birds', setter: setBirds },
        { key: '@mura-manager:couples', setter: setCouples },
        { key: '@mura-manager:egglots', setter: setEggLots },
        { key: '@mura-manager:meatlots', setter: setMeatLots }
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

  // Save to localforage whenever state changes (only if loaded)
  useEffect(() => {
    if (isReady) localforage.setItem('@mura-manager:breeds', breeds);
  }, [breeds, isReady]);

  useEffect(() => {
    if (isReady) localforage.setItem('@mura-manager:birds', birds);
  }, [birds, isReady]);

  useEffect(() => {
    if (isReady) localforage.setItem('@mura-manager:couples', couples);
  }, [couples, isReady]);

  useEffect(() => {
    if (isReady) localforage.setItem('@mura-manager:egglots', eggLots);
  }, [eggLots, isReady]);

  useEffect(() => {
    if (isReady) localforage.setItem('@mura-manager:meatlots', meatLots);
  }, [meatLots, isReady]);

  // Modals
  const [isAddBirdModalOpen, setIsAddBirdModalOpen] = useState(false);
  const [preSelectedBreedForNewBird, setPreSelectedBreedForNewBird] = useState('');
  const [birdToEditId, setBirdToEditId] = useState<string | null>(null);
  const [selectedBirdProfileId, setSelectedBirdProfileId] = useState<string | null>(null);

  const addBreed = (breed: Breed) => setBreeds(prev => [...prev, breed]);
  const editBreed = (id: string, updatedBreed: Partial<Breed>) => {
    setBreeds(prev => prev.map(b => b.id === id ? { ...b, ...updatedBreed } : b));
  };

  const addBird = (bird: Bird) => setBirds(prev => [...prev, bird]);
  const editBird = (id: string, updatedBird: Partial<Bird>) => {
    setBirds(prev => prev.map(b => b.id === id ? { ...b, ...updatedBird } : b));
  };

  const addCouple = (couple: Couple) => setCouples(prev => [...prev, couple]);
  const editCouple = (id: string, updatedCouple: Partial<Couple>) => {
    setCouples(prev => prev.map(c => c.id === id ? { ...c, ...updatedCouple } : c));
  };

  const addEggLot = (lot: EggLot) => setEggLots(prev => [...prev, lot]);
  const editEggLot = (id: string, updatedLot: Partial<EggLot>) => {
    setEggLots(prev => prev.map(l => l.id === id ? { ...l, ...updatedLot } : l));
  };

  const addMeatLot = (lot: MeatLot) => setMeatLots(prev => [...prev, lot]);
  const editMeatLot = (id: string, updatedLot: Partial<MeatLot>) => {
    setMeatLots(prev => prev.map(l => l.id === id ? { ...l, ...updatedLot } : l));
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
