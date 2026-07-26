import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
export type Breed = {
  id: string;
  nome: string;
  origem: string;
  imagem: string;
  descricao: string;
  porte: string;
  posturaAnual: string;
  pesoMedio: string;
  temperamento: string;
  foco?: string;
};

export type Bird = {
  id: string;
  anilha: string;
  nome: string;
  sexo: 'Macho' | 'Fêmea';
  raca: string;
  baia: string;
  status: 'Reprodutor' | 'Matriz' | 'Frango(a)' | 'Pintinho' | 'Vendida' | 'Óbito' | 'Adulto' | 'Vendido' | 'Faleceu';
  imagem?: string;
  paiId?: string;
  maeId?: string;
  isPaiExterno?: boolean;
  isMaeExterno?: boolean;
  vacinas?: string;
  origem?: 'Criatório' | 'Externo';
};

export type DailyEggRecord = {
  id: string;
  data: string;
  quantidade: number;
  incubados?: number;
  vendidos?: number;
  observacao?: string;
};

export type EggRecord = DailyEggRecord; // alias for backwards compatibility

export type EggLot = {
  id: string;
  baia: string;
  avesIds: string[];
  femeasIds?: string[];
  qtdGalinhas: number;
  qtdFemeas?: number;
  dataInicio: string;
  expPosturaDiaria: number;
  expectativaDiaria?: number;
  precoOvoUnitario?: number;
  precoVendaPadrao?: number;
  custoProdPadrao?: number;
  raca?: string;
  observacao?: string;
  registros: DailyEggRecord[];
  ovosVendidosTotal?: number;
  ovosIncubadosTotal?: number;
  status?: 'Ativo' | 'Encerrado' | string;
};

export type IncubatorBatch = {
  id: string;
  nome: string;
  dataEntrada: string;
  previsaoEclosao: string;
  ovosSetados: number;
  ovosFerteis?: number;
  status: 'Em Incubação' | 'Eclodido' | 'Cancelado' | 'Concluído';
  temperatura?: string;
  umidade?: string;
  raca?: string;
  loteId?: string;
};

export type MeatLot = {
  id: string;
  baia: string;
  avesIds: string[];
  qtdAves: number;
  dataInicio: string;
  pesoMedioInicial: string;
  pesoMeta?: string;
  status: 'Crescimento' | 'Terminação' | 'Abatido';
  raca?: string;
  observacao?: string;
};

export type UserProfile = {
  nome: string;
  email: string;
  nomeCriatorio: string;
  fotoUrl?: string;
  telefone?: string;
};

// ─── Context Type ─────────────────────────────────────────────────────────────
type AppContextType = {
  breeds: Breed[];
  addBreed: (breed: Breed) => void;
  editBreed: (id: string, updatedBreed: Partial<Breed>) => void;

  birds: Bird[];
  addBird: (bird: Bird) => void;
  editBird: (id: string, updatedBird: Partial<Bird>) => void;

  eggLots: EggLot[];
  addEggLot: (lot: EggLot) => void;
  editEggLot: (id: string, updated: Partial<EggLot>) => void;

  meatLots: MeatLot[];
  addMeatLot: (lot: MeatLot) => void;
  editMeatLot: (id: string, updated: Partial<MeatLot>) => void;

  incubators: IncubatorBatch[];
  addIncubatorBatch: (batch: IncubatorBatch) => void;
  editIncubatorBatch: (id: string, updated: Partial<IncubatorBatch>) => void;

  // Profile & Setup
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  isProfileSetupOpen: boolean;
  openProfileSetup: () => void;
  closeProfileSetup: () => void;
  finishProfileSetup: () => void;

  // Modals state
  isAddBirdModalOpen: boolean;
  preSelectedBreedForNewBird: string;
  birdToEditId: string | null;
  selectedBirdProfileId: string | null;
  openAddBirdModal: (breedName?: string, birdId?: string) => void;
  openBirdProfile: (birdId: string) => void;
  closeModals: () => void;

  // Tour & Onboarding
  isTourOpen: boolean;
  isTrialModalOpen: boolean;
  startTour: () => void;
  closeTour: () => void;
  finishTour: () => void;
  closeTrialModal: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const AppContext = createContext<AppContextType | undefined>(undefined);

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [breeds, setBreeds] = useState<Breed[]>(() => loadStorage('@mura-manager:breeds', []));
  const [birds, setBirds] = useState<Bird[]>(() => loadStorage('@mura-manager:birds', []));
  const [eggLots, setEggLots] = useState<EggLot[]>(() => loadStorage('@mura-manager:eggLots', []));
  const [meatLots, setMeatLots] = useState<MeatLot[]>(() => loadStorage('@mura-manager:meatLots', []));
  const [incubators, setIncubators] = useState<IncubatorBatch[]>(() => loadStorage('@mura-manager:incubators', [
    {
      id: 'inc-demo-1',
      nome: 'Chocadeira 01 (Digital 120 Ovos)',
      dataEntrada: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
      previsaoEclosao: new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0],
      ovosSetados: 85,
      ovosFerteis: 78,
      status: 'Em Incubação',
      temperatura: '37.8 °C',
      umidade: '55%',
      raca: 'Índio Gigante'
    }
  ]));

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadStorage('@mura-manager:userProfile', {
    nome: 'João Paulo',
    email: '',
    nomeCriatorio: 'Criatório Galos Mura'
  }));
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);

  // Tour & Trial States (Linear Sequence: 1. Tour ➔ 2. Profile Setup ➔ 3. Trial 7 Days Gift)
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    return localStorage.getItem('@mura-manager:hasSeenTour_v3.0') !== 'true';
  });
  const [isTrialModalOpen, setIsTrialModalOpen] = useState<boolean>(false);

  // Persist to localStorage
  useEffect(() => { localStorage.setItem('@mura-manager:breeds', JSON.stringify(breeds)); }, [breeds]);
  useEffect(() => { localStorage.setItem('@mura-manager:birds', JSON.stringify(birds)); }, [birds]);
  useEffect(() => { localStorage.setItem('@mura-manager:eggLots', JSON.stringify(eggLots)); }, [eggLots]);
  useEffect(() => { localStorage.setItem('@mura-manager:meatLots', JSON.stringify(meatLots)); }, [meatLots]);
  useEffect(() => { localStorage.setItem('@mura-manager:incubators', JSON.stringify(incubators)); }, [incubators]);
  useEffect(() => { localStorage.setItem('@mura-manager:userProfile', JSON.stringify(userProfile)); }, [userProfile]);

  // Profile Helpers
  const updateUserProfile = (updated: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updated }));
  };
  const openProfileSetup = () => setIsProfileSetupOpen(true);
  const closeProfileSetup = () => setIsProfileSetupOpen(false);
  const finishProfileSetup = () => {
    setIsProfileSetupOpen(false);
    localStorage.setItem('@mura-manager:hasSetupProfile_v3.0', 'true');
    // Open trial gift modal sequentially after profile setup!
    if (localStorage.getItem('@mura-manager:hasSeenTrial_v3.0') !== 'true') {
      setIsTrialModalOpen(true);
    }
  };

  // ── Modals ──
  const [isAddBirdModalOpen, setIsAddBirdModalOpen] = useState(false);
  const [preSelectedBreedForNewBird, setPreSelectedBreedForNewBird] = useState('');
  const [birdToEditId, setBirdToEditId] = useState<string | null>(null);
  const [selectedBirdProfileId, setSelectedBirdProfileId] = useState<string | null>(null);

  // ── Tour & Trial Helpers ──
  const startTour = () => {
    setIsTrialModalOpen(false);
    setIsProfileSetupOpen(false);
    setIsTourOpen(true);
  };
  const closeTour = () => {
    setIsTourOpen(false);
    localStorage.setItem('@mura-manager:hasSeenTour_v3.0', 'true');
    // Open Profile Setup sequentially after tour!
    if (localStorage.getItem('@mura-manager:hasSetupProfile_v3.0') !== 'true') {
      setIsProfileSetupOpen(true);
    } else if (localStorage.getItem('@mura-manager:hasSeenTrial_v3.0') !== 'true') {
      setIsTrialModalOpen(true);
    }
  };
  const finishTour = () => {
    setIsTourOpen(false);
    localStorage.setItem('@mura-manager:hasSeenTour_v3.0', 'true');
    // Open Profile Setup sequentially after tour!
    if (localStorage.getItem('@mura-manager:hasSetupProfile_v3.0') !== 'true') {
      setIsProfileSetupOpen(true);
    } else if (localStorage.getItem('@mura-manager:hasSeenTrial_v3.0') !== 'true') {
      setIsTrialModalOpen(true);
    }
  };
  const closeTrialModal = () => {
    setIsTrialModalOpen(false);
    localStorage.setItem('@mura-manager:hasSeenTrial_v3.0', 'true');
  };

  // ── Breeds ──
  const addBreed = (breed: Breed) => setBreeds(prev => [...prev, breed]);
  const editBreed = (id: string, updatedBreed: Partial<Breed>) =>
    setBreeds(prev => prev.map(b => b.id === id ? { ...b, ...updatedBreed } : b));

  // ── Birds ──
  const addBird = (bird: Bird) => setBirds(prev => [...prev, bird]);
  const editBird = (id: string, updatedBird: Partial<Bird>) =>
    setBirds(prev => prev.map(b => b.id === id ? { ...b, ...updatedBird } : b));

  // ── Egg Lots ──
  const addEggLot = (lot: EggLot) => setEggLots(prev => [...prev, lot]);
  const editEggLot = (id: string, updated: Partial<EggLot>) =>
    setEggLots(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));

  // ── Meat Lots ──
  const addMeatLot = (lot: MeatLot) => setMeatLots(prev => [...prev, lot]);
  const editMeatLot = (id: string, updated: Partial<MeatLot>) =>
    setMeatLots(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));

  // ── Incubators ──
  const addIncubatorBatch = (batch: IncubatorBatch) => setIncubators(prev => [batch, ...prev]);
  const editIncubatorBatch = (id: string, updated: Partial<IncubatorBatch>) =>
    setIncubators(prev => prev.map(i => i.id === id ? { ...i, ...updated } : i));

  // ── Modal Helpers ──
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
      breeds, addBreed, editBreed,
      birds, addBird, editBird,
      eggLots, addEggLot, editEggLot,
      meatLots, addMeatLot, editMeatLot,
      incubators, addIncubatorBatch, editIncubatorBatch,
      userProfile, updateUserProfile, isProfileSetupOpen, openProfileSetup, closeProfileSetup, finishProfileSetup,
      isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
      openAddBirdModal, openBirdProfile, closeModals,
      isTourOpen, isTrialModalOpen, startTour, closeTour, finishTour, closeTrialModal,
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
