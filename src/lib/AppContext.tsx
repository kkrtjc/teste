import { todayLocalISO, normalizeDateToISO } from './dates';
import {
  recordTombstone,
  clearTombstone,
  getTombstonesAsync,
  markPendingDelete,
  clearPendingDelete,
  getPendingDeletes,
  type EntityType
} from './tombstones';
import { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import localforage from 'localforage';
import { useAuth, isUserAdmin, ADMIN_CANONICAL_ID, type SubscriptionPlan } from './AuthContext';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { useHaptics } from '../hooks/useHaptics';
import { enqueueMutation, processSyncQueue } from './syncQueue';
import { deepScanAllStorage } from './dataRecovery';
import { preloadBirdImagesInBackground } from './birdImageCache';
import { AtomicStore, shallowEqual } from './appStore';
import type { BirdMovement, NewMovementInput, BirdLike, MovementType, PaymentMethod } from './sales/types';
import {
  registerMovement,
  reverseMovement,
  markReceived,
  reconcileLedger,
  mergeLedgers
} from './sales/ledger';
import { getMovementCents, parseMoneyToCents, formatBRL } from './sales/money';
import { 
  type NotificationSettings, 
  DEFAULT_NOTIF_SETTINGS, 
  getNotificationSettings, 
  saveNotificationSettings,
  type DailyFeedStatus,
  getDailyFeedStatus,
  saveDailyFeedStatus,
  playAlertChime
} from './notificationEngine';

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
  paiNome?: string;
  maeNome?: string;
  paiAnilha?: string;
  maeAnilha?: string;
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

export const DEFAULT_FARM_SETTINGS: FarmSettings = {
  name: '',
  photo: '',
  email: '',
  phone: '',
  city: '',
  state: ''
};

export type AppContextType = {
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
  
  farmSettings: FarmSettings;
  setFarmSettings: (settings: FarmSettings) => void;
  updateFarmSettings: (settings: Partial<FarmSettings>) => void;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  toggleMasterNotifications: (enabled?: boolean) => Promise<void>;
  dailyFeedStatus: DailyFeedStatus;
  confirmDailyFeed: (slot: 'manha' | 'tarde') => Promise<void>;
  unconfirmDailyFeed: (slot: 'manha' | 'tarde') => Promise<void>;
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
  isProfileSetupOpen?: boolean;
  openProfileSetup?: () => void;
  closeProfileSetup?: () => void;
  finishProfileSetup?: () => void;

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

  // Vendas e Histórico Forense de Movimentações
  movements: BirdMovement[];
  registerBirdMovement: (input: NewMovementInput) => Promise<{ success: boolean; movement?: BirdMovement; error?: string }>;
  reverseBirdMovement: (movementId: string, motivo: string) => Promise<{ success: boolean; movement?: BirdMovement; error?: string }>;
  markPaymentReceived: (movementId: string, dataPagamento?: string) => Promise<{ success: boolean; movement?: BirdMovement; error?: string }>;
  updateBirdMovementValue: (movementId: string, valorCentavos: number, formaPagamento?: PaymentMethod) => Promise<{ success: boolean; movement?: BirdMovement; error?: string }>;
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
    user
      ? (isUserAdmin(user.email) || isUserAdmin(user.id))
      : (isAuthAdmin || isUserAdmin(cpf))
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

  // Gravação ultra-segura no armazenamento local (protege contra QuotaExceededError no Safari iOS em Aba Anônima)
  const safeStorageSet = useCallback(async (key: string, value: any) => {
    try {
      await localforage.setItem(key, value);
    } catch (e) {
      console.warn(`[SafeStorage] Não foi possível persistir "${key}" (ignorado defensivamente):`, e);
    }
  }, []);

  const [isReady, setIsReady] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const birdsRef = useRef<Bird[]>([]);
  useEffect(() => { birdsRef.current = birds; }, [birds]);
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
  const [incubationLots, setIncubationLots] = useState<IncubationLot[]>([]);
  const [movements, setMovements] = useState<BirdMovement[]>([]);
  const movementsRef = useRef<BirdMovement[]>([]);
  useEffect(() => { movementsRef.current = movements; }, [movements]);

  // Auto-reconciliação contínua:
  // 1) Reconcilia aves marcadas como Vendido/Baixado que ainda não constam no livro-razão (movements)
  // 2) Auto-cura de vendas registradas sem centavos (valor zero) vinculando o preço cadastrado da ave
  // 3) Auto-cura de vendas legítimas com valor que tenham sido indevidamente marcadas como duplicado
  useEffect(() => {
    if (birds.length === 0) return;
    const hasUnreconciled = birds.some(b => {
      const s = String(b.status || '').toLowerCase().trim();
      return (s === 'vendido' || s === 'faleceu' || s === 'morto' || s === 'abatido' || s === 'baixado') &&
             !movementsRef.current.some(m => m.birdId === b.id && !m.estornado);
    });

    const hasZeroPriceSaleToHeal = movementsRef.current.some(m => {
      if (m.tipo !== 'venda' || m.estornado) return false;
      const cents = getMovementCents(m);
      if (cents > 0) return false;
      const b = birds.find(x => x.id === m.birdId);
      if (!b) return false;
      let rawVal = b.valorVenda ?? b.valorEstimado ?? b.vitrinePrice;
      if (!rawVal && b.observacoes) {
        const match = b.observacoes.match(/\[\[VITRINE:(.*?)\]\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            rawVal = parsed.vitrinePrice || parsed.price;
          } catch {}
        }
      }
      const defined = parseMoneyToCents(rawVal);
      return defined !== null && defined > 0;
    });

    const hasWronglyFlaggedSale = movementsRef.current.some(m => {
      if (!m.flags?.duplicado || m.estornado) return false;
      const otherRealSales = movementsRef.current.some(other => other.birdId === m.birdId && other.id !== m.id && !other.estornado && getMovementCents(other) > 0);
      return !otherRealSales && getMovementCents(m) > 0;
    });

    if (hasUnreconciled || hasZeroPriceSaleToHeal || hasWronglyFlaggedSale) {
      let currentLedger = movementsRef.current;
      if (hasZeroPriceSaleToHeal || hasWronglyFlaggedSale) {
        currentLedger = currentLedger.map(m => {
          let updated = m;
          if (m.flags?.duplicado) {
            const otherRealSales = currentLedger.some(other => other.birdId === m.birdId && other.id !== m.id && !other.estornado && getMovementCents(other) > 0);
            if (!otherRealSales && getMovementCents(m) > 0) {
              const { duplicado: _d, ...restFlags } = updated.flags || {};
              updated = { ...updated, flags: restFlags, updatedAt: Date.now() };
            }
          }
          if (updated.tipo === 'venda' && !updated.estornado && getMovementCents(updated) === 0) {
            const b = birds.find(x => x.id === updated.birdId);
            if (b) {
              let rawVal = b.valorVenda ?? b.valorEstimado ?? b.vitrinePrice;
              if (!rawVal && b.observacoes) {
                const match = b.observacoes.match(/\[\[VITRINE:(.*?)\]\]/);
                if (match) {
                  try {
                    const parsed = JSON.parse(match[1]);
                    rawVal = parsed.vitrinePrice || parsed.price;
                  } catch {}
                }
              }
              const defined = parseMoneyToCents(rawVal);
              if (defined && defined > 0) {
                updated = { ...updated, valorCentavos: defined, updatedAt: Date.now() };
              }
            }
          }
          return updated;
        });
      }

      const reconciled = reconcileLedger(currentLedger, birds, {
        today: todayLocalISO(),
        now: Date.now(),
        deviceId: 'local'
      });
      setMovements(reconciled.ledger);
      movementsRef.current = reconciled.ledger;
      safeStorageSet(getStorageKey('bird-movements'), reconciled.ledger).catch(() => {});
    }
  }, [birds, getStorageKey, safeStorageSet]);
  
  const [farmSettings, setFarmSettings] = useState<FarmSettings>(() => {
    try {
      const u = localStorage.getItem('@mura-manager:cached-user');
      const parsedUser = (user && user.id) ? user : (u ? JSON.parse(u) : null);
      const isAdm = parsedUser ? (isUserAdmin(parsedUser.email) || isUserAdmin(parsedUser.id)) : false;
      const uid = parsedUser?.id || 'guest';
      const scopedRaw = localStorage.getItem(`@mura-manager:cached-farm-settings:${uid}`);
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      if (isAdm) {
        const raw = localStorage.getItem('@mura-manager:cached-farm-settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      }
    } catch {}
    return { ...DEFAULT_FARM_SETTINGS };
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIF_SETTINGS);
  const [dailyFeedStatus, setDailyFeedStatus] = useState<DailyFeedStatus>({});

  useEffect(() => {
    getNotificationSettings().then(cfg => {
      if (cfg) setNotificationSettings(cfg);
    });
    getDailyFeedStatus().then(st => {
      if (st) setDailyFeedStatus(st);
    });

    const onFeedUpdate = () => {
      getDailyFeedStatus().then(st => {
        if (st) setDailyFeedStatus(st);
      });
    };
    window.addEventListener('mura-feed-updated', onFeedUpdate);
    return () => window.removeEventListener('mura-feed-updated', onFeedUpdate);
  }, []);

  // ── Gestão de Tombstones para Exclusão Permanente (evita ressurreição de aves deletadas) ──
  // Lê sincronamente do localStorage (apenas como fallback rápido no render inicial)
  const getUserScope = useCallback(() => {
    if (isCurrentUserAdmin) return 'admin';
    if (!user) return 'guest';
    return user.id;
  }, [user, isCurrentUserAdmin]);

  // Lê sincronamente do localStorage (apenas como fallback rápido no render inicial)
  const getDeletedBirdIds = useCallback((): Set<string> => {
    try {
      const scope = getUserScope();
      const raw = localStorage.getItem(`@mura-manager:${scope}:deleted-bird-ids`);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  }, [getUserScope]);

  // Versão assíncrona: lê do IndexedDB (fonte primária) com fallback para localStorage
  const getDeletedBirdIdsAsync = useCallback(async (): Promise<Set<string>> => {
    const scope = getUserScope();
    try {
      const fromIDB = await localforage.getItem<string[]>(`@mura-manager:${scope}:deleted-bird-ids`);
      if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
        // Sincroniza de volta pro localStorage para que o getter síncrono fique atualizado
        try { localStorage.setItem(`@mura-manager:${scope}:deleted-bird-ids`, JSON.stringify(fromIDB)); } catch {}
        return new Set(fromIDB);
      }
    } catch {}
    // Fallback: lê do localStorage
    try {
      const raw = localStorage.getItem(`@mura-manager:${scope}:deleted-bird-ids`);
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  }, [getUserScope]);

  const recordDeletedBirdId = useCallback((id: string) => {
    const scope = getUserScope();
    try {
      const set = getDeletedBirdIds();
      set.add(id);
      const arr = Array.from(set).slice(-1000);
      // IndexedDB é a fonte primária (iOS não limpa automaticamente)
      localforage.setItem(`@mura-manager:${scope}:deleted-bird-ids`, arr).catch(() => {});
      // localStorage como backup síncrono imediato
      try { localStorage.setItem(`@mura-manager:${scope}:deleted-bird-ids`, JSON.stringify(arr)); } catch {}
    } catch {}
  }, [getUserScope, getDeletedBirdIds]);

  const clearDeletedBirdId = useCallback((id: string) => {
    const scope = getUserScope();
    try {
      const set = getDeletedBirdIds();
      if (set.has(id)) {
        set.delete(id);
        const arr = Array.from(set);
        localforage.setItem(`@mura-manager:${scope}:deleted-bird-ids`, arr).catch(() => {});
        try { localStorage.setItem(`@mura-manager:${scope}:deleted-bird-ids`, JSON.stringify(arr)); } catch {}
      }
    } catch {}
  }, [getUserScope, getDeletedBirdIds]);

  // ── Rastreamento de Aves Criadas Offline (evita re-upload indevido de aves excluídas em outros aparelhos) ──
  const getOfflinePendingBirdIds = useCallback(async (): Promise<Set<string>> => {
    const scope = getUserScope();
    try {
      const arr = await localforage.getItem<string[]>(`@mura-manager:${scope}:offline-pending-birds`);
      if (arr && Array.isArray(arr)) return new Set(arr);
    } catch {}
    return new Set();
  }, [getUserScope]);

  const markPendingOfflineBird = useCallback(async (id: string) => {
    const scope = getUserScope();
    try {
      const set = await getOfflinePendingBirdIds();
      set.add(id);
      await localforage.setItem(`@mura-manager:${scope}:offline-pending-birds`, Array.from(set));
    } catch {}
  }, [getUserScope, getOfflinePendingBirdIds]);

  const clearPendingOfflineBird = useCallback(async (id: string) => {
    const scope = getUserScope();
    try {
      const set = await getOfflinePendingBirdIds();
      if (set.has(id)) {
        set.delete(id);
        await localforage.setItem(`@mura-manager:${scope}:offline-pending-birds`, Array.from(set));
      }
    } catch {}
  }, [getUserScope, getOfflinePendingBirdIds]);

  // ── Rastreamento de Exclusões Pendentes Offline ──
  const getPendingDeleteBirdIds = useCallback(async (): Promise<Set<string>> => {
    const scope = getUserScope();
    try {
      const arr = await localforage.getItem<string[]>(`@mura-manager:${scope}:pending-delete-birds`);
      if (arr && Array.isArray(arr)) return new Set(arr);
    } catch {}
    return new Set();
  }, [getUserScope]);

  const markPendingDeleteBird = useCallback(async (id: string) => {
    const scope = getUserScope();
    try {
      const set = await getPendingDeleteBirdIds();
      set.add(id);
      await localforage.setItem(`@mura-manager:${scope}:pending-delete-birds`, Array.from(set));
    } catch {}
  }, [getUserScope, getPendingDeleteBirdIds]);

  const clearPendingDeleteBird = useCallback(async (id: string) => {
    const scope = getUserScope();
    try {
      const set = await getPendingDeleteBirdIds();
      if (set.has(id)) {
        set.delete(id);
        await localforage.setItem(`@mura-manager:${scope}:pending-delete-birds`, Array.from(set));
      }
    } catch {}
  }, [getUserScope, getPendingDeleteBirdIds]);

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
          isCurrentUserAdmin ? localforage.getItem<any>(legacyKey) : Promise.resolve(null)
        ]);

        // Migração de coleções em array criadas em modo convidado local deste aparelho
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
          await localforage.removeItem(guestKey);
        } else if (!userVal && guestVal) {
          await localforage.setItem(userKey, guestVal);
          await localforage.removeItem(guestKey);
        }

        // DADOS LEGADOS: APENAS o Administrador Principal tem permissão de herdar @mura-manager:${s}!
        // Usuários comuns JAMAIS herdam ou tocam nos dados da chave legada.
        if (isCurrentUserAdmin && legacyVal) {
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

          const finalVal = await localforage.getItem<any>(userKey);
          if (finalVal) {
            await localforage.setItem(`@mura-manager:admin:${s}`, finalVal);
          }
        }
      } catch (err) {
        console.warn(`[Migrate] Erro ao migrar ${s} para o usuário:`, err);
      }
    }
  }, [markPendingOfflineBird, isCurrentUserAdmin]);

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
      {
        suffix: 'settings',
        setter: (d: any) => {
          if (d) {
            setFarmSettings(d);
            try {
              localStorage.setItem('@mura-manager:cached-farm-settings', JSON.stringify(d));
              if (user?.id) localStorage.setItem(`@mura-manager:cached-farm-settings:${user.id}`, JSON.stringify(d));
            } catch {}
          }
        }
      },
      {
        suffix: 'bird-movements', setter: (d: any) => { const list = Array.isArray(d) ? (d as BirdMovement[]) : []; setMovements(list); movementsRef.current = list; } }, { suffix: 'vitrine-config',
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

        const isDataEmpty = !data || (Array.isArray(data) && data.length === 0);
        if (isCurrentUserAdmin && isDataEmpty) {
          const adminData: any = await localforage.getItem(`@mura-manager:admin:${item.suffix}`);
          if (adminData && (!Array.isArray(adminData) || adminData.length > 0)) {
            data = adminData;
          }
          if (!data || (Array.isArray(data) && data.length === 0)) {
            const legacyData: any = await localforage.getItem(`@mura-manager:${item.suffix}`);
            if (legacyData && (!Array.isArray(legacyData) || legacyData.length > 0)) {
              data = legacyData;
            }
          }
        } else if (!user && isDataEmpty) {
          // Apenas visitante anônimo não-autenticado pode ler dados de teste local
          const guestData: any = await localforage.getItem(`@mura-manager:guest:${item.suffix}`);
          if (guestData && (!Array.isArray(guestData) || guestData.length > 0)) {
            data = guestData;
          }
        }
        // Para qualquer usuário comum logado (!isCurrentUserAdmin && user):
        // NUNCA recorre a adminData, legacyData ou guestData! O isolamento é absoluto.

        if (data !== null && data !== undefined) {
          item.setter(data);
        } else if (user && !isCurrentUserAdmin) {
          // Garante estado limpo e seguro para a conta comum
          item.setter(item.suffix === 'breeds' ? DEFAULT_BREEDS : (item.suffix === 'settings' ? DEFAULT_FARM_SETTINGS : (item.suffix === 'vitrine-config' ? {} : [])));
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
    if (isSyncingRef.current && !force) return;
    if (!force && now - lastSyncTimeRef.current < 2500) return;

    isSyncingRef.current = true;
    lastSyncTimeRef.current = now;
    try {
      const isAdmin = Boolean(
        user
          ? (isUserAdmin(user.email) || isUserAdmin(user.id))
          : (isCurrentUserAdmin || isUserAdmin(cpf))
      );
      const targetUserId = isAdmin ? ADMIN_CANONICAL_ID : user.id;

      // Validação estrita de formato UUID (PostgreSQL rejeita com erro 22P02 se não for UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const candidateAdminIds = [
        ADMIN_CANONICAL_ID,
        '99591207-6ed9-4260-8bdb-1a507b67f9af',
        '5f321f02-a40c-48c4-81be-87e8f835d981'
      ];
      if (isAdmin && user?.id) {
        candidateAdminIds.push(user.id);
      }
      const adminUserIds = Array.from(new Set(candidateAdminIds)).filter(id => typeof id === 'string' && uuidRegex.test(id));

      const [
        resBreeds,
        resBirds,
        resCouples,
        resSettings,
        resCoupleEggs,
        resIncubationLots,
        resBirdMovements
      ] = await Promise.all([
        isAdmin
          ? supabase!.from('breeds').select('*').in('user_id', adminUserIds).order('nome', { ascending: true })
          : supabase!.from('breeds').select('*').eq('user_id', targetUserId).order('nome', { ascending: true }),
        isAdmin
          ? supabase!.from('birds').select('id,anilha,nome,sexo,raca,baia,status,vacinas,origem,casal_id,pai_id,mae_id,is_pai_externo,is_mae_externo,data_nascimento,peso,observacoes,user_id,imagem').in('user_id', adminUserIds).order('anilha', { ascending: true })
          : supabase!.from('birds').select('id,anilha,nome,sexo,raca,baia,status,vacinas,origem,casal_id,pai_id,mae_id,is_pai_externo,is_mae_externo,data_nascimento,peso,observacoes,user_id,imagem').eq('user_id', targetUserId).order('anilha', { ascending: true }),
        isAdmin
          ? supabase!.from('couples').select('*').in('user_id', adminUserIds)
          : supabase!.from('couples').select('*').eq('user_id', targetUserId),
        isAdmin
          ? supabase!.from('profiles').select('*').in('id', adminUserIds).order('updated_at', { ascending: false }).limit(1)
          : supabase!.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
        isAdmin
          ? supabase!.from('couple_eggs').select('*').in('user_id', adminUserIds)
          : supabase!.from('couple_eggs').select('*').eq('user_id', targetUserId),
        isAdmin
          ? supabase!.from('incubation_lots').select('*').in('user_id', adminUserIds)
          : supabase!.from('incubation_lots').select('*').eq('user_id', targetUserId),
        isAdmin
          ? (supabase!.from('bird_movements').select('*').in('user_id', adminUserIds).order('data', { ascending: false }) as any).then((r: any) => r, () => ({ data: [], error: null }))
          : (supabase!.from('bird_movements').select('*').eq('user_id', targetUserId).order('data', { ascending: false }) as any).then((r: any) => r, () => ({ data: [], error: null }))
      ]);

      if (resBirds.error) {
        console.error('[Sync] Erro Supabase ao buscar aves:', resBirds.error);
      }

      // 1. Processa deleções pendentes no Supabase para todas as entidades
      const scope = getUserScope();
      const entitiesToSyncDeletes: Array<{ entity: EntityType; table: string }> = [
        { entity: 'birds', table: 'birds' },
        { entity: 'couples', table: 'couples' },
        { entity: 'couple_eggs', table: 'couple_eggs' },
        { entity: 'incubation_lots', table: 'incubation_lots' },
        { entity: 'breeds', table: 'breeds' },
        { entity: 'bird_movements', table: 'bird_movements' },
      ];

      for (const item of entitiesToSyncDeletes) {
        const pending = await getPendingDeletes(item.entity, scope);
        if (pending.size > 0 && isSupabaseConfigured) {
          const arr = Array.from(pending);
          console.log(`[Sync] Executando exclusão pendente de ${arr.length} em ${item.table}...`);
          const { error: delErr } = await supabase!.from(item.table).delete().in('id', arr);
          if (!delErr) {
            for (const dId of arr) {
              await clearPendingDelete(item.entity, dId, scope);
            }
          }
        }
      }

      // Processa também compatibilidade de aves legadas se houver
      const pendingDeleteBirdIdsLegacy = await getPendingDeleteBirdIds();
      if (pendingDeleteBirdIdsLegacy.size > 0 && isSupabaseConfigured) {
        const toDeleteArr = Array.from(pendingDeleteBirdIdsLegacy);
        const { error: delErr } = await supabase!.from('birds').delete().in('id', toDeleteArr);
        if (!delErr) {
          for (const dId of toDeleteArr) {
            await clearPendingDeleteBird(dId);
            await clearPendingDelete('birds', dId, scope);
          }
        }
      }

      // Carrega tombstones universais de todas as entidades
      const [
        coupleTombstones,
        coupleEggTombstones,
        incubationLotTombstones,
        breedTombstones,
        birdTombstonesAsync
      ] = await Promise.all([
        getTombstonesAsync('couples', scope),
        getTombstonesAsync('couple_eggs', scope),
        getTombstonesAsync('incubation_lots', scope),
        getTombstonesAsync('breeds', scope),
        getTombstonesAsync('birds', scope)
      ]);

      let sbBreeds = (resBreeds.data || []).filter((b: any) => !breedTombstones.has(b.id));
      // Carrega tombstones do IndexedDB (fonte primária) + pendingDelete para filtragem dupla
      const currentDeletedIds = await getPendingDeleteBirdIds();
      const allTombstones = await getDeletedBirdIdsAsync();
      // Une os dois conjuntos: pendentes de delete + tombstones históricos
      const allDeletedIds = new Set([...currentDeletedIds, ...allTombstones, ...birdTombstonesAsync]);
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
      let sbCouples = (resCouples.data || []).filter((c: any) => !coupleTombstones.has(c.id));
      let sbSettings = (resSettings.data && Array.isArray(resSettings.data))
        ? (resSettings.data[0] || null)
        : (resSettings.data || null);
      let sbCoupleEggs = (resCoupleEggs.data || []).filter((e: any) => !coupleEggTombstones.has(e.id));
      let sbIncubationLots = (resIncubationLots.data || []).filter((l: any) => !incubationLotTombstones.has(l.id));

      // Carrega dados locais defensivamente combinando memória e storage
      const [
        rawLocalBreeds,
        rawLocalBirds,
        rawLocalCouples,
        rawLocalSettings,
        rawLocalCoupleEggs,
        rawLocalIncubationLots,
        rawLocalMovements
      ]: any = await Promise.all([
        localforage.getItem(getStorageKey('breeds')),
        localforage.getItem(getStorageKey('birds')),
        localforage.getItem(getStorageKey('couples')),
        localforage.getItem(getStorageKey('settings')),
        localforage.getItem(getStorageKey('couple-eggs')),
        localforage.getItem(getStorageKey('incubation-lots')),
        localforage.getItem(getStorageKey('bird-movements'))
      ]);

      const localBirds = ((birds && birds.length > 0) ? birds : (rawLocalBirds || [])).filter((b: any) => b && b.id);
      const localBreeds = (breeds && breeds.length > 0) ? breeds : (rawLocalBreeds || []);
      const localCouples = (couples && couples.length > 0) ? couples : (rawLocalCouples || []);
      const localSettings = rawLocalSettings;
      const localCoupleEggs = (coupleEggs && coupleEggs.length > 0) ? coupleEggs : (rawLocalCoupleEggs || []);
      const localIncubationLots = (incubationLots && incubationLots.length > 0) ? incubationLots : (rawLocalIncubationLots || []);

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
        if (!lb || !lb.nome || breedTombstones.has(lb.id)) continue;
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
        if (breedTombstones.has(db.id)) continue;
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
      safeStorageSet(getStorageKey('breeds'), uniqueBreeds);

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
        const nextVitrineMap: Record<string, { inVitrine: boolean; vitrinePrice?: string; vitrineStatus?: any }> = {};

        const cloudMapped: Bird[] = sbBirdsFromCloud.map((b: any) => {
          const localBird = (localBirds || []).find((x: any) => x.id === b.id);
          const cloudImgs: string[] = (b.imagens && Array.isArray(b.imagens) && b.imagens.length > 0)
            ? b.imagens
            : (b.imagem ? [b.imagem] : []);
          const localImgs: string[] = (localBird?.imagens && localBird.imagens.length > 0)
            ? localBird.imagens
            : (localBird?.imagem ? [localBird.imagem] : []);
          const birdImagens = localImgs.length > 0 ? localImgs : cloudImgs;
          const birdImagem = localBird?.imagem || b.imagem || birdImagens[0] || undefined;

          const parsedCloudVitrine = parseBirdVitrine(b.observacoes);
          const parsedLocalVitrine = parseBirdVitrine(localBird?.observacoes);
          const recentChange = recentVitrineChangesRef.current.get(b.id);
          const isRecentChangeActive = recentChange && (Date.now() - recentChange.timestamp < 30000);

          let isBirdInVitrine: boolean;
          let birdVitrinePrice: string;
          let birdVitrineStatus: any;

          if (isRecentChangeActive) {
            isBirdInVitrine = recentChange.inVitrine;
            birdVitrinePrice = recentChange.vitrinePrice ?? (parsedCloudVitrine.vitrinePrice || localBird?.vitrinePrice || '');
            birdVitrineStatus = recentChange.vitrineStatus ?? (parsedCloudVitrine.vitrineStatus || localBird?.vitrineStatus || 'Disponível');
          } else {
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
            imagem: birdImagem,
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
        safeStorageSet(getStorageKey('vitrine-config'), nextVitrineMap).catch(() => {});
        try {
          localStorage.setItem('@mura-manager:vitrine-config', JSON.stringify(nextVitrineMap));
        } catch {}

        // Adiciona apenas aves locais que foram criadas offline e ainda não chegaram à nuvem
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
      birdsRef.current = finalBirds;
      safeStorageSet(getStorageKey('birds'), finalBirds);

      // ── CARREGAMENTO DE FOTOS EM SEGUNDO PLANO (NON-BLOCKING) ──
      // Busca fotos de alta resolução da nuvem sem atrasar a inicialização do app
      if (isSupabaseConfigured && sbBirdsFromCloud && sbBirdsFromCloud.length > 0) {
        const cloudBirdIds = sbBirdsFromCloud.map((b: any) => b.id);
        (async () => {
          try {
            const { data: photoData } = await supabase!
              .from('birds')
              .select('id,imagem,imagens')
              .in('id', cloudBirdIds);

            if (photoData && photoData.length > 0) {
              const photoMap = new Map<string, { imagem?: string; imagens?: string[] }>();
              photoData.forEach((p: any) => {
                photoMap.set(p.id, {
                  imagem: p.imagem || (p.imagens && p.imagens[0]) || undefined,
                  imagens: p.imagens || (p.imagem ? [p.imagem] : [])
                });
              });

              setBirds(prev => {
                const updated = prev.map(bird => {
                  const p = photoMap.get(bird.id);
                  if (!p) return bird;
                  const imgs = (p.imagens && p.imagens.length > 0) ? p.imagens : (p.imagem ? [p.imagem] : bird.imagens);
                  return {
                    ...bird,
                    imagem: p.imagem || imgs?.[0] || bird.imagem,
                    imagens: imgs && imgs.length > 0 ? imgs : bird.imagens
                  };
                });
                birdsRef.current = updated;
                safeStorageSet(getStorageKey('birds'), updated);
                return updated;
              });
            }
          } catch (photoErr) {
            console.warn('[Sync] Fotos em segundo plano:', photoErr);
          }
        })();
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
      const pendingCouples = (localCouples || []).filter((lc: any) => lc && lc.id && !sbCoupleIds.has(lc.id) && !coupleTombstones.has(lc.id));
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
      safeStorageSet(getStorageKey('couples'), mappedCouples);

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
      const pendingCoupleEggs = (localCoupleEggs || []).filter((le: any) => le && le.id && !sbCoupleEggIds.has(le.id) && !coupleEggTombstones.has(le.id));
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
      safeStorageSet(getStorageKey('couple-eggs'), finalCoupleEggs);

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
      const pendingIncubationLots = (localIncubationLots || []).filter((li: any) => li && li.id && !sbIncubationLotIds.has(li.id) && !incubationLotTombstones.has(li.id));
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
      safeStorageSet(getStorageKey('incubation-lots'), finalIncubationLots);

      // ── MOVIMENTAÇÕES & VENDAS DE AVES (LEDGER IMUTÁVEL) ──
      const rawCloudMovements = (resBirdMovements && Array.isArray(resBirdMovements.data)) ? resBirdMovements.data : [];
      const mappedCloudMovements: BirdMovement[] = rawCloudMovements.map((m: any) => {
        const rawTipo = m.tipo;
        const tipo: MovementType = (rawTipo === 'morte' || rawTipo === 'perda') ? 'perda'
          : (rawTipo === 'abate' || rawTipo === 'descarte' || rawTipo === 'doacao' || rawTipo === 'saida') ? 'saida'
          : rawTipo === 'entrada' ? 'entrada'
          : 'venda';
        const rawPag = m.forma_pagamento;
        const pagamento = rawPag === 'outros' ? 'outro' : rawPag;
        return {
          id: m.id,
          birdId: m.ave_id,
          tipo,
          motivo: m.motivo_perda || (tipo === 'venda' ? 'venda' : tipo === 'perda' ? 'morte' : 'outro'),
          data: normalizeDateToISO(m.data) || m.data,
          valorCentavos: Number(m.valor_centavos || 0),
          comprador: (m.comprador_nome || m.comprador_contato) ? { nome: m.comprador_nome, contato: m.comprador_contato } : undefined,
          pagamento: pagamento || undefined,
          statusPagamento: m.status_pagamento || undefined,
          dataRecebimento: m.data_pagamento ? normalizeDateToISO(m.data_pagamento) : undefined,
          observacao: m.observacoes || undefined,
          snapshot: m.ave_snapshot || { anilha: '', nome: '', raca: '', sexo: '' },
          estornado: Boolean(m.estornado),
          estornoMotivo: m.motivo_estorno || undefined,
          createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
          updatedAt: m.updated_at ? new Date(m.updated_at).getTime() : Date.now(),
          deviceId: 'cloud'
        };
      });

      const localMovements = (Array.isArray(rawLocalMovements) ? rawLocalMovements : (movementsRef.current || [])) as BirdMovement[];
      const mergedMovements = mergeLedgers(localMovements, mappedCloudMovements);
      const reconciled = reconcileLedger(mergedMovements, finalBirds, { today: todayLocalISO(), now: Date.now(), deviceId: 'sync' });
      setMovements(reconciled.ledger);
      movementsRef.current = reconciled.ledger;
      safeStorageSet(getStorageKey('bird-movements'), reconciled.ledger);

      // ── CONFIGURAÇÕES DA FAZENDA ──
      const hasSbProfile = sbSettings && (Boolean(sbSettings.name) || Boolean(sbSettings.photo));
      const hasLocalProfile = localSettings && (Boolean(localSettings.name) || Boolean(localSettings.photo) || Boolean(localSettings.phone));

      if (hasSbProfile) {
        const settingsData = {
          name: sbSettings.name || localSettings?.name || '',
          photo: sbSettings.photo || localSettings?.photo || '',
          email: sbSettings.email || localSettings?.email || '',
          phone: sbSettings.phone || localSettings?.phone || '',
          city: sbSettings.city || localSettings?.city || '',
          state: sbSettings.state || localSettings?.state || ''
        };
        setFarmSettings(settingsData);
        safeStorageSet(getStorageKey('settings'), settingsData);
        try {
          localStorage.setItem('@mura-manager:cached-farm-settings', JSON.stringify(settingsData));
          localStorage.setItem(`@mura-manager:cached-farm-settings:${targetUserId}`, JSON.stringify(settingsData));
        } catch {}
      } else if (hasLocalProfile) {
        setFarmSettings(localSettings);
        try {
          localStorage.setItem('@mura-manager:cached-farm-settings', JSON.stringify(localSettings));
          localStorage.setItem(`@mura-manager:cached-farm-settings:${targetUserId}`, JSON.stringify(localSettings));
        } catch {}
        if (isSupabaseConfigured) {
          await supabase!.from('profiles').upsert({
            id: targetUserId,
            name: localSettings.name || '',
            photo: localSettings.photo || '',
            email: localSettings.email || '',
            phone: localSettings.phone || '',
            city: localSettings.city || '',
            state: localSettings.state || ''
          });
        }
      } else {
        let recoveredSettings: any = null;
        try {
          const raw = localStorage.getItem(`@mura-manager:cached-farm-settings:${targetUserId}`) || (isAdmin ? localStorage.getItem('@mura-manager:cached-farm-settings') : null);
          if (raw) recoveredSettings = JSON.parse(raw);
        } catch {}
        if (recoveredSettings && (recoveredSettings.name || recoveredSettings.photo)) {
          setFarmSettings(recoveredSettings);
          await safeStorageSet(getStorageKey('settings'), recoveredSettings);
        } else {
          setFarmSettings(DEFAULT_FARM_SETTINGS);
          await safeStorageSet(getStorageKey('settings'), DEFAULT_FARM_SETTINGS);
        }
      }

      if (finalBirds.length > 0 || sbSettings) {
        setIsReady(true);
        setIsInitialSyncDone(true);
      }
    } catch (syncError) {
      console.error("Erro na sincronização em background:", syncError);
      // Fallback offline defensivo: só restaura do cache se a memória ainda estiver completamente vazia
      if (birdsRef.current.length === 0) {
        await loadFromLocalForage();
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [user, loadFromLocalForage]);

  const resetAllStateToEmpty = useCallback(() => {
    setBirds([]);
    birdsRef.current = [];
    setBreeds(DEFAULT_BREEDS);
    setCouples([]);
    setCoupleEggs([]);
    setIncubationLots([]);
    setFarmSettings(DEFAULT_FARM_SETTINGS);
    setVitrineConfig({});
    setMovements([]);
    movementsRef.current = [];
  }, []);

  useEffect(() => {
    const handleSignOutEvent = () => {
      resetAllStateToEmpty();
      lastLoadedUserIdRef.current = null;
      const suffixes = ['birds', 'breeds', 'couples', 'couple-eggs', 'incubation-lots', 'settings', 'vitrine-config', 'bird-movements'];
      for (const s of suffixes) {
        localforage.removeItem(`@mura-manager:guest:${s}`).catch(() => {});
      }
    };
    window.addEventListener('mura-user-signed-out', handleSignOutEvent);
    return () => window.removeEventListener('mura-user-signed-out', handleSignOutEvent);
  }, [resetAllStateToEmpty]);

  const lastLoadedUserIdRef = useRef<string | null>(null);

  // Carregamento inicial de dados ao iniciar ou trocar de usuário
  useEffect(() => {
    async function loadData() {
      if (!user) {
        if (lastLoadedUserIdRef.current !== null) {
          resetAllStateToEmpty();
        }
        lastLoadedUserIdRef.current = null;
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

      // Se o usuário trocou (ex: login de outra conta ou nova conta), reseta imediatamente a memória
      if (lastLoadedUserIdRef.current !== user.id) {
        resetAllStateToEmpty();
      }

      // Evita execuções duplicadas e concorrentes para o mesmo usuário se já há dados carregados
      if (lastLoadedUserIdRef.current === user.id && birdsRef.current.length > 0) {
        setIsReady(true);
        setIsInitialSyncDone(true);
        return;
      }
      lastLoadedUserIdRef.current = user.id;

      // Se a memória local está vazia (ex: aba privada ou primeira instalação), reseta isReady para não abrir tela vazia prematura
      if (birdsRef.current.length === 0) {
        setIsReady(false);
      }
      setIsInitialSyncDone(false);

      // ── Migra dados cadastrados offline / como visitante para a conta do usuário que acabou de logar ──
      await migrateGuestAndLocalDataToUser(user.id);

      // ── Carrega cache local imediatamente ──
      // Tombstones do IndexedDB já filtram aves/lotes deletados no loadFromLocalForage
      const localCount = await loadFromLocalForage();
      if (localCount > 0) {
        setIsReady(true);
      } else {
        setIsReady(false);
      }

      // ── Sincroniza com a nuvem para trazer todas as informações do criatório ──
      if (isSupabaseConfigured && navigator.onLine) {
        processSyncQueue().catch(() => {});
        try {
          const syncPromise = syncWithSupabaseBackground(true);
          // Se localCount for 0 (aba privada ou novo aparelho), aguarda a nuvem com tempo seguro de até 15s
          const waitTimeout = (localCount === 0 || !localCount) ? 15000 : 2500;
          await Promise.race([
            syncPromise,
            new Promise(resolve => setTimeout(resolve, waitTimeout))
          ]);
        } catch (err) {
          console.warn('[LoadData] Falha na sync inicial:', err);
        }
      }

      setIsReady(true);
      setIsInitialSyncDone(true);
    }

    loadData();
  }, [user?.id, loadFromLocalForage, syncWithSupabaseBackground, migrateGuestAndLocalDataToUser]);

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
        const now = Date.now();
        if (now - lastSyncTimeRef.current >= 20000 && !isSyncingRef.current) {
          processSyncQueue().catch(() => {});
          syncWithSupabaseBackground(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
      clearInterval(syncInterval);
      supabase!.removeChannel(channel);
      realtimeBroadcastChannelRef.current = null;
    };
  }, [user, syncWithSupabaseBackground]);

  // Pré-aquecimento silencioso e cacheamento local em segundo plano de fotos das aves
  useEffect(() => {
    if (birds.length > 0) {
      preloadBirdImagesInBackground(birds);
    }
  }, [birds]);

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
    const scope = getUserScope();
    clearTombstone('breeds', breed.id, scope);
    setBreeds(prev => {
      const next = [...prev, breed];
      localforage.setItem(getStorageKey('breeds'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        const payload = {
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
        };
        supabase!
          .from('breeds')
          .insert(payload)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase addBreed:', error);
                enqueueMutation('breeds', 'insert', payload);
              } else {
                triggerRemoteSync('breeds');
              }
            },
            () => { enqueueMutation('breeds', 'insert', payload); }
          );
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
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase editBreed:', error);
                enqueueMutation('breeds', 'update', dbUpdate, { column: 'id', value: id });
              } else {
                triggerRemoteSync('breeds');
              }
            },
            () => { enqueueMutation('breeds', 'update', dbUpdate, { column: 'id', value: id }); }
          );
      }
      return next;
    });
  };

  const removeBreed = (id: string) => {
    const scope = getUserScope();
    recordTombstone('breeds', id, scope);
    markPendingDelete('breeds', id, scope);
    const breedToDelete = breeds.find(b => b.id === id);
    setBreeds(prev => {
      const next = prev.filter(b => b.id !== id);
      localforage.setItem(getStorageKey('breeds'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('breeds')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase removeBreed:', error);
                enqueueMutation('breeds', 'delete', null, { column: 'id', value: id });
              } else {
                clearPendingDelete('breeds', id, scope);
                triggerRemoteSync('breeds');
              }
            },
            () => { enqueueMutation('breeds', 'delete', null, { column: 'id', value: id }); }
          );
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
    const scope = getUserScope();
    clearTombstone('birds', bird.id, scope);
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
      dataCadastro: bird.dataCadastro || todayLocalISO()
    };
    setBirds(prev => {
      const next = [...prev, birdWithDate];
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
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
      const effectiveStatus = updatedBird.status !== undefined ? updatedBird.status : currentBird?.status;
      const isUnavailableForVitrine = effectiveStatus 
        ? ['vendido', 'faleceu', 'abatido', 'morto'].includes(effectiveStatus.toLowerCase()) 
        : false;

      // Se a ave estiver vendida, morta ou baixada, ela NUNCA deve permanecer na vitrine pública
      const isVit = isUnavailableForVitrine 
        ? false 
        : (updatedBird.inVitrine !== undefined ? updatedBird.inVitrine : Boolean(currentBird?.inVitrine));
      const vitPrice = updatedBird.vitrinePrice !== undefined ? updatedBird.vitrinePrice : (currentBird?.vitrinePrice || '');
      const vitStat = updatedBird.vitrineStatus !== undefined ? updatedBird.vitrineStatus : (currentBird?.vitrineStatus || 'Disponível');

      const rawObs = updatedBird.observacoes !== undefined ? updatedBird.observacoes : (currentBird?.observacoes || '');
      const cleanObs = parseBirdVitrine(rawObs).cleanObservacoes;
      finalObsForDb = formatBirdObservacoesWithVitrine(cleanObs, isVit, vitPrice, vitStat);

      const next = prev.map(b => {
        if (b.id === id) {
          const nextFields = { ...updatedBird };
          if ((updatedBird.status === 'Vendido' || updatedBird.status === 'Faleceu' || updatedBird.status === 'Abatido') && !b.dataBaixa) {
            nextFields.dataBaixa = updatedBird.dataVenda || todayLocalISO();
          }
          if (updatedBird.status && updatedBird.status !== 'Vendido' && updatedBird.status !== 'Faleceu' && updatedBird.status !== 'Abatido') {
            nextFields.dataBaixa = undefined;
            nextFields.dataVenda = undefined;
            nextFields.compradorNome = undefined;
            nextFields.compradorContato = undefined;
          }
          nextFields.inVitrine = isVit;
          nextFields.vitrinePrice = isUnavailableForVitrine ? '' : vitPrice;
          nextFields.vitrineStatus = isUnavailableForVitrine ? 'Vendido' : vitStat;
          nextFields.observacoes = cleanObs;
          return { ...b, ...nextFields };
        }
        return b;
      });
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
      }

      // Persistência robusta de vitrineConfig (isolada e imune a sobrescritas de sync)
      if (isUnavailableForVitrine || updatedBird.inVitrine !== undefined || updatedBird.vitrinePrice !== undefined || updatedBird.vitrineStatus !== undefined) {
        setVitrineConfig(vPrev => {
          const prevEntry = vPrev[id] || {};
          const isVitVal = isUnavailableForVitrine ? false : (updatedBird.inVitrine !== undefined ? updatedBird.inVitrine : prevEntry.inVitrine);
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
    const scope = getUserScope();
    recordTombstone('birds', id, scope);
    markPendingDelete('birds', id, scope);
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
                clearPendingDelete('birds', id, scope);
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
    const scope = getUserScope();
    clearTombstone('couples', couple.id, scope);
    setCouples(prev => {
      const next = [...prev, couple];
      localforage.setItem(getStorageKey('couples'), next).catch(err => console.error(err));

      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        const payload = {
          id: couple.id,
          user_id: targetUserId,
          macho_id: couple.machoId,
          femea_id: couple.femeaIds?.[0] || couple.femeaId || '',
          objetivo: couple.objetivo,
          data_inicio: couple.dataInicio,
          status: couple.status
        };
        supabase!
          .from('couples')
          .insert(payload)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase addCouple:', error);
                enqueueMutation('couples', 'insert', payload);
              } else {
                triggerRemoteSync('couples');
              }
            },
            () => { enqueueMutation('couples', 'insert', payload); }
          );
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
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase editCouple:', error);
                enqueueMutation('couples', 'update', dbUpdate, { column: 'id', value: id });
              } else {
                triggerRemoteSync('couples');
              }
            },
            () => { enqueueMutation('couples', 'update', dbUpdate, { column: 'id', value: id }); }
          );
      }
      return next;
    });
  };

  const removeCouple = (id: string) => {
    const scope = getUserScope();
    recordTombstone('couples', id, scope);
    markPendingDelete('couples', id, scope);
    setCouples(prev => {
      const next = prev.filter(c => c.id !== id);
      localforage.setItem(getStorageKey('couples'), next).catch(err => console.error(err));
 
      if (isSupabaseConfigured && user) {
        supabase!
          .from('couples')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase removeCouple:', error);
                enqueueMutation('couples', 'delete', null, { column: 'id', value: id });
              } else {
                clearPendingDelete('couples', id, scope);
                triggerRemoteSync('couples');
              }
            },
            () => { enqueueMutation('couples', 'delete', null, { column: 'id', value: id }); }
          );
      }
      return next;
    });

    // Remove todos os ovos introduzidos desse casal
    const eggsToRemove = coupleEggs.filter(e => e.coupleId === id);
    eggsToRemove.forEach(e => {
      recordTombstone('couple_eggs', e.id, scope);
      markPendingDelete('couple_eggs', e.id, scope);
    });
    setCoupleEggs(prev => {
      const next = prev.filter(e => e.coupleId !== id);
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      if (isSupabaseConfigured && user) {
        supabase!
          .from('couple_eggs')
          .delete()
          .eq('couple_id', id)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase cascade couple_eggs:', error);
              } else {
                eggsToRemove.forEach(e => clearPendingDelete('couple_eggs', e.id, scope));
              }
            },
            () => {}
          );
      }
      return next;
    });

    // Remove todos os lotes de incubação desse casal
    const incsToRemove = incubationLots.filter(l => l.coupleId === id);
    incsToRemove.forEach(l => {
      recordTombstone('incubation_lots', l.id, scope);
      markPendingDelete('incubation_lots', l.id, scope);
    });
    setIncubationLots(prev => {
      const next = prev.filter(l => l.coupleId !== id);
      localforage.setItem(getStorageKey('incubation-lots'), next).catch(console.error);
      if (isSupabaseConfigured && user) {
        supabase!
          .from('incubation_lots')
          .delete()
          .eq('couple_id', id)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase cascade incubation_lots:', error);
              } else {
                incsToRemove.forEach(l => clearPendingDelete('incubation_lots', l.id, scope));
              }
            },
            () => {}
          );
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
    const scope = getUserScope();
    clearTombstone('couple_eggs', egg.id, scope);
    setCoupleEggs(prev => {
      const next = [...prev, egg];
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        const payload = {
          id: egg.id,
          user_id: targetUserId,
          couple_id: egg.coupleId,
          femea_id: egg.femeaId,
          status: egg.status,
          data_introducao: egg.dataIntroducao
        };
        supabase!
          .from('couple_eggs')
          .insert(payload)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase addCoupleEgg:', error);
                enqueueMutation('couple_eggs', 'insert', payload);
              }
            },
            () => { enqueueMutation('couple_eggs', 'insert', payload); }
          );
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
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase editCoupleEgg:', error);
                enqueueMutation('couple_eggs', 'update', dbUpdate, { column: 'id', value: id });
              }
            },
            () => { enqueueMutation('couple_eggs', 'update', dbUpdate, { column: 'id', value: id }); }
          );
      }
      return next;
    });
  };

  const removeCoupleEgg = (id: string) => {
    const scope = getUserScope();
    recordTombstone('couple_eggs', id, scope);
    markPendingDelete('couple_eggs', id, scope);
    setCoupleEggs(prev => {
      const next = prev.filter(e => e.id !== id);
      localforage.setItem(getStorageKey('couple-eggs'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('couple_eggs')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase removeCoupleEgg:', error);
                enqueueMutation('couple_eggs', 'delete', null, { column: 'id', value: id });
              } else {
                clearPendingDelete('couple_eggs', id, scope);
              }
            },
            () => { enqueueMutation('couple_eggs', 'delete', null, { column: 'id', value: id }); }
          );
      }
      return next;
    });
  };

  /* ── IncubationLot CRUD ── */
  const addIncubationLot = (lot: IncubationLot) => {
    const scope = getUserScope();
    clearTombstone('incubation_lots', lot.id, scope);
    setIncubationLots(prev => {
      const next = [...prev, lot];
      localforage.setItem(getStorageKey('incubation-lots'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        const payload = {
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
        };
        supabase!
          .from('incubation_lots')
          .insert(payload)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase addIncubationLot:', error);
                enqueueMutation('incubation_lots', 'insert', payload);
              }
            },
            () => { enqueueMutation('incubation_lots', 'insert', payload); }
          );
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
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase editIncubationLot:', error);
                enqueueMutation('incubation_lots', 'update', dbUpdate, { column: 'id', value: id });
              }
            },
            () => { enqueueMutation('incubation_lots', 'update', dbUpdate, { column: 'id', value: id }); }
          );
      }
      return next;
    });
  };

  const removeIncubationLot = (id: string) => {
    const scope = getUserScope();
    recordTombstone('incubation_lots', id, scope);
    markPendingDelete('incubation_lots', id, scope);
    setIncubationLots(prev => {
      const next = prev.filter(l => l.id !== id);
      localforage.setItem(getStorageKey('incubation-lots'), next).catch(console.error);
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('incubation_lots')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => { 
              if (error) {
                console.error('Erro Supabase removeIncubationLot:', error);
                enqueueMutation('incubation_lots', 'delete', null, { column: 'id', value: id });
              } else {
                clearPendingDelete('incubation_lots', id, scope);
              }
            },
            () => { enqueueMutation('incubation_lots', 'delete', null, { column: 'id', value: id }); }
          );
      }
      return next;
    });
  };

  const updateFarmSettings = (settings: Partial<FarmSettings>) => {
    setFarmSettings(prev => {
      const next = { ...prev, ...settings };
      localforage.setItem(getStorageKey('settings'), next).catch(err => console.error(err));
      try {
        localStorage.setItem('@mura-manager:cached-farm-settings', JSON.stringify(next));
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : (user?.id || 'guest');
        localStorage.setItem(`@mura-manager:cached-farm-settings:${targetUserId}`, JSON.stringify(next));
      } catch {}
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:settings', next).catch(err => console.error(err));
      }
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('profiles')
          .upsert({
            id: targetUserId,
            name: next.name,
            photo: next.photo,
            email: next.email,
            phone: next.phone,
            city: next.city,
            state: next.state
          })
          .then(({ error }) => { if (error) console.error('Erro Supabase updateFarmSettings:', error); });
      }
      return next;
    });
  };

  const updateNotificationSettings = useCallback(async (settings: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => {
      const next = { ...prev, ...settings };
      saveNotificationSettings(next).catch(err => console.error(err));
      return next;
    });
  }, []);

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
    if (backupData.movements) {
      setMovements(backupData.movements);
      await localforage.setItem(getStorageKey('bird-movements'), backupData.movements);
      if (isSupabaseConfigured && user) {
        await supabase!.from('bird_movements').delete().eq('user_id', targetUserId);
        const toInsert = backupData.movements.map((m: any) => ({
          id: m.id,
          user_id: targetUserId,
          tipo: m.tipo,
          data: m.data,
          ave_id: m.aveId,
          ave_snapshot: m.aveSnapshot || {},
          valor_centavos: m.valorCentavos || 0,
          custo_aquisicao_centavos: m.custoAquisicaoCentavos,
          comprador_nome: m.compradorNome,
          comprador_contato: m.compradorContato,
          forma_pagamento: m.formaPagamento,
          status_pagamento: m.statusPagamento,
          data_pagamento: m.dataPagamento,
          motivo_perda: m.motivoPerda,
          observacoes: m.observacoes,
          origem: m.origem,
          idempotency_key: m.idempotencyKey,
          estornado: m.estornado || false,
          estorno_movimento_id: m.estornoMovimentoId,
          motivo_estorno: m.motivoEstorno
        }));
        await supabase!.from('bird_movements').insert(toInsert);
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-smart-assistant'));
    }
  }, []);

  const closeTutorial = useCallback(() => {
    setIsTutorialOpen(false);
    localforage.setItem(getStorageKey('has-seen-tutorial'), true).catch(console.error);
    localStorage.setItem('@mura-manager:has-seen-tutorial', 'true');
    if (user) {
      localStorage.setItem(`@mura-manager:${user.id}:has-seen-tutorial`, 'true');
    }
  }, [getStorageKey, user]);

  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);

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

  const toggleMasterNotifications = useCallback(async (forcedVal?: boolean) => {
    const nextVal = typeof forcedVal === 'boolean' ? forcedVal : !notificationSettings.enabled;
    await updateNotificationSettings({ enabled: nextVal });
    if (nextVal) {
      playAlertChime();
      showToast('🔔 Alertas e lembretes ativados com sucesso!', 'success');
    } else {
      showToast('🔕 Alertas e lembretes pausados.', 'info');
    }
  }, [notificationSettings.enabled, updateNotificationSettings, showToast]);

  const confirmDailyFeed = useCallback(async (slot: 'manha' | 'tarde') => {
    const nowHM = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const next: DailyFeedStatus = {
      ...dailyFeedStatus,
      [slot]: true,
      [`${slot}Time`]: nowHM,
    };
    setDailyFeedStatus(next);
    await saveDailyFeedStatus(next);
    playAlertChime();
    showToast(`✓ ${slot === 'manha' ? '1º Trato (Manhã)' : '2º Trato (Tarde)'} confirmado às ${nowHM}!`, 'success');
  }, [dailyFeedStatus, showToast]);

  const unconfirmDailyFeed = useCallback(async (slot: 'manha' | 'tarde') => {
    const next: DailyFeedStatus = {
      ...dailyFeedStatus,
      [slot]: false,
      [`${slot}Time`]: undefined,
    };
    setDailyFeedStatus(next);
    await saveDailyFeedStatus(next);
    showToast(`Status do trato de ${slot} desfeito.`, 'info');
  }, [dailyFeedStatus, showToast]);

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
      }
      showToast(`${validBirds.length} ave(s) recuperada(s) com sucesso!`, 'success');
    } else {
      showToast('Nenhuma ave encontrada no armazenamento local deste dispositivo.', 'info');
    }
    return { ...res, count: validBirds.length, birds: validBirds };
  }, [user, isCurrentUserAdmin, getStorageKey, showToast, getDeletedBirdIds]);

  // Helper defensivo: apenas aves vivas e não baixadas/vendidas são elegíveis para a vitrine pública
  const isBirdAvailableForVitrine = useCallback((b: Partial<Bird> | null | undefined): boolean => {
    if (!b) return false;
    const s = (b.status || '').toLowerCase().trim();
    return s !== 'vendido' && s !== 'faleceu' && s !== 'abatido' && s !== 'morto';
  }, []);

  const isVitrineUnlocked = useMemo(() => birds.length >= 10, [birds.length]);
  const vitrineBirds = useMemo(() => {
    return birds.filter(b => 
      b && 
      isBirdAvailableForVitrine(b) && 
      (b.inVitrine !== undefined ? b.inVitrine : Boolean(vitrineConfig[b.id]?.inVitrine))
    );
  }, [birds, vitrineConfig, isBirdAvailableForVitrine]);

  const toggleBirdVitrine = useCallback((
    birdId: string, 
    inVitrine: boolean, 
    price?: string, 
    status?: 'Disponível' | 'Reservado' | 'Vendido' | 'Destaque'
  ) => {
    const target = birds.find(b => b.id === birdId);
    if (inVitrine && target && !isBirdAvailableForVitrine(target)) {
      showToast('Esta ave está vendida ou baixada e não pode ser colocada na vitrine.', 'warning');
      return;
    }
    // Trava rigorosa: A vitrine suporta no máximo 30 aves ao todo
    if (inVitrine) {
      const isAlreadyInVitrine = Boolean(
        target?.inVitrine !== undefined 
          ? target.inVitrine 
          : vitrineConfig[birdId]?.inVitrine
      );
      if (!isAlreadyInVitrine && vitrineBirds.length >= 30) {
        showToast('A vitrine atingiu a capacidade máxima de 30 aves ao todo. Remova alguma ave para adicionar esta.', 'warning');
        return;
      }
    }
    editBird(birdId, {
      inVitrine,
      ...(price !== undefined ? { vitrinePrice: price } : {}),
      ...(status !== undefined ? { vitrineStatus: status } : {})
    });
    showToast(inVitrine ? 'Ave adicionada à vitrine pública!' : 'Ave removida da vitrine.', 'info');
  }, [birds, editBird, showToast, isBirdAvailableForVitrine, vitrineBirds.length, vitrineConfig]);

  // ── MÓDULO DE VENDAS & LEDGER FORENSE DE AVES ──
  const registerBirdMovement = useCallback(async (input: NewMovementInput) => {
    try {
      const birdsMap = new Map<string, BirdLike>(birdsRef.current.map(b => [b.id, b]));
      const today = todayLocalISO();
      const ctx = { today, now: Date.now(), deviceId: 'web' };
      const res = registerMovement(movementsRef.current, birdsMap, input, ctx);
      if (!res.ok) {
        return { success: false, error: res.error };
      }

      const outcome = res.value;
      const nextMovements = outcome.ledger;
      setMovements(nextMovements);
      movementsRef.current = nextMovements;
      safeStorageSet(getStorageKey('bird-movements'), nextMovements);

      if (outcome.birdPatch) {
        const patch = outcome.birdPatch;
        const isSale = outcome.movement.tipo === 'venda';
        const targetBird = birdsRef.current.find(b => b.id === patch.birdId);
        editBird(patch.birdId, {
          status: patch.status,
          valorVenda: isSale ? outcome.movement.valorCentavos / 100 : targetBird?.valorVenda,
          dataVenda: isSale ? outcome.movement.data : targetBird?.dataVenda,
          compradorNome: isSale ? outcome.movement.comprador?.nome : targetBird?.compradorNome,
          compradorContato: isSale ? outcome.movement.comprador?.contato : targetBird?.compradorContato,
          dataBaixa: outcome.movement.data,
          motivoBaixa: outcome.movement.motivo,
        });
      }

      // Mapeamento estrito para satisfazer os check constraints do banco Supabase
      const mapTipoToSupabase = (tipo: string, motivo?: string) => {
        if (tipo === 'venda') return 'venda';
        if (tipo === 'entrada') return 'entrada';
        if (tipo === 'perda') return 'morte';
        if (tipo === 'saida') {
          if (motivo === 'abate') return 'abate';
          if (motivo === 'doacao') return 'doacao';
          return 'descarte';
        }
        return 'venda';
      };

      const mapPaymentToSupabase = (p?: string) => {
        if (!p) return undefined;
        if (['pix', 'dinheiro', 'cartao', 'a_prazo'].includes(p)) return p;
        return 'outros';
      };

      const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : (user?.id || 'guest');
      const cloudPayload = {
        id: outcome.movement.id,
        user_id: targetUserId,
        tipo: mapTipoToSupabase(outcome.movement.tipo, outcome.movement.motivo),
        data: normalizeDateToISO(outcome.movement.data) || outcome.movement.data,
        ave_id: outcome.movement.birdId,
        ave_snapshot: outcome.movement.snapshot,
        valor_centavos: outcome.movement.valorCentavos,
        comprador_nome: outcome.movement.comprador?.nome,
        comprador_contato: outcome.movement.comprador?.contato,
        forma_pagamento: mapPaymentToSupabase(outcome.movement.pagamento),
        status_pagamento: outcome.movement.statusPagamento,
        data_pagamento: outcome.movement.dataRecebimento ? normalizeDateToISO(outcome.movement.dataRecebimento) : undefined,
        motivo_perda: outcome.movement.motivo,
        observacoes: outcome.movement.observacao,
        estornado: outcome.movement.estornado || false,
        motivo_estorno: outcome.movement.estornoMotivo,
        created_at: new Date(outcome.movement.createdAt).toISOString(),
        updated_at: new Date(outcome.movement.updatedAt).toISOString()
      };

      if (isSupabaseConfigured && user) {
        supabase!
          .from('bird_movements')
          .upsert(cloudPayload, { onConflict: 'id' })
          .then(
            ({ error }) => {
              if (error) enqueueMutation('bird_movements', 'upsert', cloudPayload, { column: 'id', value: outcome.movement.id });
            },
            () => {
              enqueueMutation('bird_movements', 'upsert', cloudPayload, { column: 'id', value: outcome.movement.id });
            }
          );
      }

      showToast(
        outcome.movement.tipo === 'venda'
          ? `Venda da ave ${outcome.movement.snapshot.anilha || outcome.movement.snapshot.nome} confirmada!`
          : `Movimentação registrada com sucesso!`,
        'success'
      );

      return { success: true, movement: outcome.movement };
    } catch (err: any) {
      console.error('Erro ao registrar movimentação:', err);
      showToast('Erro ao processar movimentação.', 'error');
      return { success: false, error: err?.message || 'Erro inesperado' };
    }
  }, [birdsRef, isCurrentUserAdmin, user, safeStorageSet, getStorageKey, editBird, showToast]);

  const reverseBirdMovement = useCallback(async (movementId: string, motivo?: string) => {
    try {
      const today = todayLocalISO();
      const ctx = { today, now: Date.now(), deviceId: 'web' };
      const res = reverseMovement(movementsRef.current, { movementId, motivo }, ctx);
      if (!res.ok) {
        showToast(res.error, 'warning');
        return { success: false, error: res.error };
      }

      const outcome = res.value;
      const nextMovements = outcome.ledger;
      setMovements(nextMovements);
      movementsRef.current = nextMovements;
      safeStorageSet(getStorageKey('bird-movements'), nextMovements);

      if (outcome.birdPatch) {
        editBird(outcome.birdPatch.birdId, {
          status: outcome.birdPatch.status,
          dataBaixa: undefined,
          valorVenda: undefined,
          dataVenda: undefined,
          motivoBaixa: undefined,
          compradorNome: undefined,
          compradorContato: undefined,
        });
      }

      if (isSupabaseConfigured && user) {
        supabase!.from('bird_movements').update({
          estornado: true,
          motivo_estorno: motivo,
          updated_at: new Date(outcome.movement.updatedAt).toISOString()
        }).eq('id', movementId).then(() => {});
      }

      showToast('Estorno realizado e ave retornada ao plantel ativo!', 'info');
      return { success: true, movement: outcome.movement };
    } catch (err: any) {
      console.error('Erro ao estornar movimentação:', err);
      showToast('Erro ao estornar movimentação.', 'error');
      return { success: false, error: err?.message || 'Erro inesperado' };
    }
  }, [movementsRef, safeStorageSet, getStorageKey, editBird, user, showToast]);

  const markPaymentReceived = useCallback(async (movementId: string, dataPagamento?: string) => {
    try {
      const today = todayLocalISO();
      const ctx = { today, now: Date.now(), deviceId: 'web' };
      const res = markReceived(movementsRef.current, { movementId, data: dataPagamento || today }, ctx);
      if (!res.ok) {
        showToast(res.error, 'warning');
        return { success: false, error: res.error };
      }

      const outcome = res.value;
      const nextMovements = outcome.ledger;
      setMovements(nextMovements);
      movementsRef.current = nextMovements;
      safeStorageSet(getStorageKey('bird-movements'), nextMovements);

      if (isSupabaseConfigured && user) {
        supabase!.from('bird_movements').update({
          status_pagamento: 'pago',
          data_pagamento: outcome.movement.dataRecebimento,
          updated_at: new Date(outcome.movement.updatedAt).toISOString()
        }).eq('id', movementId).then(() => {});
      }

      showToast('Pagamento confirmado com sucesso!', 'success');
      return { success: true, movement: outcome.movement };
    } catch (err: any) {
      console.error('Erro ao confirmar recebimento:', err);
      showToast('Erro ao confirmar recebimento.', 'error');
      return { success: false, error: err?.message || 'Erro inesperado' };
    }
  }, [movementsRef, safeStorageSet, getStorageKey, user, showToast]);

  const updateBirdMovementValue = useCallback(async (
    movementId: string, 
    valorCentavos: number, 
    formaPagamento?: PaymentMethod
  ) => {
    try {
      const target = movementsRef.current.find(m => m.id === movementId);
      if (!target) return { success: false, error: 'Movimentação não encontrada' };
      if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
        return { success: false, error: 'Informe um valor válido maior que zero.' };
      }

      const updatedMovement: BirdMovement = {
        ...target,
        valorCentavos,
        pagamento: formaPagamento || target.pagamento || 'pix',
        updatedAt: Date.now()
      };

      const nextMovements = movementsRef.current.map(m => m.id === movementId ? updatedMovement : m);
      setMovements(nextMovements);
      movementsRef.current = nextMovements;
      safeStorageSet(getStorageKey('bird-movements'), nextMovements);

      if (target.birdId) {
        editBird(target.birdId, {
          valorVenda: valorCentavos / 100,
        });
      }

      if (isSupabaseConfigured && user) {
        const pMethod = formaPagamento || target.pagamento;
        const validP = pMethod && ['pix', 'dinheiro', 'cartao', 'a_prazo'].includes(pMethod) ? pMethod : 'outros';
        supabase!.from('bird_movements').update({
          valor_centavos: valorCentavos,
          forma_pagamento: validP,
          updated_at: new Date(updatedMovement.updatedAt).toISOString()
        }).eq('id', movementId).then(({ error }) => {
          if (error) console.error('Erro ao atualizar valor da movimentação no Supabase:', error);
        });
      }

      showToast(`Valor da venda atualizado para ${formatBRL(valorCentavos)} com sucesso!`, 'success');
      return { success: true, movement: updatedMovement };
    } catch (err: unknown) {
      console.error('Erro ao atualizar valor da venda:', err);
      showToast('Erro ao atualizar valor da venda.', 'error');
      return { success: false, error: 'Erro inesperado' };
    }
  }, [birdsRef, isCurrentUserAdmin, user, safeStorageSet, getStorageKey, editBird, showToast]);

  const contextValue = useMemo(() => ({
    isReady,
    isInitialSyncDone,
    breeds, addBreed, editBreed, removeBreed,
    birds, addBird, editBird, removeBird,
    couples, addCouple, editCouple, removeCouple,
    coupleEggs, addCoupleEgg, editCoupleEgg, removeCoupleEgg,
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
    isProfileSetupOpen,
    openProfileSetup, closeProfileSetup, finishProfileSetup,
    trialSharedBirdIds, trialSharesCount, maxTrialShares,
    canShareBird, registerBirdShare,
    isUpgradeModalOpen, selectedUpgradePlan, openUpgradeModal, closeUpgradeModal,
    notificationSettings, updateNotificationSettings,
    toggleMasterNotifications, dailyFeedStatus, confirmDailyFeed, unconfirmDailyFeed,
    movements, registerBirdMovement, reverseBirdMovement, markPaymentReceived, updateBirdMovementValue
  }), [
    isReady, isInitialSyncDone, breeds, birds, couples, coupleEggs, farmSettings,
    isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
    isTutorialOpen, activeBreed, incubationLots, showToast, recoverAllBirds, isProfileSetupOpen,
    isVitrineUnlocked, vitrineBirds, vitrineConfig, toggleBirdVitrine,
    trialSharedBirdIds, trialSharesCount, maxTrialShares,
    canShareBird, registerBirdShare,
    isUpgradeModalOpen, selectedUpgradePlan, openUpgradeModal, closeUpgradeModal,
    notificationSettings, updateNotificationSettings,
    toggleMasterNotifications, dailyFeedStatus, confirmDailyFeed, unconfirmDailyFeed,
    movements, registerBirdMovement, reverseBirdMovement, markPaymentReceived, updateBirdMovementValue
  ]);

  // Sincroniza o Store Atômico com a nova referência do estado.
  // 1º render: semeia sem notificar (filhos que usam seletores já leem os dados).
  // Demais: publica no layout effect — antes da pintura, sem "piscar" dados antigos.
  appAtomicStore.init(contextValue);
  useLayoutEffect(() => {
    appAtomicStore.setState(contextValue);
  }, [contextValue]);

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

// ══════════════════════════════════════════════════════════════════════════════
// ── ESTADO ATÔMICO & SELETORES FINOS ──
// Implementação em ./appStore.ts (testada isoladamente em appStore.test.ts).
// ══════════════════════════════════════════════════════════════════════════════

export { shallowEqual };
export const appAtomicStore = new AtomicStore<AppContextType>();

/**
 * Seletor atômico (padrão useSyncExternalStore).
 * O componente só re-renderiza quando o valor selecionado muda (segundo `isEqual`).
 * Não usa useContext — por isso mudanças em outras partes do estado não o afetam.
 */
export function useAppSelector<T>(
  selector: (state: AppContextType) => T,
  isEqual: (prev: T, next: T) => boolean = Object.is
): T {
  const lastRef = useRef<{ value: T } | null>(null);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const isEqualRef = useRef(isEqual);
  isEqualRef.current = isEqual;

  const getSnapshot = useCallback(() => {
    const current = appAtomicStore.getState();
    if (!current) {
      throw new Error('useAppSelector must be used within an AppProvider');
    }
    const next = selectorRef.current(current);
    if (lastRef.current && isEqualRef.current(lastRef.current.value, next)) {
      return lastRef.current.value;
    }
    lastRef.current = { value: next };
    return next;
  }, []);

  return useSyncExternalStore(appAtomicStore.subscribe, getSnapshot, getSnapshot);
}

/**
 * Assina apenas as chaves informadas do estado global.
 *
 *   const { birds, showToast } = useAppSlice('birds', 'showToast');
 *
 * Re-renderiza somente quando alguma dessas chaves muda de referência.
 * Ações (funções) são estáveis — nunca disparam re-render.
 * As chaves devem ser fixas por chamada (como as regras dos hooks).
 */
export function useAppSlice<K extends keyof AppContextType>(...keys: K[]): Pick<AppContextType, K> {
  const keysRef = useRef(keys);
  const selector = useCallback((s: AppContextType) => {
    const out = {} as Pick<AppContextType, K>;
    const ks = keysRef.current;
    for (let i = 0; i < ks.length; i++) out[ks[i]] = s[ks[i]];
    return out;
  }, []);
  return useAppSelector(selector, shallowEqual);
}
