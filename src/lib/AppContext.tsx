import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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
  origem?: 'Criatório' | 'Externo';
  paiId?: string;
  maeId?: string;
  isPaiExterno?: boolean;
  isMaeExterno?: boolean;
};

type AppContextType = {
  breeds: Breed[];
  addBreed: (breed: Breed) => void;
  editBreed: (id: string, updatedBreed: Partial<Breed>) => void;
  birds: Bird[];
  addBird: (bird: Bird) => void;
  editBird: (id: string, updatedBird: Partial<Bird>) => void;
  
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
  // Initialize state from localStorage or default to empty
  const [breeds, setBreeds] = useState<Breed[]>(() => {
    const saved = localStorage.getItem('@mura-manager:breeds');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [birds, setBirds] = useState<Bird[]>(() => {
    const saved = localStorage.getItem('@mura-manager:birds');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('@mura-manager:breeds', JSON.stringify(breeds));
  }, [breeds]);

  useEffect(() => {
    localStorage.setItem('@mura-manager:birds', JSON.stringify(birds));
  }, [birds]);

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
      breeds, addBreed, editBreed,
      birds, addBird, editBird,
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
