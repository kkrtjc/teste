import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import localforage from 'localforage';
import { useAuth, isUserAdmin, ADMIN_CANONICAL_ID, type SubscriptionPlan } from './AuthContext';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { useHaptics } from '../hooks/useHaptics';
import { enqueueMutation, processSyncQueue } from './syncQueue';
import { deepScanAllStorage } from './dataRecovery';

export type Breed = {
  id: string;
  nome: string;
  foco: string;
  descricao: string;
  totalAves: number;
  imagem?: string;
  tempoCrescimento?: number;
  pesoMedio?: string;
  ganhoGramasDia?: number;     // Ganho médio de peso diário em gramas (g/dia)
  conversaoAlimentar?: number; // Taxa de conversão alimentar (ex: 2.2)
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
  observacoes?: string;
  inVitrine?: boolean;
  vitrinePrice?: string;
  vitrineStatus?: 'Disponível' | 'Reservado' | 'Vendido' | 'Destaque';
  valorEstimado?: number | string;
  valorVenda?: number | string;
  dataVenda?: string;
  compradorNome?: string;
  compradorContato?: string;
  motivoBaixa?: string;
  dataCadastro?: string;
};

export type VitrineMeta = {
  inVitrine: boolean;
  vitrinePrice?: string;
  vitrineStatus?: 'Disponível' | 'Reservado' | 'Vendido' | 'Destaque';
};

export function parseBirdVitrine(rawObservacoes?: string): {
  cleanObservacoes: string;
  inVitrine: boolean;
  vitrinePrice: string;
  vitrineStatus: 'Disponível' | 'Reservado' | 'Vendido' | 'Destaque';
} {
  if (!rawObservacoes) {
    return { cleanObservacoes: '', inVitrine: false, vitrinePrice: '', vitrineStatus: 'Disponível' };
  }
  const match = rawObservacoes.match(/\[\[VITRINE:(.*?)\]\]/);
  if (!match) {
    return { cleanObservacoes: rawObservacoes, inVitrine: false, vitrinePrice: '', vitrineStatus: 'Disponível' };
  }
  try {
    const meta = JSON.parse(match[1]);
    const cleanObservacoes = rawObservacoes.replace(/\n?\[\[VITRINE:.*?\]\]/g, '').trim();
    return {
      cleanObservacoes,
      inVitrine: Boolean(meta.inVitrine),
      vitrinePrice: meta.vitrinePrice || meta.price || '',
      vitrineStatus: meta.vitrineStatus || meta.status || 'Disponível'
    };
  } catch {
    return { cleanObservacoes: rawObservacoes, inVitrine: false, vitrinePrice: '', vitrineStatus: 'Disponível' };
  }
}

export function formatBirdObservacoesWithVitrine(
  cleanObservacoes: string | undefined,
  inVitrine: boolean,
  vitrinePrice?: string,
  vitrineStatus?: string
): string {
  const base = (cleanObservacoes || '').replace(/\n?\[\[VITRINE:.*?\]\]/g, '').trim();
  if (!inVitrine) {
    return base;
  }
  const meta: VitrineMeta = {
    inVitrine: true,
    vitrinePrice: vitrinePrice || '',
    vitrineStatus: (vitrineStatus as any) || 'Disponível'
  };
  return base ? `${base}\n[[VITRINE:${JSON.stringify(meta)}]]` : `[[VITRINE:${JSON.stringify(meta)}]]`;
}

export type IncubationLot = {
  id: string;
  coupleId: string;
  numeroLote: string;
  quantidadeOvos: number;
  dataInicio: string;
  baia: string;
  ovoscopia1Realizada?: boolean;
  ovoscopia2Realizada?: boolean;
  ovosDescartados1?: number;
  ovosDescartados2?: number;
  eclodido?: boolean;
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

export type EggDailyRecord = {
  id: string;
  data: string;           // YYYY-MM-DD
  coletados: number;
  vendidos: number;
  perdidos: number;
  incubados?: number;     // quantidade enviada para incubação / choco
  precoVenda: number;     // R$ por dúzia
  custoProd: number;      // R$ por ovo
  observacao?: string;
};

export type LotMovementRecord = {
  id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  motivo: string;
  data: string;           // YYYY-MM-DD
  observacao?: string;
};

export type LotNote = {
  id: string;
  data: string;           // YYYY-MM-DD
  texto: string;
};

export type EggLot = {
  id: string;
  baia: string;
  femeasIds: string[];
  qtdFemeas?: number;          // quantidade manual (quando não se vincula aves individuais)
  expectativaDiaria?: number;
  dataInicio: string;
  status: 'Ativo' | 'Encerrado';
  raca?: string;
  precoVendaPadrao?: number;   // R$ por dúzia — padrão para aba Ovos
  custoProdPadrao?: number;    // R$ por ovo — padrão para aba Ovos
  observacao?: string;
  observacoesAdicionais?: LotNote[];
  registros?: EggDailyRecord[];
  movimentacoes?: LotMovementRecord[];
};

export type WeightRecord = {
  id: string;
  data: string;           // YYYY-MM-DD
  pesoMedioG: number;     // peso médio em gramas (ex: 2450)
  observacao?: string;
  avesPesadas?: number;   // quantidade de aves pesadas na amostra (mín. 5)
};

export type MeatLot = {
  id: string;
  baia: string;
  avesIds: string[];
  qtdAves?: number;            // quantidade manual (quando não se vincula aves individuais)
  dataInicio: string;
  idadeInicialDias?: number;   // Idade das aves que compõem o lote em dias na data de início (engorda)
  dataNascimento?: string;     // Data de nascimento (para lotes de pintinhos)
  origem?: 'Criatório' | 'Externo'; // Origem dos pintinhos
  origemPais?: 'criatorio' | 'externo' | 'nenhum';
  paiId?: string;
  maeId?: string;
  paiNome?: string;
  maeNome?: string;
  paisTexto?: string;
  pesoMedioInicial?: string;
  pesoMeta?: string;           // peso alvo de abate
  status: 'Crescimento' | 'Terminação' | 'Abatido';
  raca?: string;
  racaId?: string;
  observacao?: string;
  observacoesAdicionais?: LotNote[];
  vacinas?: string;            // Vacinas aplicadas ou previstas no lote
  movimentacoes?: LotMovementRecord[];
  ganhoGramasDia?: number;     // Ganho diário estimado em g/dia (ex: 35g/dia com base na ração do protocolo/raça)
  consumoRacaoAve?: number;    // Consumo de ração g/ave/dia (ex: 130g)
  pesagens?: WeightRecord[];   // Registro histórico de pesagens periódicas
};

export type FarmSettings = {
  name: string;
  photo: string;
  email: string;
  phone: string;
  responsible?: string;
  city?: string;
  state?: string;
  logo?: string;
  whatsapp?: string;
};

/**
 * Empacota metadados completos do lote de postura dentro do campo JSONB 'registros' do Supabase.
 * Isso garante que observações, observações adicionais, movimentações, raça e custos sejam 100% persistidos na nuvem sem erro de coluna.
 */
export function packageEggLotRegistros(lot: Partial<EggLot>): any[] {
  const cleanRecords = (lot.registros || []).filter((r: any) => !r?.__isLotMeta);
  const metaEntry = {
    __isLotMeta: true,
    observacao: lot.observacao || '',
    observacoesAdicionais: Array.isArray(lot.observacoesAdicionais) ? lot.observacoesAdicionais : [],
    movimentacoes: Array.isArray(lot.movimentacoes) ? lot.movimentacoes : [],
    raca: lot.raca || '',
    qtdFemeas: lot.qtdFemeas || 0,
    precoVendaPadrao: lot.precoVendaPadrao,
    custoProdPadrao: lot.custoProdPadrao
  };
  return [...cleanRecords, metaEntry];
}

export function unpackEggLotRegistros(rawRegistros: any[]): {
  registros: EggDailyRecord[];
  meta?: Partial<EggLot>;
} {
  if (!Array.isArray(rawRegistros)) return { registros: [] };
  const metaEntry = rawRegistros.find((r: any) => r && r.__isLotMeta);
  const registros: EggDailyRecord[] = rawRegistros.filter((r: any) => r && !r.__isLotMeta);
  return {
    registros,
    meta: metaEntry ? {
      observacao: metaEntry.observacao || '',
      observacoesAdicionais: Array.isArray(metaEntry.observacoesAdicionais) ? metaEntry.observacoesAdicionais : [],
      movimentacoes: Array.isArray(metaEntry.movimentacoes) ? metaEntry.movimentacoes : [],
      raca: metaEntry.raca || '',
      qtdFemeas: metaEntry.qtdFemeas,
      precoVendaPadrao: metaEntry.precoVendaPadrao,
      custoProdPadrao: metaEntry.custoProdPadrao
    } : undefined
  };
}

/**
 * Empacota metadados completos do lote de corte (engorda/pintinhos) dentro do campo de texto 'peso_medio_inicial' do Supabase.
 * Isso garante que observações, observações adicionais, movimentações, vacinas e pesagens sejam 100% persistidos na nuvem sem erro de coluna.
 */
export function packageMeatLotWeight(lot: Partial<MeatLot>): string {
  const baseWeight = (lot.pesoMedioInicial || '').replace(/\n?\[\[LOT_META:.*?\]\]/gs, '').trim();
  const meta = {
    observacao: lot.observacao || '',
    observacoesAdicionais: Array.isArray(lot.observacoesAdicionais) ? lot.observacoesAdicionais : [],
    movimentacoes: Array.isArray(lot.movimentacoes) ? lot.movimentacoes : [],
    vacinas: lot.vacinas || '',
    raca: lot.raca || '',
    racaId: lot.racaId,
    idadeInicialDias: lot.idadeInicialDias,
    dataNascimento: lot.dataNascimento,
    origem: lot.origem,
    origemPais: lot.origemPais,
    paiId: lot.paiId,
    maeId: lot.maeId,
    paiNome: lot.paiNome,
    maeNome: lot.maeNome,
    paisTexto: lot.paisTexto,
    pesoMeta: lot.pesoMeta,
    qtdAves: lot.qtdAves,
    ganhoGramasDia: lot.ganhoGramasDia,
    consumoRacaoAve: lot.consumoRacaoAve,
    pesagens: Array.isArray(lot.pesagens) ? lot.pesagens : []
  };
  return `${baseWeight}\n[[LOT_META:${JSON.stringify(meta)}]]`.trim();
}

export function unpackMeatLotWeight(rawWeight?: string | null): {
  cleanWeight: string;
  meta?: Partial<MeatLot>;
} {
  if (!rawWeight) return { cleanWeight: '' };
  const match = rawWeight.match(/\[\[LOT_META:(.*?)\]\]/s);
  if (!match) return { cleanWeight: rawWeight };
  try {
    const meta = JSON.parse(match[1]);
    const cleanWeight = rawWeight.replace(/\n?\[\[LOT_META:.*?\]\]/gs, '').trim();
    return {
      cleanWeight,
      meta: {
        observacao: meta.observacao || '',
        observacoesAdicionais: Array.isArray(meta.observacoesAdicionais) ? meta.observacoesAdicionais : [],
        movimentacoes: Array.isArray(meta.movimentacoes) ? meta.movimentacoes : [],
        vacinas: meta.vacinas,
        raca: meta.raca,
        racaId: meta.racaId,
        idadeInicialDias: meta.idadeInicialDias,
        dataNascimento: meta.dataNascimento,
        origem: meta.origem,
        origemPais: meta.origemPais,
        paiId: meta.paiId,
        maeId: meta.maeId,
        paiNome: meta.paiNome,
        maeNome: meta.maeNome,
        paisTexto: meta.paisTexto,
        pesoMeta: meta.pesoMeta,
        qtdAves: meta.qtdAves,
        ganhoGramasDia: meta.ganhoGramasDia,
        consumoRacaoAve: meta.consumoRacaoAve,
        pesagens: Array.isArray(meta.pesagens) ? meta.pesagens : []
      }
    };
  } catch {
    return { cleanWeight: rawWeight };
  }
}

type AppContextType = {
  isReady: boolean;
  isInitialSyncDone: boolean;
  breeds: Breed[];
  addBreed: (breed: Breed) => void;
  editBreed: (id: string, updatedBreed: Partial<Breed>) => void;
  removeBreed: (id: string) => void;
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
  removeEggLot: (id: string) => void;
  meatLots: MeatLot[];
  addMeatLot: (lot: MeatLot) => void;
  editMeatLot: (id: string, updatedLot: Partial<MeatLot>) => void;
  removeMeatLot: (id: string) => void;
  
  farmSettings: FarmSettings;
  setFarmSettings: (settings: FarmSettings) => void;
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

  incubationLots: IncubationLot[];
  addIncubationLot: (lot: IncubationLot) => void;
  editIncubationLot: (id: string, updatedLot: Partial<IncubationLot>) => void;
  removeIncubationLot: (id: string) => void;

  // Toast Notifications
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;

  // Recuperação Profunda de Aves e Armazenamento
  recoverAllBirds: () => Promise<{ count: number; birds: Bird[]; report: string }>;

  // Vitrine Digital
  isVitrineUnlocked: boolean;
  vitrineBirds: Bird[];
  vitrineConfig: Record<string, { inVitrine: boolean; vitrinePrice?: string; vitrineStatus?: any }>;
  toggleBirdVitrine: (birdId: string, inVitrine: boolean, price?: string, status?: 'Disponível' | 'Reservado' | 'Vendido' | 'Destaque') => void;

  // Onboarding & Profile Setup Optional Helpers
  isTourOpen?: boolean;
  isProfileSetupOpen?: boolean;
  openProfileSetup?: () => void;
  closeProfileSetup?: () => void;
  finishProfileSetup?: () => void;
  startTour?: () => void;
  closeTour?: () => void;
  finishTour?: () => void;

  // Limite de Compartilhamento no Período de Teste & Upgrade Modal
  trialSharedBirdIds: string[];
  trialSharesCount: number;
  maxTrialShares: number;
  canShareBird: (birdId: string) => boolean;
  registerBirdShare: (birdId: string) => Promise<boolean>;
  isUpgradeModalOpen: boolean;
  selectedUpgradePlan: SubscriptionPlan;
  openUpgradeModal: (initialPlan?: SubscriptionPlan) => void;
  closeUpgradeModal: () => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const DEFAULT_BREEDS: Breed[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567001',
    nome: 'Mura',
    foco: 'Ornamental',
    descricao: 'Raça ornamental e de combate, muito valorizada por sua postura imponente, força e temperamento.',
    imagem: '/breeds/mura.jpg',
    totalAves: 0,
    tempoCrescimento: 180,
    pesoMedio: '3.5 kg',
    ganhoGramasDia: 25,
    conversaoAlimentar: 2.8
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567002',
    nome: 'Brahma',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Raça de grande porte, dócil, excelente para carne e postura de ovos grandes no inverno.',
    imagem: '/breeds/brahma.jpg',
    totalAves: 0,
    tempoCrescimento: 210,
    pesoMedio: '4.5 kg',
    ganhoGramasDia: 35,
    conversaoAlimentar: 2.5
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567003',
    nome: 'Sedosa',
    foco: 'Ornamental',
    descricao: 'Famosa por sua plumagem incrivelmente macia e felpuda que parece cabelo ou lã. Excelentes mães.',
    imagem: '/breeds/sedosa.jpg',
    totalAves: 0,
    tempoCrescimento: 150,
    pesoMedio: '1.2 kg',
    ganhoGramasDia: 15,
    conversaoAlimentar: 3.2
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567004',
    nome: 'Caipira',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galinha rústica de quintal, perfeitamente adaptada a sistemas livres, com carne saborosa e ovos caipiras.',
    imagem: '/breeds/caipira.jpg',
    totalAves: 0,
    tempoCrescimento: 120,
    pesoMedio: '2.8 kg',
    ganhoGramasDia: 28,
    conversaoAlimentar: 2.7
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567005',
    nome: 'GSB',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galo Sertanejo Balão (GSB). Gigante de corpo arredondado, cauda curta e peito muito largo.',
    imagem: '/breeds/gsb.jpg',
    totalAves: 0,
    tempoCrescimento: 240,
    pesoMedio: '5.5 kg',
    ganhoGramasDia: 40,
    conversaoAlimentar: 2.3
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567006',
    nome: 'Indio gigante',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galo de altura excepcional, pernas longas e corpo ereto. Orgulho do melhoramento genético nacional.',
    imagem: '/breeds/indio_gigante.jpg',
    totalAves: 0,
    tempoCrescimento: 210,
    pesoMedio: '5.0 kg',
    ganhoGramasDia: 42,
    conversaoAlimentar: 2.4
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567007',
    nome: 'Polaco',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galinha de pescoço pelado (Transilvânia / Polaca), muito rústica, dócil e produtiva.',
    imagem: '/breeds/polaco.jpg',
    totalAves: 0,
    tempoCrescimento: 150,
    pesoMedio: '3.0 kg',
    ganhoGramasDia: 30,
    conversaoAlimentar: 2.6
  }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, cpf, isAdmin: isAuthAdmin, trialInfo } = useAuth();
  const isCurrentUserAdmin = Boolean(
    isAuthAdmin ||
    (user && isUserAdmin(user.email)) ||
    (user && isUserAdmin(user.id)) ||
    isUserAdmin(cpf)
  );

  // ── Limite de Compartilhamento no Período de Teste (Máximo 5 fichas) ──
  const [trialSharedBirdIds, setTrialSharedBirdIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadTrialShares() {
      const userKey = user?.id || cpf || 'local';
      try {
        const stored = await localforage.getItem<string[]>(`@mura-manager:trial-shared-birds:${userKey}`);
        if (isMounted && stored && Array.isArray(stored)) {
          setTrialSharedBirdIds(stored);
        }
      } catch (err) {
        console.error('Erro ao carregar trial-shared-birds:', err);
      }
    }
    loadTrialShares();
    return () => { isMounted = false; };
  }, [user?.id, cpf]);

  const maxTrialShares = 5;
  const trialSharesCount = trialSharedBirdIds.length;

  const canShareBird = useCallback((birdId: string): boolean => {
    if (isCurrentUserAdmin || trialInfo?.isPaid || !trialInfo?.isTrial) return true;
    if (trialSharedBirdIds.includes(birdId)) return true;
    return trialSharedBirdIds.length < maxTrialShares;
  }, [isCurrentUserAdmin, trialInfo?.isPaid, trialInfo?.isTrial, trialSharedBirdIds, maxTrialShares]);

  const registerBirdShare = useCallback(async (birdId: string): Promise<boolean> => {
    if (isCurrentUserAdmin || trialInfo?.isPaid || !trialInfo?.isTrial) return true;
    if (trialSharedBirdIds.includes(birdId)) return true;
    if (trialSharedBirdIds.length >= maxTrialShares) return false;

    const updated = [...trialSharedBirdIds, birdId];
    setTrialSharedBirdIds(updated);
    const userKey = user?.id || cpf || 'local';
    try {
      await localforage.setItem(`@mura-manager:trial-shared-birds:${userKey}`, updated);
    } catch (err) {
      console.error('Erro ao salvar trial-shared-birds:', err);
    }
    return true;
  }, [isCurrentUserAdmin, trialInfo?.isPaid, trialInfo?.isTrial, trialSharedBirdIds, maxTrialShares, user?.id, cpf]);

  // ── Controle do Modal Global de Upgrade (3 Planos) ──
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<SubscriptionPlan>('yearly');

  const openUpgradeModal = useCallback((initialPlan: SubscriptionPlan = 'yearly') => {
    setSelectedUpgradePlan(initialPlan);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
  }, []);

  const getStorageKey = useCallback((keyName: string) => {
    if (isCurrentUserAdmin) {
      return `@mura-manager:admin:${keyName}`;
    }
    if (!user) return `@mura-manager:guest:${keyName}`;
    return `@mura-manager:${user.id}:${keyName}`;
  }, [user, isCurrentUserAdmin]);

  const [isReady, setIsReady] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [vitrineConfig, setVitrineConfig] = useState<Record<string, { inVitrine: boolean; vitrinePrice?: string; vitrineStatus?: any }>>(() => {
    try {
      const raw = localStorage.getItem('@mura-manager:vitrine-config');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const recentVitrineChangesRef = useRef<Map<string, { inVitrine: boolean; vitrinePrice?: string; vitrineStatus?: any; timestamp: number }>>(new Map());
  const [couples, setCouples] = useState<Couple[]>([]);
  const [coupleEggs, setCoupleEggs] = useState<CoupleEgg[]>([]);
  const [eggLots, setEggLots] = useState<EggLot[]>([]);
  const [meatLots, setMeatLots] = useState<MeatLot[]>([]);
  const eggLotsRef = useRef<EggLot[]>([]);
  const meatLotsRef = useRef<MeatLot[]>([]);
  useEffect(() => { eggLotsRef.current = eggLots; }, [eggLots]);
  useEffect(() => { meatLotsRef.current = meatLots; }, [meatLots]);
  const [incubationLots, setIncubationLots] = useState<IncubationLot[]>([]);
  
  const [farmSettings, setFarmSettings] = useState<FarmSettings>({
    name: '',
    photo: '',
    email: '',
    phone: ''
  });

  // ── Gestão de Tombstones para Exclusão Permanente (evita ressurreição de aves deletadas) ──
  // Lê sincronamente do localStorage (apenas como fallback rápido no render inicial)
  const getDeletedBirdIds = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem('@mura-manager:deleted-bird-ids');
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  }, []);

  // Versão assíncrona: lê do IndexedDB (fonte primária) com fallback para localStorage
  const getDeletedBirdIdsAsync = useCallback(async (): Promise<Set<string>> => {
    try {
      const fromIDB = await localforage.getItem<string[]>('@mura-manager:deleted-bird-ids');
      if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
        // Sincroniza de volta pro localStorage para que o getter síncrono fique atualizado
        try { localStorage.setItem('@mura-manager:deleted-bird-ids', JSON.stringify(fromIDB)); } catch {}
        return new Set(fromIDB);
      }
    } catch {}
    // Fallback: lê do localStorage
    try {
      const raw = localStorage.getItem('@mura-manager:deleted-bird-ids');
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  }, []);

  const recordDeletedBirdId = useCallback((id: string) => {
    try {
      const set = getDeletedBirdIds();
      set.add(id);
      const arr = Array.from(set).slice(-1000);
      // IndexedDB é a fonte primária (iOS não limpa automaticamente)
      localforage.setItem('@mura-manager:deleted-bird-ids', arr).catch(() => {});
      // localStorage como backup síncrono imediato
      try { localStorage.setItem('@mura-manager:deleted-bird-ids', JSON.stringify(arr)); } catch {}
    } catch {}
  }, [getDeletedBirdIds]);

  const clearDeletedBirdId = useCallback((id: string) => {
    try {
      const set = getDeletedBirdIds();
      if (set.has(id)) {
        set.delete(id);
        const arr = Array.from(set);
        localforage.setItem('@mura-manager:deleted-bird-ids', arr).catch(() => {});
        try { localStorage.setItem('@mura-manager:deleted-bird-ids', JSON.stringify(arr)); } catch {}
      }
    } catch {}
  }, [getDeletedBirdIds]);

  // ── Rastreamento de Aves Criadas Offline (evita re-upload indevido de aves excluídas em outros aparelhos) ──
  const getOfflinePendingBirdIds = useCallback(async (): Promise<Set<string>> => {
    try {
      const arr = await localforage.getItem<string[]>('@mura-manager:offline-pending-birds');
      if (arr && Array.isArray(arr)) return new Set(arr);
    } catch {}
    return new Set();
  }, []);

  const markPendingOfflineBird = useCallback(async (id: string) => {
    try {
      const set = await getOfflinePendingBirdIds();
      set.add(id);
      await localforage.setItem('@mura-manager:offline-pending-birds', Array.from(set));
    } catch {}
  }, [getOfflinePendingBirdIds]);

  const clearPendingOfflineBird = useCallback(async (id: string) => {
    try {
      const set = await getOfflinePendingBirdIds();
      if (set.has(id)) {
        set.delete(id);
        await localforage.setItem('@mura-manager:offline-pending-birds', Array.from(set));
      }
    } catch {}
  }, [getOfflinePendingBirdIds]);

  // ── Rastreamento de Exclusões Pendentes Offline ──
  const getPendingDeleteBirdIds = useCallback(async (): Promise<Set<string>> => {
    try {
      const arr = await localforage.getItem<string[]>('@mura-manager:pending-delete-birds');
      if (arr && Array.isArray(arr)) return new Set(arr);
    } catch {}
    return new Set();
  }, []);

  const markPendingDeleteBird = useCallback(async (id: string) => {
    try {
      const set = await getPendingDeleteBirdIds();
      set.add(id);
      await localforage.setItem('@mura-manager:pending-delete-birds', Array.from(set));
    } catch {}
  }, [getPendingDeleteBirdIds]);

  const clearPendingDeleteBird = useCallback(async (id: string) => {
    try {
      const set = await getPendingDeleteBirdIds();
      if (set.has(id)) {
        set.delete(id);
        await localforage.setItem('@mura-manager:pending-delete-birds', Array.from(set));
      }
    } catch {}
  }, [getPendingDeleteBirdIds]);

  // Canal Realtime Broadcast para sincronização ultrarrápida (<100ms) entre dispositivos conectados
  const realtimeBroadcastChannelRef = useRef<any>(null);
  const triggerRemoteSync = useCallback((entity: string = 'birds') => {
    try {
      if (realtimeBroadcastChannelRef.current) {
        realtimeBroadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'mura_sync',
          payload: { entity, timestamp: Date.now() }
        });
      }
    } catch (e) {
      console.warn('[Sync Broadcast] Falha ao enviar broadcast de alteração:', e);
    }
  }, []);

  // ── Migração de Dados de Convidado/Local para a Conta do Usuário ao Logar ──
  const migrateGuestAndLocalDataToUser = useCallback(async (targetUserId: string) => {
    if (!targetUserId) return;
    const suffixes = [
      'breeds',
      'birds',
      'couples',
      'couple-eggs',
      'egglots',
      'meatlots',
      'incubation-lots',
      'settings',
      'vitrine-config'
    ];

    for (const s of suffixes) {
      try {
        const userKey = `@mura-manager:${targetUserId}:${s}`;
        const guestKey = `@mura-manager:guest:${s}`;
        const legacyKey = `@mura-manager:${s}`;

        const [userVal, guestVal, legacyVal] = await Promise.all([
          localforage.getItem<any>(userKey),
          localforage.getItem<any>(guestKey),
          localforage.getItem<any>(legacyKey)
        ]);

        // Migração de coleções em array (aves, lotes, casais, etc.)
        if (Array.isArray(guestVal) && guestVal.length > 0) {
          const existingArr = Array.isArray(userVal) ? userVal : [];
          const existingIds = new Set(existingArr.map((x: any) => x?.id).filter(Boolean));
          const merged = [...existingArr];
          for (const item of guestVal) {
            if (item && item.id && !existingIds.has(item.id)) {
              merged.push(item);
              existingIds.add(item.id);
              if (s === 'birds') {
                await markPendingOfflineBird(item.id);
              }
            }
          }
          await localforage.setItem(userKey, merged);
        } else if (!userVal && guestVal) {
          await localforage.setItem(userKey, guestVal);
        }

        // Se ainda não tinha nada no userKey mas tem dados legados (@mura-manager:${s})
        const currUserVal = await localforage.getItem<any>(userKey);
        if ((!currUserVal || (Array.isArray(currUserVal) && currUserVal.length === 0)) && Array.isArray(legacyVal) && legacyVal.length > 0) {
          const existingArr = Array.isArray(currUserVal) ? currUserVal : [];
          const existingIds = new Set(existingArr.map((x: any) => x?.id).filter(Boolean));
          const merged = [...existingArr];
          for (const item of legacyVal) {
            if (item && item.id && !existingIds.has(item.id)) {
              merged.push(item);
              existingIds.add(item.id);
              if (s === 'birds') {
                await markPendingOfflineBird(item.id);
              }
            }
          }
          await localforage.setItem(userKey, merged);
        } else if (!currUserVal && legacyVal) {
          await localforage.setItem(userKey, legacyVal);
        }
      } catch (err) {
        console.warn(`[Migrate] Erro ao migrar ${s} para o usuário:`, err);
      }
    }
  }, [markPendingOfflineBird]);

  // Helper para carregar o cache offline (usado como fallback quando offline ou visitante)
  const loadFromLocalForage = useCallback(async () => {
    // Usa o getter assíncrono para ler tombstones do IndexedDB (fonte primária no iOS)
    const deletedBirdIds = await getDeletedBirdIdsAsync();
    let loadedBirdsCount = 0;

    const storageItems = [
      {
        suffix: 'breeds',
        setter: (d: any) => {
          let currentBreeds = Array.isArray(d) ? (d as Breed[]) : [];
          const seen = new Set<string>();
          const deduped: Breed[] = [];
          for (const b of currentBreeds) {
            const key = (b.nome || '').trim().toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              deduped.push(b);
            }
          }
          for (const db of DEFAULT_BREEDS) {
            const key = db.nome.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(db);
            }
          }
          setBreeds(deduped);
        }
      },
      {
        suffix: 'birds',
        setter: (d: any) => {
          const list = Array.isArray(d) ? (d as Bird[]) : [];
          const filtered = list.filter(b => b && b.id && !deletedBirdIds.has(b.id));
          loadedBirdsCount = filtered.length;
          const mapped = filtered.map(b => {
            const parsed = parseBirdVitrine(b.observacoes);
            const inVit = b.inVitrine !== undefined ? b.inVitrine : parsed.inVitrine;
            return {
              ...b,
              inVitrine: inVit,
              vitrinePrice: b.vitrinePrice || parsed.vitrinePrice || '',
              vitrineStatus: b.vitrineStatus || parsed.vitrineStatus || 'Disponível',
              observacoes: parsed.cleanObservacoes
            };
          });
          setBirds(mapped);
          // Sincroniza vitrineConfig em paralelo (apenas aves ativas na vitrine)
          const vMap: Record<string, any> = {};
          mapped.forEach(b => {
            if (b.inVitrine) {
              vMap[b.id] = { inVitrine: true, vitrinePrice: b.vitrinePrice, vitrineStatus: b.vitrineStatus };
            }
          });
          setVitrineConfig(vMap);
        }
      },
      {
        suffix: 'couples',
        setter: (d: any) => {
          const list = Array.isArray(d) ? d : [];
          const migrated = list.map((c: any) => ({
            ...c,
            femeaIds: c.femeaIds || (c.femeaId ? [c.femeaId] : []),
          }));
          setCouples(migrated);
        }
      },
      { suffix: 'couple-eggs',     setter: (d: any) => setCoupleEggs(Array.isArray(d) ? d : []) },
      { suffix: 'egglots',         setter: (d: any) => setEggLots(Array.isArray(d) ? d : []) },
      { suffix: 'meatlots',        setter: (d: any) => setMeatLots(Array.isArray(d) ? d : []) },
      { suffix: 'incubation-lots', setter: (d: any) => setIncubationLots(Array.isArray(d) ? d : []) },
      { suffix: 'settings',        setter: (d: any) => { if (d) setFarmSettings(d); } },
      {
        suffix: 'vitrine-config',
        setter: (d: any) => {
          if (d && typeof d === 'object') {
            setVitrineConfig(d);
            try {
              localStorage.setItem('@mura-manager:vitrine-config', JSON.stringify(d));
            } catch {}
          }
        }
      }
    ];

    await Promise.all(storageItems.map(async (item) => {
      try {
        const userKey = getStorageKey(item.suffix);
        let data: any = await localforage.getItem(userKey);

        if (isCurrentUserAdmin && !data) {
          data = await localforage.getItem(`@mura-manager:admin:${item.suffix}`);
        }
        if (!data) {
          data = await localforage.getItem(`@mura-manager:guest:${item.suffix}`);
        }
        if (!data) {
          data = await localforage.getItem(`@mura-manager:${item.suffix}`);
        }

        if (data !== null && data !== undefined) {
          item.setter(data);
        }
      } catch (error) {
        console.error(`Erro ao carregar do localforage (${item.suffix}):`, error);
      }
    }));
    return loadedBirdsCount;
  }, [isCurrentUserAdmin, getStorageKey, getDeletedBirdIdsAsync]);

  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const realtimeDebounceTimerRef = useRef<any>(null);

  // Função principal de sincronização com o Supabase com mesclagem defensiva de dados
  const syncWithSupabaseBackground = useCallback(async (force = false) => {
    if (!isSupabaseConfigured || !user) return;
    const now = Date.now();
    if (isSyncingRef.current) return;
    if (!force && now - lastSyncTimeRef.current < 2500) return;

    isSyncingRef.current = true;
    lastSyncTimeRef.current = now;
    try {
      const isAdmin = isCurrentUserAdmin || isUserAdmin(user.email) || isUserAdmin(user.id);
      const targetUserId = isAdmin ? ADMIN_CANONICAL_ID : user.id;

      // Validação estrita de formato UUID (PostgreSQL rejeita com erro 22P02 se não for UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const candidateAdminIds = [
        ADMIN_CANONICAL_ID,
        user.id,
        '99591207-6ed9-4260-8bdb-1a507b67f9af',
        '5f321f02-a40c-48c4-81be-87e8f835d981'
      ];
      const adminUserIds = Array.from(new Set(candidateAdminIds)).filter(id => typeof id === 'string' && uuidRegex.test(id));

      const [
        resBreeds,
        resBirds,
        resCouples,
        resEggLots,
        resMeatLots,
        resSettings,
        resCoupleEggs,
        resIncubationLots
      ] = await Promise.all([
        supabase!.from('breeds').select('*').eq('user_id', targetUserId).order('nome', { ascending: true }),
        isAdmin
          ? supabase!.from('birds').select('id,anilha,nome,sexo,raca,baia,status,vacinas,origem,casal_id,pai_id,mae_id,is_pai_externo,is_mae_externo,data_nascimento,peso,observacoes,user_id').in('user_id', adminUserIds).order('anilha', { ascending: true })
          : supabase!.from('birds').select('id,anilha,nome,sexo,raca,baia,status,vacinas,origem,casal_id,pai_id,mae_id,is_pai_externo,is_mae_externo,data_nascimento,peso,observacoes,user_id').eq('user_id', targetUserId).order('anilha', { ascending: true }),
        isAdmin
          ? supabase!.from('couples').select('*').in('user_id', adminUserIds)
          : supabase!.from('couples').select('*').eq('user_id', targetUserId),
        isAdmin
          ? supabase!.from('egg_lots').select('*').in('user_id', adminUserIds)
          : supabase!.from('egg_lots').select('*').eq('user_id', targetUserId),
        isAdmin
          ? supabase!.from('meat_lots').select('*').in('user_id', adminUserIds)
          : supabase!.from('meat_lots').select('*').eq('user_id', targetUserId),
        supabase!.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
        isAdmin
          ? supabase!.from('couple_eggs').select('*').in('user_id', adminUserIds)
          : supabase!.from('couple_eggs').select('*').eq('user_id', targetUserId),
        isAdmin
          ? supabase!.from('incubation_lots').select('*').in('user_id', adminUserIds)
          : supabase!.from('incubation_lots').select('*').eq('user_id', targetUserId)
      ]);

      if (resBirds.error) {
        console.error('[Sync] Erro Supabase ao buscar aves:', resBirds.error);
      }

      // 1. Processa deleções pendentes no Supabase
      const pendingDeleteIds = await getPendingDeleteBirdIds();
      if (pendingDeleteIds.size > 0 && isSupabaseConfigured) {
        const toDeleteArr = Array.from(pendingDeleteIds);
        console.log(`[Sync] Executando exclusão pendente de ${toDeleteArr.length} aves no Supabase...`);
        const { error: delErr } = await supabase!.from('birds').delete().in('id', toDeleteArr);
        if (!delErr) {
          for (const dId of toDeleteArr) {
            await clearPendingDeleteBird(dId);
          }
        }
      }

      let sbBreeds = resBreeds.data || [];
      // Carrega tombstones do IndexedDB (fonte primária) + pendingDelete para filtragem dupla
      const currentDeletedIds = await getPendingDeleteBirdIds();
      const allTombstones = await getDeletedBirdIdsAsync();
      // Une os dois conjuntos: pendentes de delete + tombstones históricos
      const allDeletedIds = new Set([...currentDeletedIds, ...allTombstones]);
      const sbBirdsFromCloud = (!resBirds.error && resBirds.data)
        ? resBirds.data.filter((b: any) =>
            !allDeletedIds.has(b.id) &&
            (b.anilha?.trim() || b.nome?.trim()) &&
            !b.id.startsWith('inc-demo')
          )
        : null;

      if (isAdmin && sbBirdsFromCloud && sbBirdsFromCloud.some((b: any) => b.user_id !== ADMIN_CANONICAL_ID)) {
        const toAdopt = sbBirdsFromCloud.filter((b: any) => b.user_id !== ADMIN_CANONICAL_ID).map((b: any) => b.id);
        if (toAdopt.length > 0) {
          supabase!.from('birds').update({ user_id: ADMIN_CANONICAL_ID }).in('id', toAdopt).then(() => {});
        }
      }
      let sbCouples = resCouples.data || [];
      let sbEggLots = resEggLots.data || [];
      let sbMeatLots = resMeatLots.data || [];
      let sbSettings = resSettings.data || null;
      let sbCoupleEggs = resCoupleEggs.data || [];
      let sbIncubationLots = resIncubationLots.data || [];

      // Carrega dados locais defensivamente combinando memória e storage
      const [
        rawLocalBreeds,
        rawLocalBirds,
        rawLocalCouples,
        rawLocalEggLots,
        rawLocalMeatLots,
        rawLocalSettings,
        rawLocalCoupleEggs,
        rawLocalIncubationLots
      ]: any = await Promise.all([
        localforage.getItem(getStorageKey('breeds')),
        localforage.getItem(getStorageKey('birds')),
        localforage.getItem(getStorageKey('couples')),
        localforage.getItem(getStorageKey('egglots')),
        localforage.getItem(getStorageKey('meatlots')),
        localforage.getItem(getStorageKey('settings')),
        localforage.getItem(getStorageKey('couple-eggs')),
        localforage.getItem(getStorageKey('incubation-lots'))
      ]);

      const localBirds = ((birds && birds.length > 0) ? birds : (rawLocalBirds || [])).filter((b: any) => b && b.id);
      const localBreeds = (breeds && breeds.length > 0) ? breeds : (rawLocalBreeds || []);
      const localCouples = (couples && couples.length > 0) ? couples : (rawLocalCouples || []);
      // Combina memória viva (meatLotsRef.current / eggLotsRef.current) com o que foi lido do localforage para ter sempre o mais recente
      const memoryMeatLots = meatLotsRef.current || [];
      const memoryMeatLotsMap = new Map(memoryMeatLots.map(m => [m.id, m]));
      const rawMeatLots = (rawLocalMeatLots && Array.isArray(rawLocalMeatLots)) ? rawLocalMeatLots : [];
      const liveLocalMeatLots: MeatLot[] = [...memoryMeatLots];
      for (const r of rawMeatLots) {
        if (!memoryMeatLotsMap.has(r.id)) {
          liveLocalMeatLots.push(r);
        } else {
          const mem = memoryMeatLotsMap.get(r.id)!;
          if ((r.movimentacoes?.length || 0) > (mem.movimentacoes?.length || 0)) {
            const idx = liveLocalMeatLots.findIndex(x => x.id === r.id);
            if (idx >= 0) liveLocalMeatLots[idx] = r;
          }
        }
      }

      const memoryEggLots = eggLotsRef.current || [];
      const memoryEggLotsMap = new Map(memoryEggLots.map(e => [e.id, e]));
      const rawEggLots = (rawLocalEggLots && Array.isArray(rawLocalEggLots)) ? rawLocalEggLots : [];
      const liveLocalEggLots: EggLot[] = [...memoryEggLots];
      for (const r of rawEggLots) {
        if (!memoryEggLotsMap.has(r.id)) {
          liveLocalEggLots.push(r);
        } else {
          const mem = memoryEggLotsMap.get(r.id)!;
          if ((r.movimentacoes?.length || 0) > (mem.movimentacoes?.length || 0)) {
            const idx = liveLocalEggLots.findIndex(x => x.id === r.id);
            if (idx >= 0) liveLocalEggLots[idx] = r;
          }
        }
      }

      const localEggLots = liveLocalEggLots;
      const localMeatLots = liveLocalMeatLots;
      const localSettings = rawLocalSettings;
      const localCoupleEggs = (coupleEggs && coupleEggs.length > 0) ? coupleEggs : (rawLocalCoupleEggs || []);
      const localIncubationLots = (incubationLots && incubationLots.length > 0) ? incubationLots : (rawLocalIncubationLots || []);

      if (sbEggLots.length === 0 && localEggLots.length > 0) {
        console.log(`[Sync Defensivo] Enviando ${localEggLots.length} lotes de postura locais para o Supabase...`);
        try {
          // Apenas colunas que existem na tabela egg_lots do Supabase com metadados empacotados em registros
          const eggLotsToInsert = localEggLots.map((l: any) => ({
            id: l.id,
            user_id: targetUserId,
            baia: l.baia,
            femeas_ids: l.femeasIds || [],
            expectativa_diaria: l.expectativaDiaria || 0,
            data_inicio: l.dataInicio || '',
            status: l.status || 'Ativo',
            registros: packageEggLotRegistros(l)
          }));
          await supabase!.from('egg_lots').upsert(eggLotsToInsert, { onConflict: 'id' });
          sbEggLots = eggLotsToInsert;
        } catch (mErr) {
          console.error('Erro ao subir lotes de ovos para o Supabase:', mErr);
        }
      }

      if (sbMeatLots.length === 0 && localMeatLots.length > 0) {
        console.log(`[Sync Defensivo] Enviando ${localMeatLots.length} lotes de engorda locais para o Supabase...`);
        try {
          // Apenas colunas que existem na tabela meat_lots do Supabase com metadados empacotados em peso_medio_inicial
          const meatLotsToInsert = localMeatLots.map((l: any) => ({
            id: l.id,
            user_id: targetUserId,
            baia: l.baia,
            aves_ids: l.avesIds || [],
            data_inicio: l.dataInicio || '',
            peso_medio_inicial: packageMeatLotWeight(l),
            status: l.status || 'Crescimento'
          }));
          await supabase!.from('meat_lots').upsert(meatLotsToInsert, { onConflict: 'id' });
          sbMeatLots = meatLotsToInsert;
        } catch (mErr) {
          console.error('Erro ao subir lotes de carne para o Supabase:', mErr);
        }
      }

      if (sbCouples.length === 0 && localCouples.length > 0) {
        try {
          const couplesToInsert = localCouples.map((c: any) => ({
            id: c.id,
            user_id: targetUserId,
            macho_id: c.machoId,
            femea_id: c.femeaIds?.[0] || c.femeaId || '',
            objetivo: c.objetivo,
            data_inicio: c.dataInicio,
            status: c.status
          }));
          await supabase!.from('couples').upsert(couplesToInsert, { onConflict: 'id' });
          sbCouples = couplesToInsert;
        } catch (mErr) {
          console.error('Erro ao subir casais para o Supabase:', mErr);
        }
      }

      // ── RAÇAS: Mapeamento e preservação com DEDUPLICAÇÃO RIGOROSA POR NOME ──
      const seenBreedNames = new Set<string>();
      let uniqueBreeds: Breed[] = [];

      // 1. Processa raças que vieram do Supabase
      for (const b of sbBreeds) {
        const nameLower = (b.nome || '').trim().toLowerCase();
        if (nameLower && !seenBreedNames.has(nameLower)) {
          seenBreedNames.add(nameLower);
          const localBreed = (localBreeds || []).find((x: any) => (x.nome || '').trim().toLowerCase() === nameLower);
          const seedMatch = DEFAULT_BREEDS.find(db => db.nome.toLowerCase() === nameLower);
          uniqueBreeds.push({
            id: b.id,
            nome: b.nome || '',
            foco: b.foco || seedMatch?.foco || '',
            descricao: b.descricao || seedMatch?.descricao || '',
            imagem: b.imagem || seedMatch?.imagem,
            totalAves: b.total_aves || b.totalAves || 0,
            tempoCrescimento: b.tempo_crescimento !== undefined ? b.tempo_crescimento : (localBreed?.tempoCrescimento || seedMatch?.tempoCrescimento || 0),
            pesoMedio: b.peso_medio !== undefined ? b.peso_medio : (localBreed?.pesoMedio || seedMatch?.pesoMedio || ''),
            ganhoGramasDia: b.ganho_gramas_dia !== undefined ? b.ganho_gramas_dia : (localBreed?.ganhoGramasDia || seedMatch?.ganhoGramasDia || undefined),
            conversaoAlimentar: b.conversao_alimentar !== undefined ? b.conversao_alimentar : (localBreed?.conversaoAlimentar || seedMatch?.conversaoAlimentar || undefined)
          });
        }
      }

      // 2. Processa raças locais que não existem no Supabase
      const unsyncedBreedsToPush: Breed[] = [];
      for (const lb of (localBreeds || [])) {
        if (!lb || !lb.nome) continue;
        const nameLower = lb.nome.trim().toLowerCase();
        if (!seenBreedNames.has(nameLower)) {
          seenBreedNames.add(nameLower);
          uniqueBreeds.push(lb);
          unsyncedBreedsToPush.push(lb);
        }
      }

      // 3. Adiciona raças padrão do sistema caso alguma falte
      const missingDefaultToPush: Breed[] = [];
      for (const db of DEFAULT_BREEDS) {
        const nameLower = db.nome.trim().toLowerCase();
        if (!seenBreedNames.has(nameLower)) {
          seenBreedNames.add(nameLower);
          uniqueBreeds.push(db);
          missingDefaultToPush.push(db);
        }
      }

      // 4. Se houver raças a subir para o Supabase, faz upsert
      if (isSupabaseConfigured && user) {
        const breedsToUpsert = [...unsyncedBreedsToPush, ...missingDefaultToPush].map(b => ({
          id: b.id,
          user_id: targetUserId,
          nome: b.nome,
          foco: b.foco,
          descricao: b.descricao,
          imagem: b.imagem,
          tempo_crescimento: b.tempoCrescimento || 0,
          peso_medio: b.pesoMedio || ''
        }));
        if (breedsToUpsert.length > 0) {
          supabase!.from('breeds').upsert(breedsToUpsert, { onConflict: 'id' }).then(() => {}, () => {});
        }
      }

      setBreeds(uniqueBreeds);
      await localforage.setItem(getStorageKey('breeds'), uniqueBreeds);
      if (isAdmin) {
        await localforage.setItem('@mura-manager:admin:breeds', uniqueBreeds);
        await localforage.setItem('@mura-manager:breeds', uniqueBreeds);
      }

      // ── AVES: Sincronização Cloud-Authoritative & Prevenção Rigorosa de Fantasmas ──
      const offlinePendingIds = await getOfflinePendingBirdIds();

      // Sobe para o Supabase apenas aves criadas localmente offline que ainda aguardam sincronização
      if (offlinePendingIds.size > 0 && isSupabaseConfigured && user) {
        const birdsToPush = (localBirds || []).filter((b: any) => b && b.id && offlinePendingIds.has(b.id));
        if (birdsToPush.length > 0) {
          console.log(`[Sync] Enviando ${birdsToPush.length} ave(s) criadas offline para o Supabase...`);
          const payloads = birdsToPush.map((b: any) => ({
            id: b.id,
            user_id: targetUserId,
            anilha: b.anilha,
            nome: b.nome || null,
            sexo: b.sexo,
            raca: b.raca,
            baia: b.baia || 'ND',
            status: b.status,
            imagem: b.imagens?.[0] || b.imagem || null,
            vacinas: b.vacinas || null,
            origem: b.origem || 'Criatório',
            casal_id: b.casalId || null,
            pai_id: b.paiId || null,
            mae_id: b.maeId || null,
            is_pai_externo: !!b.isPaiExterno,
            is_mae_externo: !!b.isMaeExterno,
            data_nascimento: b.dataNascimento || null,
            peso: b.peso || null,
            imagens: b.imagens || [],
            observacoes: b.observacoes || ''
          }));
          for (let i = 0; i < payloads.length; i += 5) {
            const chunk = payloads.slice(i, i + 5);
            try {
              const { error: upErr } = await supabase!.from('birds').upsert(chunk, { onConflict: 'id' });
              if (!upErr) {
                for (const b of chunk) {
                  await clearPendingOfflineBird(b.id);
                }
              }
            } catch (chunkErr) {
              console.warn('[Sync] Erro ao subir lote de aves offline:', chunkErr);
            }
          }
        }
      }

      let finalBirds: Bird[] = [];
      if (sbBirdsFromCloud !== null) {
        // ── OTIMIZAÇÃO DE BANDA (Supabase Egress Saver) ──
        // Identifica apenas as aves vindas da nuvem que NÃO têm fotos no armazenamento local deste aparelho
        const missingPhotoBirdIds: string[] = [];
        const cloudPhotoMap: Record<string, { imagem?: string; imagens?: string[] }> = {};

        sbBirdsFromCloud.forEach((b: any) => {
          const local = (localBirds || []).find((x: any) => x.id === b.id);
          const hasLocal = Boolean(local?.imagem || (local?.imagens && local.imagens.length > 0));
          if (!hasLocal) {
            missingPhotoBirdIds.push(b.id);
          }
        });

        // Se houver aves novas (ex: cadastradas em outro aparelho ou primeiro login), busca fotos em paralelo de alta velocidade
        if (missingPhotoBirdIds.length > 0 && isSupabaseConfigured) {
          try {
            const chunks: string[][] = [];
            for (let i = 0; i < missingPhotoBirdIds.length; i += 25) {
              chunks.push(missingPhotoBirdIds.slice(i, i + 25));
            }
            const chunkResults = await Promise.all(
              chunks.map(chunkIds =>
                supabase!
                  .from('birds')
                  .select('id,imagem,imagens')
                  .in('id', chunkIds)
              )
            );
            chunkResults.forEach(({ data: pData }) => {
              if (pData) {
                pData.forEach((pb: any) => {
                  cloudPhotoMap[pb.id] = {
                    imagem: pb.imagem || (pb.imagens && pb.imagens[0]) || undefined,
                    imagens: pb.imagens || (pb.imagem ? [pb.imagem] : [])
                  };
                });
              }
            });
          } catch (pErr) {
            console.warn('[Sync Otimizado] Falha ao buscar fotos sob demanda:', pErr);
          }
        }

        const nextVitrineMap: Record<string, { inVitrine: boolean; vitrinePrice?: string; vitrineStatus?: any }> = {};

        const cloudMapped: Bird[] = sbBirdsFromCloud.map((b: any) => {
          const localBird = (localBirds || []).find((x: any) => x.id === b.id);
          let birdImagens = (localBird?.imagens && localBird.imagens.length > 0)
            ? localBird.imagens
            : (localBird?.imagem ? [localBird.imagem] : []);

          // Se o cache local não tinha fotos desta ave, usa as fotos trazidas sob demanda da nuvem
          if (birdImagens.length === 0 && cloudPhotoMap[b.id]) {
            birdImagens = cloudPhotoMap[b.id].imagens || (cloudPhotoMap[b.id].imagem ? [cloudPhotoMap[b.id].imagem!] : []);
          }

          const parsedCloudVitrine = parseBirdVitrine(b.observacoes);
          const parsedLocalVitrine = parseBirdVitrine(localBird?.observacoes);
          const recentChange = recentVitrineChangesRef.current.get(b.id);
          const isRecentChangeActive = recentChange && (Date.now() - recentChange.timestamp < 30000);

          let isBirdInVitrine: boolean;
          let birdVitrinePrice: string;
          let birdVitrineStatus: any;

          if (isRecentChangeActive) {
            // Ação explícita recente do usuário local tem autoridade absoluta
            isBirdInVitrine = recentChange.inVitrine;
            birdVitrinePrice = recentChange.vitrinePrice ?? (parsedCloudVitrine.vitrinePrice || localBird?.vitrinePrice || '');
            birdVitrineStatus = recentChange.vitrineStatus ?? (parsedCloudVitrine.vitrineStatus || localBird?.vitrineStatus || 'Disponível');
          } else {
            // Sem alteração recente local:
            if (localBird?.inVitrine === false && !parsedCloudVitrine.inVitrine) {
              isBirdInVitrine = false;
              birdVitrinePrice = '';
              birdVitrineStatus = 'Disponível';
            } else if (parsedCloudVitrine.inVitrine) {
              isBirdInVitrine = true;
              birdVitrinePrice = parsedCloudVitrine.vitrinePrice || '';
              birdVitrineStatus = parsedCloudVitrine.vitrineStatus || 'Disponível';
            } else if (localBird?.inVitrine === true) {
              isBirdInVitrine = true;
              birdVitrinePrice = localBird.vitrinePrice || parsedLocalVitrine.vitrinePrice || '';
              birdVitrineStatus = localBird.vitrineStatus || parsedLocalVitrine.vitrineStatus || 'Disponível';
            } else {
              isBirdInVitrine = false;
              birdVitrinePrice = '';
              birdVitrineStatus = 'Disponível';
            }
          }

          const cleanObs = parsedCloudVitrine.cleanObservacoes || parsedLocalVitrine.cleanObservacoes || '';

          // Sincroniza Supabase caso haja divergência entre nuvem e o status consolidado
          if (isSupabaseConfigured && user) {
            if (!parsedCloudVitrine.inVitrine && isBirdInVitrine) {
              // Ave deve estar na vitrine, grava a tag na nuvem
              const obsWithTag = formatBirdObservacoesWithVitrine(cleanObs, true, birdVitrinePrice, birdVitrineStatus);
              supabase!.from('birds').update({ observacoes: obsWithTag }).eq('id', b.id).then(({ error }) => {
                if (error) console.warn('[Sync] Falha ao persistir tag vitrine em nuvem:', error);
              });
            } else if (parsedCloudVitrine.inVitrine && !isBirdInVitrine) {
              // Ave foi removida da vitrine pelo usuário, remove a tag da nuvem
              const obsWithoutTag = formatBirdObservacoesWithVitrine(cleanObs, false);
              supabase!.from('birds').update({ observacoes: obsWithoutTag }).eq('id', b.id).then(({ error }) => {
                if (error) console.warn('[Sync] Falha ao remover tag vitrine em nuvem:', error);
              });
            }
          }

          if (isBirdInVitrine) {
            nextVitrineMap[b.id] = {
              inVitrine: true,
              vitrinePrice: birdVitrinePrice,
              vitrineStatus: birdVitrineStatus
            };
          }

          return {
            id: b.id,
            anilha: b.anilha || '',
            nome: b.nome || '',
            sexo: b.sexo || 'Macho',
            raca: b.raca || '',
            baia: b.baia || 'ND',
            status: b.status || 'Adulto',
            imagem: b.imagem || (birdImagens[0] ?? undefined),
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
            dataBaixa: localBird?.dataBaixa,
            observacoes: cleanObs,
            inVitrine: isBirdInVitrine,
            vitrinePrice: birdVitrinePrice,
            vitrineStatus: birdVitrineStatus,
            valorEstimado: localBird?.valorEstimado,
            valorVenda: localBird?.valorVenda,
            dataVenda: localBird?.dataVenda,
            compradorNome: localBird?.compradorNome,
            compradorContato: localBird?.compradorContato,
            motivoBaixa: localBird?.motivoBaixa
          };
        });

        // Atualiza vitrineConfig exatamente com o mapa de aves ativas na vitrine
        setVitrineConfig(nextVitrineMap);
        localforage.setItem(getStorageKey('vitrine-config'), nextVitrineMap).catch(console.error);
        try {
          localStorage.setItem('@mura-manager:vitrine-config', JSON.stringify(nextVitrineMap));
        } catch {}

        // Adiciona apenas aves locais que foram criadas offline e ainda não chegaram à nuvem
        // e que NÃO estão nos tombstones (evita aves deletadas offline ressurgirem)
        const unconfirmedOffline = (localBirds || []).filter((b: any) =>
          b && b.id &&
          offlinePendingIds.has(b.id) &&
          !allDeletedIds.has(b.id) &&
          !sbBirdsFromCloud.some((cb: any) => cb.id === b.id)
        );

        finalBirds = [...cloudMapped, ...unconfirmedOffline];
      } else {
        // Nuvem inacessível no momento: preserva dados em cache local
        finalBirds = localBirds;
      }

      setBirds(finalBirds);
      try {
        await localforage.setItem(getStorageKey('birds'), finalBirds);
        if (isAdmin) {
          await localforage.setItem('@mura-manager:admin:birds', finalBirds);
          await localforage.setItem('@mura-manager:birds', finalBirds);
        }
      } catch (storageErr) {
        console.warn('[Sync] Falha no storage local de aves (não-bloqueante):', storageErr);
      }


      // ── CASAIS: Mapeamento e preservação de não sincronizados ──
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

      // ── Cloud é autoridade para casais ──
      const sbCoupleIds = new Set<string>(sbCouples.map((c: any) => c.id));
      const pendingCouples = (localCouples || []).filter((lc: any) => lc && lc.id && !sbCoupleIds.has(lc.id));
      if (pendingCouples.length > 0 && isSupabaseConfigured && user) {
        const couplesToPush = pendingCouples.map((c: any) => ({
          id: c.id,
          user_id: targetUserId,
          macho_id: c.machoId,
          femea_id: c.femeaIds?.[0] || c.femeaId || '',
          objetivo: c.objetivo,
          data_inicio: c.dataInicio,
          status: c.status
        }));
        supabase!.from('couples').upsert(couplesToPush, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('Erro ao subir casais pendentes:', error);
        });
      }

      // UI exibe APENAS o que veio da nuvem (cloud-authoritative)
      setCouples(mappedCouples);
      await localforage.setItem(getStorageKey('couples'), mappedCouples);

      // ── LOTES DE OVOS: Mapeamento e preservação ──
      const mappedEggLots = sbEggLots.map((l: any) => {
        const local = (localEggLots || []).find((x: any) => x.id === l.id);
        
        let sbRegs: any[] = [];
        if (Array.isArray(l.registros)) {
          sbRegs = l.registros;
        } else if (typeof l.registros === 'string' && l.registros.trim()) {
          try { sbRegs = JSON.parse(l.registros); } catch { sbRegs = []; }
        }

        const unpacked = unpackEggLotRegistros(sbRegs);
        const cloudDailyRegs = unpacked.registros;
        const cloudMeta = unpacked.meta;

        const localDailyRegs: any[] = (local?.registros || []).filter((r: any) => !r?.__isLotMeta);
        const finalDailyRegs = localDailyRegs.length > cloudDailyRegs.length ? localDailyRegs : cloudDailyRegs;

        // Combina movimentações
        const cloudMovs: any[] = cloudMeta?.movimentacoes || [];
        const localMovs: any[] = local?.movimentacoes || [];
        const finalMovs = localMovs.length > cloudMovs.length ? localMovs : cloudMovs;

        // Combina observações adicionais
        const cloudObsAdd: any[] = cloudMeta?.observacoesAdicionais || [];
        const localObsAdd: any[] = local?.observacoesAdicionais || [];
        const finalObsAdd = localObsAdd.length > cloudObsAdd.length ? localObsAdd : cloudObsAdd;

        const finalObservacao = (local?.observacao !== undefined && local.observacao !== '') ? local.observacao : (cloudMeta?.observacao || '');
        const finalRaca = (local?.raca !== undefined && local.raca !== '') ? local.raca : (cloudMeta?.raca || '');
        const finalPrecoVendaPadrao = local?.precoVendaPadrao ?? cloudMeta?.precoVendaPadrao ?? 6.0;
        const finalCustoProdPadrao = local?.custoProdPadrao ?? cloudMeta?.custoProdPadrao ?? 0.30;

        const finalQtdFemeas = (local?.qtdFemeas !== undefined && local?.qtdFemeas !== null)
          ? local.qtdFemeas
          : (cloudMeta?.qtdFemeas !== undefined ? cloudMeta.qtdFemeas : (l.femeas_ids?.length || 0));

        const lotObj: EggLot = {
          id: l.id,
          baia: l.baia || local?.baia || '',
          femeasIds: (local?.femeasIds && Array.isArray(local.femeasIds)) ? local.femeasIds : (l.femeas_ids || []),
          expectativaDiaria: l.expectativa_diaria !== undefined ? l.expectativa_diaria : (local?.expectativaDiaria || 0),
          dataInicio: l.data_inicio || local?.dataInicio || '',
          status: l.status || local?.status || 'Ativo',
          raca: finalRaca,
          qtdFemeas: finalQtdFemeas,
          precoVendaPadrao: finalPrecoVendaPadrao,
          custoProdPadrao: finalCustoProdPadrao,
          observacao: finalObservacao,
          observacoesAdicionais: finalObsAdd,
          registros: finalDailyRegs,
          movimentacoes: finalMovs
        };

        // Se o local tinha dados mais novos ou a nuvem ainda não continha os metadados empacotados, atualiza o Supabase
        const isCloudMissingMeta = !cloudMeta || (finalObsAdd.length > cloudObsAdd.length) || (finalMovs.length > cloudMovs.length) || (finalDailyRegs.length > cloudDailyRegs.length);
        if (isCloudMissingMeta && isSupabaseConfigured && user) {
          const packaged = packageEggLotRegistros(lotObj);
          supabase!
            .from('egg_lots')
            .update({ registros: packaged })
            .eq('id', l.id)
            .then(({ error }) => { if (error) console.error('Erro registros ovos:', error); });
        }

        return lotObj;
      });

      // Lotes que existem localmente mas ainda não foram para a nuvem
      const sbEggLotIds = new Set<string>(sbEggLots.map((l: any) => l.id));
      const pendingEggLots = (localEggLots || []).filter((ll: any) => ll && ll.id && !sbEggLotIds.has(ll.id));
      if (pendingEggLots.length > 0 && isSupabaseConfigured && user) {
        // Envia apenas colunas suportadas pelo Supabase com metadados empacotados em registros
        const eggLotsToPush = pendingEggLots.map((l: any) => ({
          id: l.id,
          user_id: targetUserId,
          baia: l.baia,
          data_inicio: l.dataInicio || '',
          status: l.status || 'Ativo',
          femeas_ids: l.femeasIds || [],
          expectativa_diaria: l.expectativaDiaria || 0,
          registros: packageEggLotRegistros(l)
        }));
        supabase!.from('egg_lots').upsert(eggLotsToPush, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('Erro lotes ovos pendentes:', error);
        });
      }

      // Preserva lotes locais não sincronizados para não perder lotes criados offline
      const finalEggLots = [...mappedEggLots, ...pendingEggLots];
      setEggLots(finalEggLots);
      eggLotsRef.current = finalEggLots;
      await localforage.setItem(getStorageKey('egglots'), finalEggLots);

      // ── LOTES DE CORTE: Mapeamento e preservação ──
      const mappedMeatLots = sbMeatLots.map((l: any) => {
        const local = (localMeatLots || []).find((x: any) => x.id === l.id);

        const unpacked = unpackMeatLotWeight(l.peso_medio_inicial);
        const cloudCleanWeight = unpacked.cleanWeight;
        const cloudMeta = unpacked.meta;

        const cloudMovs: any[] = cloudMeta?.movimentacoes || [];
        const localMovs: any[] = local?.movimentacoes || [];
        const finalMovs = localMovs.length > cloudMovs.length ? localMovs : cloudMovs;

        const cloudObsAdd: any[] = cloudMeta?.observacoesAdicionais || [];
        const localObsAdd: any[] = local?.observacoesAdicionais || [];
        const finalObsAdd = localObsAdd.length > cloudObsAdd.length ? localObsAdd : cloudObsAdd;

        const cloudPesagens: any[] = cloudMeta?.pesagens || [];
        const localPesagens: any[] = local?.pesagens || [];
        const finalPesagens = localPesagens.length > cloudPesagens.length ? localPesagens : cloudPesagens;

        const finalObservacao = (local?.observacao !== undefined && local.observacao !== '') ? local.observacao : (cloudMeta?.observacao || '');
        const finalVacinas = (local?.vacinas !== undefined && local.vacinas !== '') ? local.vacinas : (cloudMeta?.vacinas || '');
        const finalRaca = (local?.raca !== undefined && local.raca !== '') ? local.raca : (cloudMeta?.raca || '');
        const finalPesoMedioInicial = local?.pesoMedioInicial || cloudCleanWeight || '';

        const finalQtdAves = (local?.qtdAves !== undefined && local?.qtdAves !== null)
          ? local.qtdAves
          : (cloudMeta?.qtdAves !== undefined ? cloudMeta.qtdAves : (l.aves_ids?.length || 0));

        const lotObj: MeatLot = {
          id: l.id,
          baia: l.baia || local?.baia || '',
          avesIds: (local?.avesIds && Array.isArray(local.avesIds)) ? local.avesIds : (l.aves_ids || []),
          dataInicio: l.data_inicio || local?.dataInicio || '',
          idadeInicialDias: local?.idadeInicialDias ?? cloudMeta?.idadeInicialDias,
          dataNascimento: local?.dataNascimento || cloudMeta?.dataNascimento,
          origem: local?.origem || cloudMeta?.origem,
          origemPais: local?.origemPais || cloudMeta?.origemPais,
          paiId: local?.paiId || cloudMeta?.paiId,
          maeId: local?.maeId || cloudMeta?.maeId,
          paiNome: local?.paiNome || cloudMeta?.paiNome,
          maeNome: local?.maeNome || cloudMeta?.maeNome,
          paisTexto: local?.paisTexto || cloudMeta?.paisTexto,
          pesoMedioInicial: finalPesoMedioInicial,
          status: l.status || local?.status || 'Crescimento',
          raca: finalRaca,
          racaId: local?.racaId || cloudMeta?.racaId,
          observacao: finalObservacao,
          observacoesAdicionais: finalObsAdd,
          vacinas: finalVacinas,
          pesoMeta: local?.pesoMeta || cloudMeta?.pesoMeta || '',
          qtdAves: finalQtdAves,
          ganhoGramasDia: local?.ganhoGramasDia ?? cloudMeta?.ganhoGramasDia,
          consumoRacaoAve: local?.consumoRacaoAve ?? cloudMeta?.consumoRacaoAve,
          pesagens: finalPesagens,
          movimentacoes: finalMovs
        };

        const isCloudMissingMeta = !cloudMeta || (finalObsAdd.length > cloudObsAdd.length) || (finalMovs.length > cloudMovs.length) || (finalPesagens.length > cloudPesagens.length);
        if (isCloudMissingMeta && isSupabaseConfigured && user) {
          const packagedWeight = packageMeatLotWeight(lotObj);
          supabase!
            .from('meat_lots')
            .update({ peso_medio_inicial: packagedWeight })
            .eq('id', l.id)
            .then(({ error }) => { if (error) console.error('Erro lotes carne:', error); });
        }

        return lotObj;
      });

      // Lotes que existem localmente mas ainda não estão na nuvem (ex: lotes de pintinhos chick-*)
      const sbMeatLotIds = new Set<string>(sbMeatLots.map((l: any) => l.id));
      const pendingMeatLots = (localMeatLots || []).filter((ml: any) => ml && ml.id && !sbMeatLotIds.has(ml.id));
      if (pendingMeatLots.length > 0 && isSupabaseConfigured && user) {
        // Envia apenas colunas suportadas pelo Supabase com metadados em peso_medio_inicial
        const meatLotsToPush = pendingMeatLots.map((l: any) => ({
          id: l.id,
          user_id: targetUserId,
          baia: l.baia,
          aves_ids: l.avesIds || [],
          data_inicio: l.dataInicio || '',
          peso_medio_inicial: packageMeatLotWeight(l),
          status: l.status || 'Crescimento'
        }));
        supabase!.from('meat_lots').upsert(meatLotsToPush, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('Erro lotes corte pendentes:', error);
        });
      }

      // Preserva lotes criados localmente (incluindo lotes de pintinhos chick-*)
      const finalMeatLots = [...mappedMeatLots, ...pendingMeatLots];
      setMeatLots(finalMeatLots);
      meatLotsRef.current = finalMeatLots;
      await localforage.setItem(getStorageKey('meatlots'), finalMeatLots);

      // ── OVOS DE CASAL: Mapeamento e preservação ──
      const mappedCoupleEggs = sbCoupleEggs.map((e: any) => ({
        id: e.id,
        coupleId: e.couple_id || e.coupleId || '',
        femeaId: e.femea_id || e.femeaId || '',
        status: e.status || 'Em Espera',
        dataIntroducao: e.data_introducao || e.dataIntroducao || ''
      }));

      // Cloud é autoridade para ovos de casal
      const sbCoupleEggIds = new Set<string>(sbCoupleEggs.map((e: any) => e.id));
      const pendingCoupleEggs = (localCoupleEggs || []).filter((le: any) => le && le.id && !sbCoupleEggIds.has(le.id));
      if (pendingCoupleEggs.length > 0 && isSupabaseConfigured && user) {
        const coupleEggsToPush = pendingCoupleEggs.map((e: any) => ({
          id: e.id,
          user_id: targetUserId,
          couple_id: e.coupleId,
          femea_id: e.femeaId,
          status: e.status,
          data_introducao: e.dataIntroducao
        }));
        supabase!.from('couple_eggs').upsert(coupleEggsToPush, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('Erro ovos casal pendentes:', error);
        });
      }

      const finalCoupleEggs = [...mappedCoupleEggs, ...pendingCoupleEggs];
      setCoupleEggs(finalCoupleEggs);
      await localforage.setItem(getStorageKey('couple-eggs'), finalCoupleEggs);

      // ── LOTES DE INCUBAÇÃO: Mapeamento e preservação ──
      const mappedIncubationLots = sbIncubationLots.map((l: any) => ({
        id: l.id,
        coupleId: l.couple_id || l.coupleId || '',
        numeroLote: l.numero_lote || l.numeroLote || '',
        quantidadeOvos: l.quantidadeOvos !== undefined ? l.quantidade_ovos : (l.quantidadeOvos || 0),
        dataInicio: l.data_inicio || l.dataInicio || '',
        baia: l.baia || '',
        ovoscopia1Realizada: l.ovoscopia1_realizada !== undefined ? l.ovoscopia1_realizada : false,
        ovoscopia2Realizada: l.ovoscopia2_realizada !== undefined ? l.ovoscopia2_realizada : false,
        ovosDescartados1: l.ovos_descartados1 !== undefined ? l.ovos_descartados1 : 0,
        ovosDescartados2: l.ovos_descartados2 !== undefined ? l.ovos_descartados2 : 0,
        eclodido: l.eclodido !== undefined ? l.eclodido : false
      }));

      // Cloud é autoridade para lotes de incubação
      const sbIncubationLotIds = new Set<string>(sbIncubationLots.map((l: any) => l.id));
      const pendingIncubationLots = (localIncubationLots || []).filter((li: any) => li && li.id && !sbIncubationLotIds.has(li.id));
      if (pendingIncubationLots.length > 0 && isSupabaseConfigured && user) {
        const incubationLotsToPush = pendingIncubationLots.map((l: any) => ({
          id: l.id,
          user_id: targetUserId,
          couple_id: l.coupleId,
          numero_lote: l.numeroLote,
          quantidade_ovos: l.quantidadeOvos,
          data_inicio: l.dataInicio,
          baia: l.baia,
          ovoscopia1_realizada: l.ovoscopia1Realizada || false,
          ovoscopia2_realizada: l.ovoscopia2Realizada || false,
          ovos_descartados1: l.ovosDescartados1 || 0,
          ovos_descartados2: l.ovosDescartados2 || 0,
          eclodido: l.eclodido || false
        }));
        supabase!.from('incubation_lots').upsert(incubationLotsToPush, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('Erro lotes incubação pendentes:', error);
        });
      }

      const finalIncubationLots = [...mappedIncubationLots, ...pendingIncubationLots];
      setIncubationLots(finalIncubationLots);
      await localforage.setItem(getStorageKey('incubation-lots'), finalIncubationLots);

      // ── CONFIGURAÇÕES DA FAZENDA ──
      const hasSbProfile = sbSettings && (Boolean(sbSettings.name) || Boolean(sbSettings.photo));
      const hasLocalProfile = localSettings && (Boolean(localSettings.name) || Boolean(localSettings.photo) || Boolean(localSettings.phone));

      if (hasSbProfile) {
        const settingsData = {
          name: sbSettings.name || localSettings?.name || '',
          photo: sbSettings.photo || localSettings?.photo || '',
          email: sbSettings.email || localSettings?.email || '',
          phone: sbSettings.phone || localSettings?.phone || ''
        };
        setFarmSettings(settingsData);
        await localforage.setItem(getStorageKey('settings'), settingsData);
        if (isAdmin) {
          await localforage.setItem('@mura-manager:settings', settingsData);
        }
      } else if (hasLocalProfile) {
        setFarmSettings(localSettings);
        if (isSupabaseConfigured) {
          await supabase!.from('profiles').upsert({
            id: targetUserId,
            name: localSettings.name || '',
            photo: localSettings.photo || '',
            email: localSettings.email || '',
            phone: localSettings.phone || ''
          });
        }
      } else {
        const defaultSettings = { name: '', photo: '', email: '', phone: '' };
        setFarmSettings(defaultSettings);
        await localforage.setItem(getStorageKey('settings'), defaultSettings);
      }
    } catch (syncError) {
      console.error("Erro crítico na sincronização em background, fazendo fallback offline:", syncError);
      await loadFromLocalForage();
    } finally {
      isSyncingRef.current = false;
    }
  }, [user, loadFromLocalForage]);

  // Carregamento inicial de dados ao iniciar ou trocar de usuário
  useEffect(() => {
    async function loadData() {
      if (!user) {
        // Se ainda está determinando a sessão e há usuário em cache no localStorage, NÃO limpa a tela
        const hasCachedUser = !!localStorage.getItem('@mura-manager:cached-user');
        if (hasCachedUser) {
          return;
        }

        // Usuário deslogado / visitante: carrega dados locais preservados
        await loadFromLocalForage();
        setIsReady(true);
        setIsInitialSyncDone(true);
        return;
      }

      setIsInitialSyncDone(false);

      // ── Migra dados cadastrados offline / como visitante para a conta do usuário que acabou de logar ──
      await migrateGuestAndLocalDataToUser(user.id);

      // ── Carrega cache local imediatamente → tela nunca aparece zerada se já houver dados ──
      // Tombstones do IndexedDB já filtram aves/lotes deletados no loadFromLocalForage
      const localBirdsCount = await loadFromLocalForage();
      if (localBirdsCount > 0) {
        setIsReady(true);
        setIsInitialSyncDone(true);
      }

      // ── Sincroniza com a nuvem em background ──
      // Isso corrige dados desatualizados silenciosamente após o app já estar visível
      if (isSupabaseConfigured && navigator.onLine) {
        processSyncQueue().catch(() => {});
        const syncPromise = syncWithSupabaseBackground(true).catch(err => {
          console.warn('[LoadData] Falha na sync background:', err);
        });

        // Se o cache local ainda não tinha aves, aguarda a nuvem terminar
        // para que o usuário veja as informações completas de primeira, sem passar pelo zero
        if (localBirdsCount === 0) {
          await Promise.race([
            syncPromise,
            new Promise(resolve => setTimeout(resolve, 8000))
          ]);
        }
      }

      setIsReady(true);
      setIsInitialSyncDone(true);
    }

    loadData();
  }, [user, loadFromLocalForage, syncWithSupabaseBackground, migrateGuestAndLocalDataToUser]);

  // Efeito de reconexão automática e sincronização contínua (Online / Focus / Timer 60s)
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const handleOnline = () => {
      console.log('[Rede] Conexão restaurada. Disparando fila offline e sincronização com a nuvem...');
      processSyncQueue().catch(() => {});
      syncWithSupabaseBackground(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Foco App] Aplicativo visível. Disparando sincronização imediata...');
        processSyncQueue().catch(() => {});
        syncWithSupabaseBackground(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Canal Realtime do Supabase: escuta mudanças nas tabelas e broadcast instantâneo entre abas/aparelhos
    const channel = supabase!
      .channel('mura-sync-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'birds' }, () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          syncWithSupabaseBackground(true);
        }, 400);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'breeds' }, () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          syncWithSupabaseBackground(true);
        }, 400);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couples' }, () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          syncWithSupabaseBackground(true);
        }, 400);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'egg_lots' }, () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          syncWithSupabaseBackground(true);
        }, 400);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meat_lots' }, () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          syncWithSupabaseBackground(true);
        }, 400);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incubation_lots' }, () => {
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          syncWithSupabaseBackground(true);
        }, 400);
      })
      .on('broadcast', { event: 'mura_sync' }, (payload) => {
        console.log('[Realtime Broadcast] Notificação instantânea de sincronização recebida:', payload);
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          syncWithSupabaseBackground(true);
        }, 300);
      })
      .subscribe();

    realtimeBroadcastChannelRef.current = channel;

    // Timer de checagem periódica defensiva em segundo plano a cada 60 segundos
    const syncInterval = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        syncWithSupabaseBackground(true);
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
      clearInterval(syncInterval);
      supabase!.removeChannel(channel);
      realtimeBroadcastChannelRef.current = null;
    };
  }, [user, syncWithSupabaseBackground]);

  // Modals
  const [isAddBirdModalOpen, setIsAddBirdModalOpen] = useState(false);
  const [preSelectedBreedForNewBird, setPreSelectedBreedForNewBird] = useState('');
  const [birdToEditId, setBirdToEditId] = useState<string | null>(null);
  const [selectedBirdProfileId, setSelectedBirdProfileId] = useState<string | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [activeBreed, setActiveBreed] = useState('');

  useEffect(() => {
    // Nunca abre o tutorial ou instruções automaticamente no login
    setIsTutorialOpen(false);
    try {
      localStorage.setItem('@mura-manager:hasSeenTour_v1', 'true');
      localStorage.setItem('@mura-manager:has-seen-tutorial', 'true');
      if (user) {
        localStorage.setItem(`@mura-manager:${user.id}:has-seen-tutorial`, 'true');
      }
    } catch {}
  }, [user]);

  // Autopromoção de 'Crescimento' para 'Adulto' e migração de status obsoletos ('Ativo') — Executa 1x ao carregar
  useEffect(() => {
    if (!isReady || birds.length === 0 || breeds.length === 0) return;

    let hasUpdates = false;
    const updatedBirds = birds.map(bird => {
      let nextStatus = bird.status;

      // Migrar status obsoleto 'Ativo' para 'Adulto'
      if (bird.status === 'Ativo') {
        nextStatus = 'Adulto';
        hasUpdates = true;
      }

      // Autopromoção de 'Crescimento' para 'Adulto'
      if (bird.status === 'Crescimento' && bird.dataNascimento) {
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
          .filter((b, idx) => b.status !== birds[idx]?.status)
          .map(b => 
            supabase!
              .from('birds')
              .update({ status: b.status })
              .eq('id', b.id)
          );
        Promise.all(promises).catch(err => console.error('Erro ao atualizar status Supabase:', err));
      }
    }
    // Executa apenas na inicialização inicial do app
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const addBreed = (breed: Breed) => {
    setBreeds(prev => {
      const next = [...prev, breed];
      localforage.setItem(getStorageKey('breeds'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('breeds')
          .insert({
            id: breed.id,
            user_id: targetUserId,
            nome: breed.nome,
            foco: breed.foco,
            descricao: breed.descricao,
            imagem: breed.imagem,
            tempo_crescimento: breed.tempoCrescimento || 0,
            peso_medio: breed.pesoMedio || '',
            ganho_gramas_dia: breed.ganhoGramasDia || null,
            conversao_alimentar: breed.conversaoAlimentar || null
          })
          .then(({ error }) => { 
            if (error) console.error('Erro Supabase addBreed:', error);
            else triggerRemoteSync('breeds');
          });
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
        if (updatedBreed.tempoCrescimento !== undefined) dbUpdate.tempo_crescimento = updatedBreed.tempoCrescimento;
        if (updatedBreed.pesoMedio !== undefined) dbUpdate.peso_medio = updatedBreed.pesoMedio;
        if (updatedBreed.ganhoGramasDia !== undefined) dbUpdate.ganho_gramas_dia = updatedBreed.ganhoGramasDia;
        if (updatedBreed.conversaoAlimentar !== undefined) dbUpdate.conversao_alimentar = updatedBreed.conversaoAlimentar;

        supabase!
          .from('breeds')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { 
            if (error) console.error('Erro Supabase editBreed:', error);
            else triggerRemoteSync('breeds');
          });
      }
      return next;
    });
  };

  const removeBreed = (id: string) => {
    const breedToDelete = breeds.find(b => b.id === id);
    setBreeds(prev => {
      const next = prev.filter(b => b.id !== id);
      localforage.setItem(getStorageKey('breeds'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('breeds')
          .delete()
          .eq('id', id)
          .then(({ error }) => { 
            if (error) console.error('Erro Supabase removeBreed:', error);
            else triggerRemoteSync('breeds');
          });
      }
      return next;
    });

    if (breedToDelete) {
      setBirds(prev => {
        const next = prev.map(b => b.raca === breedToDelete.nome ? { ...b, raca: '' } : b);
        localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
        
        if (isSupabaseConfigured && user) {
          supabase!
            .from('birds')
            .update({ raca: '' })
            .eq('raca', breedToDelete.nome)
            .then(({ error }) => { if (error) console.error('Erro Supabase cascade removeBreed:', error); });
        }
        return next;
      });
    }
  };

  const addBird = (bird: Bird) => {
    clearDeletedBirdId(bird.id);
    markPendingOfflineBird(bird.id);
    const cleanObs = parseBirdVitrine(bird.observacoes).cleanObservacoes;
    const finalObsForDb = formatBirdObservacoesWithVitrine(
      cleanObs,
      Boolean(bird.inVitrine),
      bird.vitrinePrice,
      bird.vitrineStatus
    );
    const birdWithDate: Bird = {
      ...bird,
      observacoes: cleanObs,
      dataCadastro: bird.dataCadastro || new Date().toISOString().split('T')[0]
    };
    setBirds(prev => {
      const next = [...prev, birdWithDate];
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
        localforage.setItem('@mura-manager:birds', next).catch(() => {});
      }

      if (bird.inVitrine) {
        setVitrineConfig(vPrev => {
          const vNext = {
            ...vPrev,
            [bird.id]: {
              inVitrine: true,
              vitrinePrice: bird.vitrinePrice || '',
              vitrineStatus: bird.vitrineStatus || 'Disponível'
            }
          };
          localforage.setItem(getStorageKey('vitrine-config'), vNext).catch(console.error);
          try {
            localStorage.setItem('@mura-manager:vitrine-config', JSON.stringify(vNext));
          } catch {}
          return vNext;
        });
      }
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        const payload = {
          id: bird.id,
          user_id: targetUserId,
          anilha: bird.anilha,
          nome: bird.nome || null,
          sexo: bird.sexo,
          raca: bird.raca,
          baia: bird.baia || 'ND',
          status: bird.status,
          imagem: bird.imagens?.[0] || bird.imagem || null,
          vacinas: bird.vacinas || null,
          origem: bird.origem || 'Criatório',
          casal_id: bird.casalId || null,
          pai_id: bird.paiId || null,
          mae_id: bird.maeId || null,
          is_pai_externo: !!bird.isPaiExterno,
          is_mae_externo: !!bird.isMaeExterno,
          data_nascimento: bird.dataNascimento || null,
          peso: bird.peso || null,
          imagens: bird.imagens || [],
          observacoes: finalObsForDb
        };
        supabase!
          .from('birds')
          .upsert(payload, { onConflict: 'id' })
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase addBird, enfileirando offline:', error);
                enqueueMutation('birds', 'upsert', payload, { column: 'id', value: bird.id });
              } else {
                clearPendingOfflineBird(bird.id);
                triggerRemoteSync('birds');
              }
            },
            () => {
              enqueueMutation('birds', 'upsert', payload, { column: 'id', value: bird.id });
            }
          );
      }
      return next;
    });
  };
  
  const editBird = (id: string, updatedBird: Partial<Bird>) => {
    let finalObsForDb: string | undefined = undefined;

    if (updatedBird.inVitrine !== undefined) {
      recentVitrineChangesRef.current.set(id, {
        inVitrine: updatedBird.inVitrine,
        vitrinePrice: updatedBird.vitrinePrice,
        vitrineStatus: updatedBird.vitrineStatus,
        timestamp: Date.now()
      });
    }

    setBirds(prev => {
      const currentBird = prev.find(b => b.id === id);
      const isVit = updatedBird.inVitrine !== undefined ? updatedBird.inVitrine : Boolean(currentBird?.inVitrine);
      const vitPrice = updatedBird.vitrinePrice !== undefined ? updatedBird.vitrinePrice : (currentBird?.vitrinePrice || '');
      const vitStat = updatedBird.vitrineStatus !== undefined ? updatedBird.vitrineStatus : (currentBird?.vitrineStatus || 'Disponível');

      const rawObs = updatedBird.observacoes !== undefined ? updatedBird.observacoes : (currentBird?.observacoes || '');
      const cleanObs = parseBirdVitrine(rawObs).cleanObservacoes;
      finalObsForDb = formatBirdObservacoesWithVitrine(cleanObs, isVit, vitPrice, vitStat);

      const next = prev.map(b => {
        if (b.id === id) {
          const nextFields = { ...updatedBird };
          if ((updatedBird.status === 'Vendido' || updatedBird.status === 'Faleceu') && !b.dataBaixa) {
            nextFields.dataBaixa = updatedBird.dataVenda || new Date().toISOString().split('T')[0];
          }
          if (updatedBird.status && updatedBird.status !== 'Vendido' && updatedBird.status !== 'Faleceu') {
            nextFields.dataBaixa = undefined;
            nextFields.dataVenda = undefined;
            nextFields.compradorNome = undefined;
            nextFields.compradorContato = undefined;
          }
          nextFields.inVitrine = isVit;
          nextFields.vitrinePrice = vitPrice;
          nextFields.vitrineStatus = vitStat;
          nextFields.observacoes = cleanObs;
          return { ...b, ...nextFields };
        }
        return b;
      });
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
        localforage.setItem('@mura-manager:birds', next).catch(() => {});
      }

      // Persistência robusta de vitrineConfig (isolada e imune a sobrescritas de sync)
      if (updatedBird.inVitrine !== undefined || updatedBird.vitrinePrice !== undefined || updatedBird.vitrineStatus !== undefined) {
        setVitrineConfig(vPrev => {
          const prevEntry = vPrev[id] || {};
          const isVitVal = updatedBird.inVitrine !== undefined ? updatedBird.inVitrine : prevEntry.inVitrine;
          const nextConfig = { ...vPrev };
          if (isVitVal) {
            nextConfig[id] = {
              inVitrine: true,
              vitrinePrice: updatedBird.vitrinePrice !== undefined ? updatedBird.vitrinePrice : (prevEntry.vitrinePrice || ''),
              vitrineStatus: updatedBird.vitrineStatus !== undefined ? updatedBird.vitrineStatus : (prevEntry.vitrineStatus || 'Disponível')
            };
          } else {
            delete nextConfig[id];
          }
          localforage.setItem(getStorageKey('vitrine-config'), nextConfig).catch(console.error);
          try {
            localStorage.setItem('@mura-manager:vitrine-config', JSON.stringify(nextConfig));
          } catch {}
          return nextConfig;
        });
      }
      return next;
    });

    if (isSupabaseConfigured && user) {
      const dbUpdate: any = {};
      if (updatedBird.anilha !== undefined) dbUpdate.anilha = updatedBird.anilha;
      if (updatedBird.nome !== undefined) dbUpdate.nome = updatedBird.nome || null;
      if (updatedBird.sexo !== undefined) dbUpdate.sexo = updatedBird.sexo;
      if (updatedBird.raca !== undefined) dbUpdate.raca = updatedBird.raca;
      if (updatedBird.baia !== undefined) dbUpdate.baia = updatedBird.baia || 'ND';
      if (updatedBird.status !== undefined) dbUpdate.status = updatedBird.status;
      if (updatedBird.vacinas !== undefined) dbUpdate.vacinas = updatedBird.vacinas || null;
      if (updatedBird.origem !== undefined) dbUpdate.origem = updatedBird.origem || 'Criatório';
      if (updatedBird.casalId !== undefined) dbUpdate.casal_id = updatedBird.casalId || null;
      if (updatedBird.paiId !== undefined) dbUpdate.pai_id = updatedBird.paiId || null;
      if (updatedBird.maeId !== undefined) dbUpdate.mae_id = updatedBird.maeId || null;
      if (updatedBird.isPaiExterno !== undefined) dbUpdate.is_pai_externo = !!updatedBird.isPaiExterno;
      if (updatedBird.isMaeExterno !== undefined) dbUpdate.is_mae_externo = !!updatedBird.isMaeExterno;
      if (updatedBird.dataNascimento !== undefined) dbUpdate.data_nascimento = updatedBird.dataNascimento || null;
      if (updatedBird.peso !== undefined) dbUpdate.peso = updatedBird.peso || null;
      if (finalObsForDb !== undefined) {
        dbUpdate.observacoes = finalObsForDb;
      } else if (updatedBird.observacoes !== undefined) {
        dbUpdate.observacoes = updatedBird.observacoes || '';
      }
      if (updatedBird.imagens !== undefined) {
        dbUpdate.imagem = updatedBird.imagens?.[0] || null;
        dbUpdate.imagens = updatedBird.imagens;
      } else if (updatedBird.imagem !== undefined) {
        dbUpdate.imagem = updatedBird.imagem || null;
      }

      supabase!
        .from('birds')
        .update(dbUpdate)
        .eq('id', id)
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase editBird, enfileirando offline:', error);
                enqueueMutation('birds', 'update', dbUpdate, { column: 'id', value: id });
              } else {
                triggerRemoteSync('birds');
              }
            },
            () => {
              enqueueMutation('birds', 'update', dbUpdate, { column: 'id', value: id });
            }
          );
      }
    };

  const removeBird = (id: string) => {
    // 1. Grava no túmulo persistente de IDs deletados e fila pendente
    recordDeletedBirdId(id);
    markPendingDeleteBird(id);
    clearPendingOfflineBird(id);

    // 2. Remove da lista primária e dos espelhos de storage
    setBirds(prev => {
      const next = prev.filter(b => b.id !== id);
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
        localforage.setItem('@mura-manager:birds', next).catch(() => {});
      }

      // Purga também do backup de emergência no localStorage para não haver risco de restauração
      try {
        const emergencyRaw = localStorage.getItem('@mura-manager:emergency-birds-backup');
        if (emergencyRaw) {
          const emergencyBirds = JSON.parse(emergencyRaw);
          if (Array.isArray(emergencyBirds)) {
            const cleaned = emergencyBirds.filter((b: any) => b && b.id !== id);
            localStorage.setItem('@mura-manager:emergency-birds-backup', JSON.stringify(cleaned));
          }
        }
      } catch {}

      // Limpa rastros de vitrine
      recentVitrineChangesRef.current.delete(id);
      setVitrineConfig(vPrev => {
        if (!vPrev[id]) return vPrev;
        const nextConfig = { ...vPrev };
        delete nextConfig[id];
        localforage.setItem(getStorageKey('vitrine-config'), nextConfig).catch(console.error);
        try {
          localStorage.setItem('@mura-manager:vitrine-config', JSON.stringify(nextConfig));
        } catch {}
        return nextConfig;
      });
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('birds')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => {
              if (error) {
                enqueueMutation('birds', 'delete', null, { column: 'id', value: id });
              } else {
                clearPendingDeleteBird(id);
                triggerRemoteSync('birds');
              }
            },
            () => {
              enqueueMutation('birds', 'delete', null, { column: 'id', value: id });
            }
          );
      }
      return next;
    });

    // 3. Limpa referências de pedigree (pai e mãe) nas aves filhas
    setBirds(prev => {
      const next = prev.map(b => {
        let changed = false;
        const updated = { ...b };
        if (b.paiId === id) { updated.paiId = ''; changed = true; }
        if (b.maeId === id) { updated.maeId = ''; changed = true; }
        return changed ? updated : b;
      });
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
        localforage.setItem('@mura-manager:birds', next).catch(() => {});
      }
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('birds')
          .update({ pai_id: '' })
          .eq('pai_id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase cascade father removeBird:', error); });
          
        supabase!
          .from('birds')
          .update({ mae_id: '' })
          .eq('mae_id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase cascade mother removeBird:', error); });
      }
      return next;
    });

    // 4. Deleta casais associados à ave removida (machos e fêmeas) em cascata
    const couplesToRemove = couples.filter(c => c.machoId === id || c.femeaId === id || c.femeaIds?.includes(id));
    couplesToRemove.forEach(c => {
      removeCouple(c.id);
    });
  };

  const addCouple = (couple: Couple) => {
    setCouples(prev => {
      const next = [...prev, couple];
      localforage.setItem(getStorageKey('couples'), next).catch(err => console.error(err));

      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('couples')
          .insert({
            id: couple.id,
            user_id: targetUserId,
            macho_id: couple.machoId,
            femea_id: couple.femeaIds?.[0] || couple.femeaId || '',
            objetivo: couple.objetivo,
            data_inicio: couple.dataInicio,
            status: couple.status
          })
          .then(({ error }) => { 
            if (error) console.error('Erro Supabase addCouple:', error);
            else triggerRemoteSync('couples');
          });
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
          .then(({ error }) => { 
            if (error) console.error('Erro Supabase editCouple:', error);
            else triggerRemoteSync('couples');
          });
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
          .then(({ error }) => { 
            if (error) console.error('Erro Supabase removeCouple:', error);
            else triggerRemoteSync('couples');
          });
      }
      return next;
    });

    // Remove todos os ovos introduzidos desse casal
    setCoupleEggs(prev => {
      const next = prev.filter(e => e.coupleId !== id);
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      if (isSupabaseConfigured && user) {
        supabase!
          .from('couple_eggs')
          .delete()
          .eq('couple_id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase cascade couple_eggs:', error); });
      }
      return next;
    });

    // Remove todos os lotes de incubação desse casal
    setIncubationLots(prev => {
      const next = prev.filter(l => l.coupleId !== id);
      localforage.setItem(getStorageKey('incubation-lots'), next).catch(console.error);
      if (isSupabaseConfigured && user) {
        supabase!
          .from('incubation_lots')
          .delete()
          .eq('couple_id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase cascade incubation_lots:', error); });
      }
      return next;
    });

    // Remove a associação de casalId em qualquer ave do plantel
    setBirds(prev => {
      const next = prev.map(b => b.casalId === id ? { ...b, casalId: undefined } : b);
      localforage.setItem(getStorageKey('birds'), next).catch(console.error);
      if (isSupabaseConfigured && user) {
        supabase!
          .from('birds')
          .update({ casal_id: null })
          .eq('casal_id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase cascade birds casal_id:', error); });
      }
      return next;
    });
  };

  /* ── CoupleEgg CRUD ── */
  const addCoupleEgg = (egg: CoupleEgg) => {
    setCoupleEggs(prev => {
      const next = [...prev, egg];
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('couple_eggs')
          .insert({
            id: egg.id,
            user_id: targetUserId,
            couple_id: egg.coupleId,
            femea_id: egg.femeaId,
            status: egg.status,
            data_introducao: egg.dataIntroducao
          })
          .then(({ error }) => { if (error) console.error('Erro Supabase addCoupleEgg:', error); });
      }
      return next;
    });
  };

  const editCoupleEgg = (id: string, updated: Partial<CoupleEgg>) => {
    setCoupleEggs(prev => {
      const next = prev.map(e => e.id === id ? { ...e, ...updated } : e);
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = {};
        if (updated.coupleId !== undefined) dbUpdate.couple_id = updated.coupleId;
        if (updated.femeaId !== undefined) dbUpdate.femea_id = updated.femeaId;
        if (updated.status !== undefined) dbUpdate.status = updated.status;
        if (updated.dataIntroducao !== undefined) dbUpdate.data_introducao = updated.dataIntroducao;

        supabase!
          .from('couple_eggs')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editCoupleEgg:', error); });
      }
      return next;
    });
  };

  const removeCoupleEgg = (id: string) => {
    setCoupleEggs(prev => {
      const next = prev.filter(e => e.id !== id);
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('couple_eggs')
          .delete()
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase removeCoupleEgg:', error); });
      }
      return next;
    });
  };

  /* ── IncubationLot CRUD ── */
  const addIncubationLot = (lot: IncubationLot) => {
    setIncubationLots(prev => {
      const next = [...prev, lot];
      localforage.setItem(getStorageKey('incubation-lots'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('incubation_lots')
          .insert({
            id: lot.id,
            user_id: targetUserId,
            couple_id: lot.coupleId,
            numero_lote: lot.numeroLote,
            quantidade_ovos: lot.quantidadeOvos,
            data_inicio: lot.dataInicio,
            baia: lot.baia,
            ovoscopia1_realizada: lot.ovoscopia1Realizada || false,
            ovoscopia2_realizada: lot.ovoscopia2Realizada || false,
            ovos_descartados1: lot.ovosDescartados1 || 0,
            ovos_descartados2: lot.ovosDescartados2 || 0,
            eclodido: lot.eclodido || false
          })
          .then(({ error }) => { if (error) console.error('Erro Supabase addIncubationLot:', error); });
      }
      return next;
    });
  };

  const editIncubationLot = (id: string, updatedLot: Partial<IncubationLot>) => {
    setIncubationLots(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updatedLot } : l);
      localforage.setItem(getStorageKey('incubation-lots'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = {};
        if (updatedLot.coupleId !== undefined) dbUpdate.couple_id = updatedLot.coupleId;
        if (updatedLot.numeroLote !== undefined) dbUpdate.numero_lote = updatedLot.numeroLote;
        if (updatedLot.quantidadeOvos !== undefined) dbUpdate.quantidade_ovos = updatedLot.quantidadeOvos;
        if (updatedLot.dataInicio !== undefined) dbUpdate.data_inicio = updatedLot.dataInicio;
        if (updatedLot.baia !== undefined) dbUpdate.baia = updatedLot.baia;
        if (updatedLot.ovoscopia1Realizada !== undefined) dbUpdate.ovoscopia1_realizada = updatedLot.ovoscopia1Realizada;
        if (updatedLot.ovoscopia2Realizada !== undefined) dbUpdate.ovoscopia2_realizada = updatedLot.ovoscopia2Realizada;
        if (updatedLot.ovosDescartados1 !== undefined) dbUpdate.ovos_descartados1 = updatedLot.ovosDescartados1;
        if (updatedLot.ovosDescartados2 !== undefined) dbUpdate.ovos_descartados2 = updatedLot.ovosDescartados2;
        if (updatedLot.eclodido !== undefined) dbUpdate.eclodido = updatedLot.eclodido;

        supabase!
          .from('incubation_lots')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editIncubationLot:', error); });
      }
      return next;
    });
  };

  const removeIncubationLot = (id: string) => {
    setIncubationLots(prev => {
      const next = prev.filter(l => l.id !== id);
      localforage.setItem(getStorageKey('incubation-lots'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('incubation_lots')
          .delete()
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase removeIncubationLot:', error); });
      }
      return next;
    });
  };

  const addEggLot = (lot: EggLot) => {
    setEggLots(prev => {
      const next = [...prev, lot];
      eggLotsRef.current = next;
      localforage.setItem(getStorageKey('egglots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        const payload = {
          id: lot.id,
          user_id: targetUserId,
          baia: lot.baia,
          femeas_ids: lot.femeasIds || [],
          expectativa_diaria: lot.expectativaDiaria || 0,
          data_inicio: lot.dataInicio,
          status: lot.status,
          registros: packageEggLotRegistros(lot)
        };
        supabase!
          .from('egg_lots')
          .insert(payload)
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase addEggLot, enfileirando offline:', error);
                enqueueMutation('egg_lots', 'insert', payload);
              }
            },
            () => { enqueueMutation('egg_lots', 'insert', payload); }
          );
      }
      return next;
    });
  };
  
  const editEggLot = (id: string, updatedLot: Partial<EggLot>) => {
    setEggLots(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updatedLot } : l);
      eggLotsRef.current = next;
      localforage.setItem(getStorageKey('egglots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const fullLot = next.find(l => l.id === id);
        // Constrói estritamente os campos snake_case válidos para o Supabase (somente colunas existentes na tabela)
        const dbUpdate: any = {};
        if (updatedLot.baia !== undefined) dbUpdate.baia = updatedLot.baia;
        if (updatedLot.status !== undefined) dbUpdate.status = updatedLot.status;
        if (updatedLot.femeasIds !== undefined) dbUpdate.femeas_ids = updatedLot.femeasIds;
        if (updatedLot.expectativaDiaria !== undefined) dbUpdate.expectativa_diaria = updatedLot.expectativaDiaria;
        if (updatedLot.dataInicio !== undefined) dbUpdate.data_inicio = updatedLot.dataInicio;
        if (
          fullLot && (
            updatedLot.registros !== undefined ||
            updatedLot.observacao !== undefined ||
            updatedLot.observacoesAdicionais !== undefined ||
            updatedLot.movimentacoes !== undefined ||
            updatedLot.raca !== undefined ||
            updatedLot.qtdFemeas !== undefined ||
            updatedLot.precoVendaPadrao !== undefined ||
            updatedLot.custoProdPadrao !== undefined
          )
        ) {
          dbUpdate.registros = packageEggLotRegistros(fullLot);
        }

        if (Object.keys(dbUpdate).length > 0) {
          supabase!
            .from('egg_lots')
            .update(dbUpdate)
            .eq('id', id)
            .then(
              ({ error }) => {
                if (error) {
                  console.warn('Erro Supabase editEggLot, enfileirando offline:', error);
                  enqueueMutation('egg_lots', 'update', dbUpdate, { column: 'id', value: id });
                }
              },
              () => { enqueueMutation('egg_lots', 'update', dbUpdate, { column: 'id', value: id }); }
            );
        }
      }
      return next;
    });
  };

  const addMeatLot = (lot: MeatLot) => {
    setMeatLots(prev => {
      const next = [...prev, lot];
      meatLotsRef.current = next;
      localforage.setItem(getStorageKey('meatlots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        const payload = {
          id: lot.id,
          user_id: targetUserId,
          baia: lot.baia,
          aves_ids: lot.avesIds || [],
          data_inicio: lot.dataInicio,
          peso_medio_inicial: packageMeatLotWeight(lot),
          status: lot.status
        };
        supabase!
          .from('meat_lots')
          .insert(payload)
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase addMeatLot, enfileirando offline:', error);
                enqueueMutation('meat_lots', 'insert', payload);
              }
            },
            () => { enqueueMutation('meat_lots', 'insert', payload); }
          );
      }
      return next;
    });
  };
  
  const editMeatLot = (id: string, updatedLot: Partial<MeatLot>) => {
    setMeatLots(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...updatedLot } : l);
      meatLotsRef.current = next;
      localforage.setItem(getStorageKey('meatlots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const fullLot = next.find(l => l.id === id);
        // Constrói estritamente os campos válidos para a tabela meat_lots do Supabase
        const dbUpdate: any = {};
        if (updatedLot.baia !== undefined) dbUpdate.baia = updatedLot.baia;
        if (updatedLot.avesIds !== undefined) dbUpdate.aves_ids = updatedLot.avesIds;
        if (updatedLot.dataInicio !== undefined) dbUpdate.data_inicio = updatedLot.dataInicio;
        if (updatedLot.status !== undefined) dbUpdate.status = updatedLot.status;
        if (
          fullLot && (
            updatedLot.pesoMedioInicial !== undefined ||
            updatedLot.observacao !== undefined ||
            updatedLot.observacoesAdicionais !== undefined ||
            updatedLot.movimentacoes !== undefined ||
            updatedLot.vacinas !== undefined ||
            updatedLot.pesagens !== undefined ||
            updatedLot.raca !== undefined ||
            updatedLot.racaId !== undefined ||
            updatedLot.pesoMeta !== undefined ||
            updatedLot.qtdAves !== undefined ||
            updatedLot.ganhoGramasDia !== undefined ||
            updatedLot.consumoRacaoAve !== undefined ||
            updatedLot.idadeInicialDias !== undefined ||
            updatedLot.dataNascimento !== undefined ||
            updatedLot.origem !== undefined ||
            updatedLot.origemPais !== undefined ||
            updatedLot.paiId !== undefined ||
            updatedLot.maeId !== undefined ||
            updatedLot.paiNome !== undefined ||
            updatedLot.maeNome !== undefined ||
            updatedLot.paisTexto !== undefined
          )
        ) {
          dbUpdate.peso_medio_inicial = packageMeatLotWeight(fullLot);
        }

        if (Object.keys(dbUpdate).length > 0) {
          supabase!
            .from('meat_lots')
            .update(dbUpdate)
            .eq('id', id)
            .then(
              ({ error }) => {
                if (error) {
                  console.warn('Erro Supabase editMeatLot, enfileirando offline:', error);
                  enqueueMutation('meat_lots', 'update', dbUpdate, { column: 'id', value: id });
                }
              },
              () => { enqueueMutation('meat_lots', 'update', dbUpdate, { column: 'id', value: id }); }
            );
        }
      }
      return next;
    });
  };

  const removeEggLot = (id: string) => {
    setEggLots(prev => {
      const next = prev.filter(l => l.id !== id);
      eggLotsRef.current = next;
      localforage.setItem(getStorageKey('egglots'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:egglots', next).catch(() => {});
        localforage.setItem('@mura-manager:egglots', next).catch(() => {});
      }
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('egg_lots')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase removeEggLot, enfileirando offline:', error);
                enqueueMutation('egg_lots', 'delete', null, { column: 'id', value: id });
              }
            },
            () => {
              enqueueMutation('egg_lots', 'delete', null, { column: 'id', value: id });
            }
          );
      }
      return next;
    });
  };

  const removeMeatLot = (id: string) => {
    setMeatLots(prev => {
      const next = prev.filter(l => l.id !== id);
      meatLotsRef.current = next;
      localforage.setItem(getStorageKey('meatlots'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:meatlots', next).catch(() => {});
        localforage.setItem('@mura-manager:meatlots', next).catch(() => {});
      }
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('meat_lots')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase removeMeatLot, enfileirando offline:', error);
                enqueueMutation('meat_lots', 'delete', null, { column: 'id', value: id });
              }
            },
            () => {
              enqueueMutation('meat_lots', 'delete', null, { column: 'id', value: id });
            }
          );
      }
      return next;
    });
  };

  const updateFarmSettings = (settings: Partial<FarmSettings>) => {
    setFarmSettings(prev => {
      const next = { ...prev, ...settings };
      localforage.setItem(getStorageKey('settings'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:settings', next).catch(err => console.error(err));
      }
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('profiles')
          .upsert({ id: targetUserId, name: next.name, photo: next.photo, email: next.email, phone: next.phone })
          .then(({ error }) => { if (error) console.error('Erro Supabase updateFarmSettings:', error); });
      }
      return next;
    });
  };

  const importBackup = async (backupData: any) => {
    if (!backupData) return;
    const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user?.id;
    
    if (backupData.breeds) {
      setBreeds(backupData.breeds);
      await localforage.setItem(getStorageKey('breeds'), backupData.breeds);
      if (isSupabaseConfigured && user) {
        await supabase!.from('breeds').delete().eq('user_id', targetUserId);
        const toInsert = backupData.breeds.map((b: any) => ({
          id: b.id,
          user_id: targetUserId,
          nome: b.nome,
          foco: b.foco,
          descricao: b.descricao,
          imagem: b.imagem,
          tempo_crescimento: b.tempoCrescimento || 0,
          peso_medio: b.pesoMedio || ''
        }));
        await supabase!.from('breeds').insert(toInsert);
      }
    }
    if (backupData.birds) {
      setBirds(backupData.birds);
      await localforage.setItem(getStorageKey('birds'), backupData.birds);
      if (isSupabaseConfigured && user) {
        await supabase!.from('birds').delete().eq('user_id', targetUserId);
        const toInsert = backupData.birds.map((b: any) => ({
          id: b.id,
          user_id: targetUserId,
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
          peso: b.peso,
          imagens: b.imagens || [],
          observacoes: b.observacoes || ''
        }));
        await supabase!.from('birds').insert(toInsert);
      }
    }
    if (backupData.couples) {
      setCouples(backupData.couples);
      await localforage.setItem(getStorageKey('couples'), backupData.couples);
      if (isSupabaseConfigured && user) {
        await supabase!.from('couples').delete().eq('user_id', targetUserId);
        const toInsert = backupData.couples.map((c: any) => ({
          id: c.id,
          user_id: targetUserId,
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
        await supabase!.from('egg_lots').delete().eq('user_id', targetUserId);
        const toInsert = backupData.egglots.map((l: any) => ({
          id: l.id,
          user_id: targetUserId,
          baia: l.baia,
          femeas_ids: l.femeasIds || [],
          expectativa_diaria: l.expectativaDiaria || 0,
          data_inicio: l.dataInicio || '',
          status: l.status || 'Ativo',
          registros: packageEggLotRegistros(l)
        }));
        await supabase!.from('egg_lots').insert(toInsert);
      }
    }
    if (backupData.meatlots) {
      setMeatLots(backupData.meatlots);
      await localforage.setItem(getStorageKey('meatlots'), backupData.meatlots);
      if (isSupabaseConfigured && user) {
        await supabase!.from('meat_lots').delete().eq('user_id', targetUserId);
        const toInsert = backupData.meatlots.map((l: any) => ({
          id: l.id,
          user_id: targetUserId,
          baia: l.baia,
          aves_ids: l.avesIds || [],
          data_inicio: l.dataInicio || '',
          peso_medio_inicial: packageMeatLotWeight(l),
          status: l.status || 'Crescimento'
        }));
        await supabase!.from('meat_lots').insert(toInsert);
      }
    }
    if (backupData.coupleEggs) {
      setCoupleEggs(backupData.coupleEggs);
      await localforage.setItem(getStorageKey('couple-eggs'), backupData.coupleEggs);
      if (isSupabaseConfigured && user) {
        await supabase!.from('couple_eggs').delete().eq('user_id', targetUserId);
        const toInsert = backupData.coupleEggs.map((e: any) => ({
          id: e.id,
          user_id: targetUserId,
          couple_id: e.coupleId,
          femea_id: e.femeaId,
          status: e.status,
          data_introducao: e.dataIntroducao
        }));
        await supabase!.from('couple_eggs').insert(toInsert);
      }
    }
    if (backupData.incubationLots) {
      setIncubationLots(backupData.incubationLots);
      await localforage.setItem(getStorageKey('incubation-lots'), backupData.incubationLots);
      if (isSupabaseConfigured && user) {
        await supabase!.from('incubation_lots').delete().eq('user_id', targetUserId);
        const toInsert = backupData.incubationLots.map((l: any) => ({
          id: l.id,
          user_id: targetUserId,
          couple_id: l.coupleId,
          numero_lote: l.numeroLote,
          quantidade_ovos: l.quantidadeOvos,
          data_inicio: l.dataInicio,
          baia: l.baia,
          ovoscopia1_realizada: l.ovoscopia1Realizada || false,
          ovoscopia2_realizada: l.ovoscopia2Realizada || false,
          ovos_descartados1: l.ovosDescartados1 || 0,
          ovos_descartados2: l.ovosDescartados2 || 0,
          eclodido: l.eclodido || false
        }));
        await supabase!.from('incubation_lots').insert(toInsert);
      }
    }
    if (backupData.settings) {
      setFarmSettings(backupData.settings);
      await localforage.setItem(getStorageKey('settings'), backupData.settings);
      if (isSupabaseConfigured && user) {
        await supabase!.from('profiles').upsert({
          id: targetUserId,
          name: backupData.settings.name,
          photo: backupData.settings.photo,
          email: backupData.settings.email,
          phone: backupData.settings.phone
        });
      }
    }
  };

  const openAddBirdModal = useCallback((breedName?: string, birdId?: string) => {
    setPreSelectedBreedForNewBird(breedName || '');
    setBirdToEditId(birdId || null);
    setIsAddBirdModalOpen(true);
    setSelectedBirdProfileId(null);
  }, []);

  const openBirdProfile = useCallback((birdId: string) => {
    setSelectedBirdProfileId(birdId);
    setIsAddBirdModalOpen(false);
  }, []);

  const closeModals = useCallback(() => {
    setIsAddBirdModalOpen(false);
    setSelectedBirdProfileId(null);
    setBirdToEditId(null);
  }, []);

  const openTutorial = useCallback(() => {
    setIsTutorialOpen(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsTutorialOpen(false);
    localforage.setItem(getStorageKey('has-seen-tutorial'), true).catch(console.error);
    localStorage.setItem('@mura-manager:has-seen-tutorial', 'true');
    if (user) {
      localStorage.setItem(`@mura-manager:${user.id}:has-seen-tutorial`, 'true');
    }
  }, [getStorageKey, user]);

  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);

  const startTour = useCallback(() => setIsTourOpen(true), []);
  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      localStorage.setItem('@mura-manager:hasSeenTour_v1', 'true');
    } catch {}
  }, []);
  const finishTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      localStorage.setItem('@mura-manager:hasSeenTour_v1', 'true');
    } catch {}
  }, []);

  const { triggerSuccess, triggerWarning, triggerError, triggerLight } = useHaptics();

  type ToastItem = {
    id: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  };
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    if (type === 'success') triggerSuccess();
    else if (type === 'warning') triggerWarning();
    else if (type === 'error') triggerError();
    else triggerLight();

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);

    setTimeout(() => {
      dismissToast(id);
    }, 3500);
  }, [triggerSuccess, triggerWarning, triggerError, triggerLight, dismissToast]);

  const openProfileSetup = useCallback(() => setIsProfileSetupOpen(true), []);
  const closeProfileSetup = useCallback(() => setIsProfileSetupOpen(false), []);
  const finishProfileSetup = useCallback(() => {
    setIsProfileSetupOpen(false);
    localStorage.setItem('@mura-manager:hasSetupProfile_v1', 'true');
  }, []);

  const recoverAllBirds = useCallback(async () => {
    const res = await deepScanAllStorage(user?.id);
    const deletedBirdIds = getDeletedBirdIds();
    const validBirds = res.birds.filter(b => b && b.id && !deletedBirdIds.has(b.id));
    if (validBirds.length > 0) {
      setBirds(validBirds);
      await localforage.setItem(getStorageKey('birds'), validBirds);
      if (isCurrentUserAdmin) {
        await localforage.setItem('@mura-manager:admin:birds', validBirds);
        await localforage.setItem('@mura-manager:birds', validBirds);
      }
      showToast(`${validBirds.length} ave(s) recuperada(s) com sucesso!`, 'success');
    } else {
      showToast('Nenhuma ave encontrada no armazenamento local deste dispositivo.', 'info');
    }
    return { ...res, count: validBirds.length, birds: validBirds };
  }, [user, isCurrentUserAdmin, getStorageKey, showToast, getDeletedBirdIds]);

  const isVitrineUnlocked = useMemo(() => birds.length >= 10, [birds.length]);
  const vitrineBirds = useMemo(() => {
    return birds.filter(b => b && (b.inVitrine !== undefined ? b.inVitrine : Boolean(vitrineConfig[b.id]?.inVitrine)));
  }, [birds, vitrineConfig]);

  const toggleBirdVitrine = useCallback((
    birdId: string, 
    inVitrine: boolean, 
    price?: string, 
    status?: 'Disponível' | 'Reservado' | 'Vendido' | 'Destaque'
  ) => {
    editBird(birdId, {
      inVitrine,
      ...(price !== undefined ? { vitrinePrice: price } : {}),
      ...(status !== undefined ? { vitrineStatus: status } : {})
    });
    showToast(inVitrine ? 'Ave adicionada à vitrine pública!' : 'Ave removida da vitrine.', 'info');
  }, [editBird, showToast]);

  const contextValue = useMemo(() => ({
    isReady,
    isInitialSyncDone,
    breeds, addBreed, editBreed, removeBreed,
    birds, addBird, editBird, removeBird,
    couples, addCouple, editCouple, removeCouple,
    coupleEggs, addCoupleEgg, editCoupleEgg, removeCoupleEgg,
    eggLots, addEggLot, editEggLot, removeEggLot,
    meatLots, addMeatLot, editMeatLot, removeMeatLot,
    farmSettings, setFarmSettings, updateFarmSettings,
    importBackup,
    isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
    openAddBirdModal, openBirdProfile, closeModals,
    isTutorialOpen, openTutorial, closeTutorial,
    activeBreed, setActiveBreed,
    incubationLots, addIncubationLot, editIncubationLot, removeIncubationLot,
    showToast,
    recoverAllBirds,
    isVitrineUnlocked, vitrineBirds, vitrineConfig, toggleBirdVitrine,
    isTourOpen, isProfileSetupOpen,
    startTour, closeTour, finishTour,
    openProfileSetup, closeProfileSetup, finishProfileSetup,
    trialSharedBirdIds, trialSharesCount, maxTrialShares,
    canShareBird, registerBirdShare,
    isUpgradeModalOpen, selectedUpgradePlan, openUpgradeModal, closeUpgradeModal
  }), [
    isReady, isInitialSyncDone, breeds, birds, couples, coupleEggs, eggLots, meatLots, farmSettings,
    isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
    isTutorialOpen, activeBreed, incubationLots, showToast, recoverAllBirds, isTourOpen, isProfileSetupOpen,
    isVitrineUnlocked, vitrineBirds, vitrineConfig, toggleBirdVitrine,
    trialSharedBirdIds, trialSharesCount, maxTrialShares,
    canShareBird, registerBirdShare,
    isUpgradeModalOpen, selectedUpgradePlan, openUpgradeModal, closeUpgradeModal
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center w-full max-w-sm px-4 pointer-events-none">
          {toasts.map(t => {
            const isSuccess = t.type === 'success';
            const isWarning = t.type === 'warning';
            const isError = t.type === 'error';

            const containerStyle = isSuccess
              ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100 shadow-emerald-950/50 shadow-xl'
              : isWarning
              ? 'border-amber-500/40 bg-amber-950/90 text-amber-100 shadow-amber-950/50 shadow-xl'
              : isError
              ? 'border-rose-500/40 bg-rose-950/90 text-rose-100 shadow-rose-950/50 shadow-xl'
              : 'border-blue-500/40 bg-blue-950/90 text-blue-100 shadow-blue-950/50 shadow-xl';

            const Icon = isSuccess ? CheckCircle2 : isWarning ? AlertTriangle : isError ? XCircle : Info;
            const iconColor = isSuccess ? 'text-emerald-400' : isWarning ? 'text-amber-400' : isError ? 'text-rose-400' : 'text-blue-400';

            return (
              <div
                key={t.id}
                className={`relative overflow-hidden w-full px-4 py-3 rounded-2xl border backdrop-blur-xl pointer-events-auto flex items-center justify-between gap-3 animate-scale-up select-none ${containerStyle}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Icon size={18} className={`${iconColor} shrink-0`} />
                  <span className="text-xs font-bold tracking-wide truncate">{t.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="text-white/40 hover:text-white transition-colors shrink-0 p-0.5"
                >
                  <X size={14} />
                </button>
                {/* Linha de progresso com contagem regressiva */}
                <div
                  className="absolute bottom-0 left-0 h-[2px] w-full bg-white/25"
                  style={{ animation: 'toast-shrink 3500ms linear forwards' }}
                />
              </div>
            );
          })}
        </div>
      )}
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
