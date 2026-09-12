import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import localforage from 'localforage';
import { useAuth, isUserAdmin, ADMIN_CANONICAL_ID } from './AuthContext';
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
};

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

export type EggLot = {
  id: string;
  baia: string;
  femeasIds: string[];
  qtdFemeas?: number;          // quantidade manual (quando não se vincula aves individuais)
  expectativaDiaria: number;
  dataInicio: string;
  status: 'Ativo' | 'Encerrado';
  raca?: string;
  precoVendaPadrao?: number;   // R$ por dúzia — padrão para aba Ovos
  custoProdPadrao?: number;    // R$ por ovo — padrão para aba Ovos
  observacao?: string;
  registros?: EggDailyRecord[];
  movimentacoes?: LotMovementRecord[];
};

export type WeightRecord = {
  id: string;
  data: string;           // YYYY-MM-DD
  pesoMedioG: number;     // peso médio em gramas (ex: 2450)
  observacao?: string;
};

export type MeatLot = {
  id: string;
  baia: string;
  avesIds: string[];
  qtdAves?: number;            // quantidade manual (quando não se vincula aves individuais)
  dataInicio: string;
  pesoMedioInicial?: string;
  pesoMeta?: string;           // peso alvo de abate
  status: 'Crescimento' | 'Terminação' | 'Abatido';
  raca?: string;
  racaId?: string;
  observacao?: string;
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
};

type AppContextType = {
  isReady: boolean;
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

  // Onboarding & Profile Setup Optional Helpers
  isTourOpen?: boolean;
  isProfileSetupOpen?: boolean;
  openProfileSetup?: () => void;
  closeProfileSetup?: () => void;
  finishProfileSetup?: () => void;
  startTour?: () => void;
  closeTour?: () => void;
  finishTour?: () => void;
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
  const { user, cpf, isAdmin: isAuthAdmin } = useAuth();
  const isCurrentUserAdmin = Boolean(
    isAuthAdmin ||
    (user && isUserAdmin(user.email)) ||
    (user && isUserAdmin(user.id)) ||
    isUserAdmin(cpf)
  );

  const getStorageKey = useCallback((keyName: string) => {
    if (isCurrentUserAdmin) {
      return `@mura-manager:admin:${keyName}`;
    }
    if (!user) return `@mura-manager:guest:${keyName}`;
    return `@mura-manager:${user.id}:${keyName}`;
  }, [user, isCurrentUserAdmin]);

  const [isReady, setIsReady] = useState(false);

  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [coupleEggs, setCoupleEggs] = useState<CoupleEgg[]>([]);
  const [eggLots, setEggLots] = useState<EggLot[]>([]);
  const [meatLots, setMeatLots] = useState<MeatLot[]>([]);
  const [incubationLots, setIncubationLots] = useState<IncubationLot[]>([]);
  
  const [farmSettings, setFarmSettings] = useState<FarmSettings>({
    name: '',
    photo: '',
    email: '',
    phone: ''
  });

  // ── Gestão de Tombstones para Exclusão Permanente (evita ressurreição de aves deletadas) ──
  const getDeletedBirdIds = useCallback((): Set<string> => {
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
      localStorage.setItem('@mura-manager:deleted-bird-ids', JSON.stringify(arr));
      localforage.setItem('@mura-manager:deleted-bird-ids', arr).catch(() => {});
    } catch {}
  }, [getDeletedBirdIds]);

  const clearDeletedBirdId = useCallback((id: string) => {
    try {
      const set = getDeletedBirdIds();
      if (set.has(id)) {
        set.delete(id);
        const arr = Array.from(set);
        localStorage.setItem('@mura-manager:deleted-bird-ids', JSON.stringify(arr));
        localforage.setItem('@mura-manager:deleted-bird-ids', arr).catch(() => {});
      }
    } catch {}
  }, [getDeletedBirdIds]);

  // Helper ultrarrápido (~0ms) para carregar o cache offline em paralelo no primeiro render
  const loadFromLocalForage = useCallback(async () => {
    if (!user) return;
    const deletedBirdIds = getDeletedBirdIds();

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
          setBirds(filtered);
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
      { suffix: 'settings',        setter: (d: any) => { if (d) setFarmSettings(d); } }
    ];

    await Promise.all(storageItems.map(async (item) => {
      try {
        const userKey = getStorageKey(item.suffix);
        let data: any = await localforage.getItem(userKey);

        if (isCurrentUserAdmin && !data) {
          data = await localforage.getItem(`@mura-manager:admin:${item.suffix}`);
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
  }, [user, isCurrentUserAdmin, getStorageKey, getDeletedBirdIds]);

  const isSyncingRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const realtimeDebounceTimerRef = useRef<any>(null);

  // Função principal de sincronização com o Supabase com mesclagem defensiva de dados
  const syncWithSupabaseBackground = useCallback(async (force = false) => {
    if (!isSupabaseConfigured || !user) return;
    const now = Date.now();
    if (isSyncingRef.current) return;
    if (!force && now - lastSyncTimeRef.current < 15000) return;

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
          ? supabase!.from('birds').select('id,anilha,nome,sexo,raca,baia,status,imagem,vacinas,origem,casal_id,pai_id,mae_id,is_pai_externo,is_mae_externo,data_nascimento,peso,observacoes,user_id').in('user_id', adminUserIds).order('anilha', { ascending: true })
          : supabase!.from('birds').select('id,anilha,nome,sexo,raca,baia,status,imagem,vacinas,origem,casal_id,pai_id,mae_id,is_pai_externo,is_mae_externo,data_nascimento,peso,observacoes,user_id').eq('user_id', targetUserId).order('anilha', { ascending: true }),
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

      const deletedBirdIds = getDeletedBirdIds();

      // Expulsa imediatamente aves deletadas que possam ter vindo do Supabase
      const zombieBirdsFromCloud = (resBirds.data || []).filter((b: any) => deletedBirdIds.has(b.id)).map((b: any) => b.id);
      if (zombieBirdsFromCloud.length > 0 && isSupabaseConfigured) {
        supabase!.from('birds').delete().in('id', zombieBirdsFromCloud).then(() => {});
      }

      let sbBreeds = resBreeds.data || [];
      const sbBirdsFromCloud = (!resBirds.error && resBirds.data)
        ? resBirds.data.filter((b: any) => !deletedBirdIds.has(b.id))
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

      const localBirds = ((birds && birds.length > 0) ? birds : (rawLocalBirds || [])).filter((b: any) => b && b.id && !deletedBirdIds.has(b.id));
      const localBreeds = (breeds && breeds.length > 0) ? breeds : (rawLocalBreeds || []);
      const localCouples = (couples && couples.length > 0) ? couples : (rawLocalCouples || []);
      const localEggLots = (eggLots && eggLots.length > 0) ? eggLots : (rawLocalEggLots || []);
      const localMeatLots = (meatLots && meatLots.length > 0) ? meatLots : (rawLocalMeatLots || []);
      const localSettings = rawLocalSettings;
      const localCoupleEggs = (coupleEggs && coupleEggs.length > 0) ? coupleEggs : (rawLocalCoupleEggs || []);
      const localIncubationLots = (incubationLots && incubationLots.length > 0) ? incubationLots : (rawLocalIncubationLots || []);

      // ── SYNC AVES: Cloud-first. A nuvem é a fonte de verdade. ──
      let sbBirds: any[] = sbBirdsFromCloud !== null ? sbBirdsFromCloud : localBirds;
      if (sbBirdsFromCloud === null) {
        console.warn('[Sync] Supabase inacessível no momento, preservando dados locais de aves.');
      }

      const sbBirdIds = new Set<string>(sbBirds.map((b: any) => b.id));
      
      if (sbBirds.length === 0 && localBirds.length > 0) {
        // A nuvem está vazia mas temos aves locais - preserva TODAS que não foram deletadas
        console.log(`[Sync] Nuvem retornou 0 aves. Preservando ${localBirds.length} aves locais e sincronizando com Supabase...`);
        const birdsToInsert = localBirds.map((b: any) => ({
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
        if (isSupabaseConfigured && user) {
          for (let i = 0; i < birdsToInsert.length; i += 5) {
            const chunk = birdsToInsert.slice(i, i + 5);
            try {
              await supabase!.from('birds').upsert(chunk, { onConflict: 'id' });
            } catch (err) {
              console.warn('[Sync] Falha ao upsert aves no Supabase:', err);
            }
          }
        }
        sbBirds = localBirds;
      }

      if (sbEggLots.length === 0 && localEggLots.length > 0) {
        console.log(`[Sync Defensivo] Enviando ${localEggLots.length} lotes de postura locais para o Supabase...`);
        try {
          const eggLotsToInsert = localEggLots.map((l: any) => ({
            id: l.id,
            user_id: targetUserId,
            baia: l.baia,
            femeas_ids: l.femeasIds || [],
            expectativa_diaria: l.expectativaDiaria || 0,
            data_inicio: l.dataInicio || '',
            status: l.status || 'Ativo',
            raca: l.raca || '',
            qtd_femeas: l.qtdFemeas || 0,
            preco_venda_padrao: l.precoVendaPadrao || 6.0,
            custo_prod_padrao: l.custoProdPadrao || 0.30,
            observacao: l.observacao || '',
            registros: l.registros || [],
            movimentacoes: l.movimentacoes || []
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
          const meatLotsToInsert = localMeatLots.map((l: any) => ({
            id: l.id,
            user_id: targetUserId,
            baia: l.baia,
            aves_ids: l.avesIds || [],
            data_inicio: l.dataInicio || '',
            peso_medio_inicial: l.pesoMedioInicial || '',
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

      // ── AVES: Mapeia aves da nuvem (fonte de verdade) ──
      const mappedBirds: Bird[] = sbBirds.map((b: any) => {
        // Preserva fotos que possam existir só no cache local (base64 não armazenado na nuvem)
        const localBird = (localBirds || []).find((x: any) => x.id === b.id);
        let birdImagens = b.imagens || localBird?.imagens || [];
        
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
          observacoes: b.observacoes || localBird?.observacoes || ''
        };
      });

      // Aves existentes localmente que ainda não foram enviadas ao Supabase
      // Preserva SEMPRE: uma vez salvas, só somem se forem explicitamente deletadas
      const unsyncedLocalBirds = (localBirds || []).filter((lb: any) => {
        if (!lb || !lb.id) return false;
        if (sbBirdIds.has(lb.id)) return false;  // Já está na nuvem
        if (deletedBirdIds.has(lb.id)) return false;  // Foi deletada pelo usuário
        return true;
      });
      
      if (unsyncedLocalBirds.length > 0) {
        console.log(`[Sync] Enviando ${unsyncedLocalBirds.length} ave(s) offline para o Supabase...`);
        mappedBirds.push(...unsyncedLocalBirds);

        if (isSupabaseConfigured && user) {
          const birdsToPush = unsyncedLocalBirds.map((b: any) => ({
            id: b.id,
            user_id: targetUserId,
            anilha: b.anilha,
            nome: b.nome,
            sexo: b.sexo,
            raca: b.raca,
            baia: b.baia,
            status: b.status,
            imagem: b.imagens?.[0] || b.imagem,
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
          
          // Envia em lotes de 2 para não estourar o limite de payload HTTP (fotos base64)
          for (let i = 0; i < birdsToPush.length; i += 2) {
            const chunk = birdsToPush.slice(i, i + 2);
            try {
              await supabase!.from('birds').upsert(chunk, { onConflict: 'id' });
            } catch (chunkErr) {
              console.warn('Erro ao subir lote de aves pendentes:', chunkErr);
            }
          }
        }
      }

      // Salva aves da nuvem no cache local para offline
      // A nuvem é a fonte de verdade - substituímos tudo que estava no local
      const finalBirds = mappedBirds.filter(b => !deletedBirdIds.has(b.id));
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

      const sbCoupleIds = new Set<string>(sbCouples.map((c: any) => c.id));
      const unsyncedLocalCouples = (localCouples || []).filter((lc: any) => lc && lc.id && !sbCoupleIds.has(lc.id));
      if (unsyncedLocalCouples.length > 0) {
        console.log(`[Sync Defensivo] Preservando ${unsyncedLocalCouples.length} casal(is) local(is).`);
        mappedCouples.push(...unsyncedLocalCouples);
        if (isSupabaseConfigured && user) {
          const couplesToPush = unsyncedLocalCouples.map((c: any) => ({
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
      }

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

        const localRegs: any[] = local?.registros || [];
        let finalRegs = sbRegs;
        if (localRegs.length > sbRegs.length) {
          finalRegs = localRegs;
          if (isSupabaseConfigured && user) {
            supabase!
              .from('egg_lots')
              .update({ registros: localRegs })
              .eq('id', l.id)
              .then(({ error }) => { if (error) console.error('Erro registros ovos:', error); });
          }
        }

        let sbMovs: any[] = [];
        if (Array.isArray(l.movimentacoes)) {
          sbMovs = l.movimentacoes;
        } else if (typeof l.movimentacoes === 'string' && l.movimentacoes.trim()) {
          try { sbMovs = JSON.parse(l.movimentacoes); } catch { sbMovs = []; }
        }
        const localMovs: any[] = local?.movimentacoes || [];
        let finalMovs = sbMovs.length >= localMovs.length ? sbMovs : localMovs;

        return {
          id: l.id,
          baia: l.baia || '',
          femeasIds: l.femeas_ids || l.femeasIds || [],
          expectativaDiaria: l.expectativa_diaria !== undefined ? l.expectativa_diaria : (l.expectativaDiaria || 0),
          dataInicio: l.data_inicio || l.dataInicio || '',
          status: l.status || 'Ativo',
          raca: l.raca || local?.raca || '',
          qtdFemeas: l.qtd_femeas !== undefined ? l.qtd_femeas : (l.qtdFemeas || local?.qtdFemeas || 0),
          precoVendaPadrao: l.preco_venda_padrao || l.precoVendaPadrao || local?.precoVendaPadrao || 6.0,
          custoProdPadrao: l.custo_prod_padrao || l.custoProdPadrao || local?.custoProdPadrao || 0.30,
          observacao: l.observacao || local?.observacao || '',
          registros: finalRegs,
          movimentacoes: finalMovs
        };
      });

      const sbEggLotIds = new Set<string>(sbEggLots.map((l: any) => l.id));
      const unsyncedEggLots = (localEggLots || []).filter((ll: any) => ll && ll.id && !sbEggLotIds.has(ll.id));
      if (unsyncedEggLots.length > 0) {
        mappedEggLots.push(...unsyncedEggLots);
        if (isSupabaseConfigured && user) {
          const eggLotsToPush = unsyncedEggLots.map((l: any) => ({
            id: l.id,
            user_id: targetUserId,
            baia: l.baia,
            femeas_ids: l.femeasIds || [],
            expectativa_diaria: l.expectativaDiaria || 0,
            data_inicio: l.dataInicio || '',
            status: l.status || 'Ativo',
            raca: l.raca || '',
            qtd_femeas: l.qtdFemeas || 0,
            preco_venda_padrao: l.precoVendaPadrao || 6.0,
            custo_prod_padrao: l.custoProdPadrao || 0.30,
            observacao: l.observacao || '',
            registros: l.registros || [],
            movimentacoes: l.movimentacoes || []
          }));
          supabase!.from('egg_lots').upsert(eggLotsToPush, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Erro lotes ovos pendentes:', error);
          });
        }
      }

      setEggLots(mappedEggLots);
      await localforage.setItem(getStorageKey('egglots'), mappedEggLots);

      // ── LOTES DE CORTE: Mapeamento e preservação ──
      const mappedMeatLots = sbMeatLots.map((l: any) => {
        const local = (localMeatLots || []).find((x: any) => x.id === l.id);

        let sbMovs: any[] = [];
        if (Array.isArray(l.movimentacoes)) {
          sbMovs = l.movimentacoes;
        } else if (typeof l.movimentacoes === 'string' && l.movimentacoes.trim()) {
          try { sbMovs = JSON.parse(l.movimentacoes); } catch { sbMovs = []; }
        }
        const localMovs: any[] = local?.movimentacoes || [];
        let finalMovs = sbMovs.length >= localMovs.length ? sbMovs : localMovs;

        return {
          id: l.id,
          baia: l.baia || '',
          avesIds: l.aves_ids || l.avesIds || [],
          dataInicio: l.data_inicio || l.dataInicio || '',
          pesoMedioInicial: l.peso_medio_inicial || l.pesoMedioInicial || '',
          status: l.status || 'Crescimento',
          raca: l.raca || local?.raca || '',
          racaId: l.raca_id || l.racaId || local?.racaId || undefined,
          observacao: l.observacao || local?.observacao || '',
          pesoMeta: l.peso_meta || l.pesoMeta || local?.pesoMeta || '',
          qtdAves: l.qtd_aves !== undefined ? l.qtd_aves : (l.qtdAves || local?.qtdAves || 0),
          ganhoGramasDia: l.ganho_gramas_dia !== undefined ? l.ganho_gramas_dia : (l.ganhoGramasDia || local?.ganhoGramasDia || undefined),
          consumoRacaoAve: l.consumo_racao_ave !== undefined ? l.consumo_racao_ave : (l.consumoRacaoAve || local?.consumoRacaoAve || undefined),
          pesagens: Array.isArray(l.pesagens) ? l.pesagens : (local?.pesagens || []),
          movimentacoes: finalMovs
        };
      });

      const sbMeatLotIds = new Set<string>(sbMeatLots.map((l: any) => l.id));
      const unsyncedMeatLots = (localMeatLots || []).filter((ml: any) => ml && ml.id && !sbMeatLotIds.has(ml.id));
      if (unsyncedMeatLots.length > 0) {
        mappedMeatLots.push(...unsyncedMeatLots);
        if (isSupabaseConfigured && user) {
          const meatLotsToPush = unsyncedMeatLots.map((l: any) => ({
            id: l.id,
            user_id: targetUserId,
            baia: l.baia,
            aves_ids: l.avesIds || [],
            data_inicio: l.dataInicio || '',
            peso_medio_inicial: l.pesoMedioInicial || '',
            status: l.status || 'Crescimento',
            raca: l.raca || '',
            observacao: l.observacao || '',
            peso_meta: l.pesoMeta || '',
            qtd_aves: l.qtdAves || 0,
            movimentacoes: l.movimentacoes || []
          }));
          supabase!.from('meat_lots').upsert(meatLotsToPush, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Erro lotes corte pendentes:', error);
          });
        }
      }

      setMeatLots(mappedMeatLots);
      await localforage.setItem(getStorageKey('meatlots'), mappedMeatLots);

      // ── OVOS DE CASAL: Mapeamento e preservação ──
      const mappedCoupleEggs = sbCoupleEggs.map((e: any) => ({
        id: e.id,
        coupleId: e.couple_id || e.coupleId || '',
        femeaId: e.femea_id || e.femeaId || '',
        status: e.status || 'Em Espera',
        dataIntroducao: e.data_introducao || e.dataIntroducao || ''
      }));

      const sbCoupleEggIds = new Set<string>(sbCoupleEggs.map((e: any) => e.id));
      const unsyncedLocalCoupleEggs = (localCoupleEggs || []).filter((le: any) => le && le.id && !sbCoupleEggIds.has(le.id));
      if (unsyncedLocalCoupleEggs.length > 0) {
        console.log(`[Sync Defensivo] Preservando ${unsyncedLocalCoupleEggs.length} ovo(s) de casal local(is).`);
        mappedCoupleEggs.push(...unsyncedLocalCoupleEggs);
        if (isSupabaseConfigured && user) {
          const coupleEggsToPush = unsyncedLocalCoupleEggs.map((e: any) => ({
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
      }

      setCoupleEggs(mappedCoupleEggs);
      await localforage.setItem(getStorageKey('couple-eggs'), mappedCoupleEggs);

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

      const sbIncubationLotIds = new Set<string>(sbIncubationLots.map((l: any) => l.id));
      const unsyncedLocalIncubationLots = (localIncubationLots || []).filter((li: any) => li && li.id && !sbIncubationLotIds.has(li.id));
      if (unsyncedLocalIncubationLots.length > 0) {
        console.log(`[Sync Defensivo] Preservando ${unsyncedLocalIncubationLots.length} lote(s) de incubação local(is).`);
        mappedIncubationLots.push(...unsyncedLocalIncubationLots);
        if (isSupabaseConfigured && user) {
          const incubationLotsToPush = unsyncedLocalIncubationLots.map((l: any) => ({
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
      }

      setIncubationLots(mappedIncubationLots);
      await localforage.setItem(getStorageKey('incubation-lots'), mappedIncubationLots);

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

        setBreeds([]);
        setBirds([]);
        setCouples([]);
        setCoupleEggs([]);
        setEggLots([]);
        setMeatLots([]);
        setIncubationLots([]);
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

      // Carrega dados offline locais primeiro (instantâneo ~0ms)
      await loadFromLocalForage();
      setIsReady(true);

      // Sincroniza em segundo plano com a nuvem sem travar a interface
      if (isSupabaseConfigured) {
        processSyncQueue().catch(() => {});
        syncWithSupabaseBackground(true).catch(err => {
          console.error('Erro na sincronização inicial em segundo plano:', err);
        });
      }
    }

    loadData();
  }, [user, loadFromLocalForage, syncWithSupabaseBackground]);

  // Efeito de reconexão automática e sincronização contínua (Online / Focus / Timer 60s)
  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    const handleOnline = () => {
      console.log('[Rede] Conexão restaurada. Disparando fila offline e sincronização com a nuvem...');
      processSyncQueue().catch(() => {});
      syncWithSupabaseBackground();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Foco App] Aplicativo visível. Disparando fila offline e sincronizando...');
        processSyncQueue().catch(() => {});
        syncWithSupabaseBackground();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Canal Realtime do Supabase com proteção rígida contra loops de sincronização
    const channel = supabase!
      .channel('public:realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (isSyncingRef.current) return;
        if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
        realtimeDebounceTimerRef.current = setTimeout(() => {
          if (!isSyncingRef.current) {
            syncWithSupabaseBackground();
          }
        }, 15000);
      })
      .subscribe();

    // Timer de checagem em segundo plano a cada 60 segundos
    const syncInterval = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) {
        syncWithSupabaseBackground();
      }
    }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (realtimeDebounceTimerRef.current) clearTimeout(realtimeDebounceTimerRef.current);
      clearInterval(syncInterval);
      supabase!.removeChannel(channel);
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
    if (isReady) {
      const lsGlobal = localStorage.getItem('@mura-manager:has-seen-tutorial') === 'true';
      const lsUser = user ? localStorage.getItem(`@mura-manager:${user.id}:has-seen-tutorial`) === 'true' : false;

      if (lsGlobal || lsUser) {
        setIsTutorialOpen(false);
        return;
      }

      localforage.getItem(getStorageKey('has-seen-tutorial')).then(val => {
        if (!val) {
          setIsTutorialOpen(true);
        } else {
          setIsTutorialOpen(false);
        }
      }).catch(() => setIsTutorialOpen(false));
    }
  }, [isReady, user]);

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
        if (updatedBreed.tempoCrescimento !== undefined) dbUpdate.tempo_crescimento = updatedBreed.tempoCrescimento;
        if (updatedBreed.pesoMedio !== undefined) dbUpdate.peso_medio = updatedBreed.pesoMedio;
        if (updatedBreed.ganhoGramasDia !== undefined) dbUpdate.ganho_gramas_dia = updatedBreed.ganhoGramasDia;
        if (updatedBreed.conversaoAlimentar !== undefined) dbUpdate.conversao_alimentar = updatedBreed.conversaoAlimentar;

        supabase!
          .from('breeds')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editBreed:', error); });
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
          .eq('user_id', user.id)
          .then(({ error }) => { if (error) console.error('Erro Supabase removeBreed:', error); });
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
    setBirds(prev => {
      const next = [...prev, bird];
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
        localforage.setItem('@mura-manager:birds', next).catch(() => {});
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
          observacoes: bird.observacoes || ''
        };
        supabase!
          .from('birds')
          .insert(payload)
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase addBird, enfileirando offline:', error);
                enqueueMutation('birds', 'insert', payload);
              }
            },
            () => {
              enqueueMutation('birds', 'insert', payload);
            }
          );
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
      if (isCurrentUserAdmin) {
        localforage.setItem('@mura-manager:admin:birds', next).catch(() => {});
        localforage.setItem('@mura-manager:birds', next).catch(() => {});
      }
      
      if (isSupabaseConfigured && user) {
        const dbUpdate: any = { ...updatedBird };
        if (updatedBird.casalId !== undefined) { dbUpdate.casal_id = updatedBird.casalId || null; delete dbUpdate.casalId; }
        if (updatedBird.paiId !== undefined) { dbUpdate.pai_id = updatedBird.paiId || null; delete dbUpdate.paiId; }
        if (updatedBird.maeId !== undefined) { dbUpdate.mae_id = updatedBird.maeId || null; delete dbUpdate.maeId; }
        if (updatedBird.isPaiExterno !== undefined) { dbUpdate.is_pai_externo = !!updatedBird.isPaiExterno; delete dbUpdate.isPaiExterno; }
        if (updatedBird.isMaeExterno !== undefined) { dbUpdate.is_mae_externo = !!updatedBird.isMaeExterno; delete dbUpdate.isMaeExterno; }
        if (updatedBird.dataNascimento !== undefined) { dbUpdate.data_nascimento = updatedBird.dataNascimento || null; delete dbUpdate.dataNascimento; }
        if (updatedBird.peso !== undefined) { dbUpdate.peso = updatedBird.peso || null; }
        if (updatedBird.imagens !== undefined) {
          dbUpdate.imagem = updatedBird.imagens?.[0] || null;
          dbUpdate.imagens = updatedBird.imagens;
        }
        if (updatedBird.observacoes !== undefined) {
          dbUpdate.observacoes = updatedBird.observacoes;
        }
        delete dbUpdate.dataBaixa;

        supabase!
          .from('birds')
          .update(dbUpdate)
          .eq('id', id)
          .then(
            ({ error }) => {
              if (error) {
                console.warn('Erro Supabase editBird, enfileirando offline:', error);
                enqueueMutation('birds', 'update', dbUpdate, { column: 'id', value: id });
              }
            },
            () => {
              enqueueMutation('birds', 'update', dbUpdate, { column: 'id', value: id });
            }
          );
      }
      return next;
    });
  };

  const removeBird = (id: string) => {
    // 1. Grava no túmulo persistente de IDs deletados
    recordDeletedBirdId(id);

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
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('birds')
          .delete()
          .eq('id', id)
          .then(
            ({ error }) => {
              if (error) {
                enqueueMutation('birds', 'delete', null, { column: 'id', value: id });
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
      localforage.setItem(getStorageKey('egglots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('egg_lots')
          .insert({
            id: lot.id,
            user_id: targetUserId,
            baia: lot.baia,
            femeas_ids: lot.femeasIds,
            expectativa_diaria: lot.expectativaDiaria,
            data_inicio: lot.dataInicio,
            status: lot.status,
            raca: lot.raca || '',
            qtd_femeas: lot.qtdFemeas || 0,
            preco_venda_padrao: lot.precoVendaPadrao || 6.0,
            custo_prod_padrao: lot.custoProdPadrao || 0.30,
            observacao: lot.observacao || '',
            registros: lot.registros || [],
            movimentacoes: lot.movimentacoes || []
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
        // Constrói estritamente os campos snake_case válidos para o Supabase
        const dbUpdate: any = {};
        if (updatedLot.baia !== undefined) dbUpdate.baia = updatedLot.baia;
        if (updatedLot.status !== undefined) dbUpdate.status = updatedLot.status;
        if (updatedLot.raca !== undefined) dbUpdate.raca = updatedLot.raca;
        if (updatedLot.observacao !== undefined) dbUpdate.observacao = updatedLot.observacao;
        if (updatedLot.femeasIds !== undefined) dbUpdate.femeas_ids = updatedLot.femeasIds;
        if (updatedLot.expectativaDiaria !== undefined) dbUpdate.expectativa_diaria = updatedLot.expectativaDiaria;
        if (updatedLot.dataInicio !== undefined) dbUpdate.data_inicio = updatedLot.dataInicio;
        if (updatedLot.precoVendaPadrao !== undefined) dbUpdate.preco_venda_padrao = updatedLot.precoVendaPadrao;
        if (updatedLot.custoProdPadrao !== undefined) dbUpdate.custo_prod_padrao = updatedLot.custoProdPadrao;
        if (updatedLot.qtdFemeas !== undefined) dbUpdate.qtd_femeas = updatedLot.qtdFemeas;
        if (updatedLot.registros !== undefined) dbUpdate.registros = updatedLot.registros;
        if (updatedLot.movimentacoes !== undefined) dbUpdate.movimentacoes = updatedLot.movimentacoes;

        if (Object.keys(dbUpdate).length > 0) {
          supabase!
            .from('egg_lots')
            .update(dbUpdate)
            .eq('id', id)
            .then(({ error }) => {
              if (error) console.error('Erro Supabase editEggLot:', error);
            });
        }
      }
      return next;
    });
  };

  const addMeatLot = (lot: MeatLot) => {
    setMeatLots(prev => {
      const next = [...prev, lot];
      localforage.setItem(getStorageKey('meatlots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        const targetUserId = isCurrentUserAdmin ? ADMIN_CANONICAL_ID : user.id;
        supabase!
          .from('meat_lots')
          .insert({
            id: lot.id,
            user_id: targetUserId,
            baia: lot.baia,
            aves_ids: lot.avesIds || [],
            qtd_aves: lot.qtdAves || 0,
            data_inicio: lot.dataInicio,
            peso_medio_inicial: lot.pesoMedioInicial,
            peso_meta: lot.pesoMeta || '',
            status: lot.status,
            raca: lot.raca || '',
            observacao: lot.observacao || '',
            movimentacoes: lot.movimentacoes || []
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
        if (updatedLot.qtdAves !== undefined) { dbUpdate.qtd_aves = updatedLot.qtdAves; delete dbUpdate.qtdAves; }
        if (updatedLot.dataInicio !== undefined) { dbUpdate.data_inicio = updatedLot.dataInicio; delete dbUpdate.dataInicio; }
        if (updatedLot.pesoMedioInicial !== undefined) { dbUpdate.peso_medio_inicial = updatedLot.pesoMedioInicial; delete dbUpdate.pesoMedioInicial; }
        if (updatedLot.pesoMeta !== undefined) { dbUpdate.peso_meta = updatedLot.pesoMeta; delete dbUpdate.pesoMeta; }

        supabase!
          .from('meat_lots')
          .update(dbUpdate)
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase editMeatLot:', error); });
      }
      return next;
    });
  };

  const removeEggLot = (id: string) => {
    setEggLots(prev => {
      const next = prev.filter(l => l.id !== id);
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
          raca: l.raca || '',
          qtd_femeas: l.qtdFemeas || 0,
          preco_venda_padrao: l.precoVendaPadrao || 6.0,
          custo_prod_padrao: l.custoProdPadrao || 0.30,
          observacao: l.observacao || ''
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
          peso_medio_inicial: l.pesoMedioInicial || '',
          status: l.status || 'Crescimento',
          raca: l.raca || '',
          observacao: l.observacao || '',
          peso_meta: l.pesoMeta || '',
          qtd_aves: l.qtdAves || 0
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
    localStorage.setItem('@mura-manager:has-seen-tutorial', 'true');
    if (user) {
      localStorage.setItem(`@mura-manager:${user.id}:has-seen-tutorial`, 'true');
    }
  };

  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    return localStorage.getItem('@mura-manager:hasSeenTour_v1') !== 'true';
  });
  const [isProfileSetupOpen, setIsProfileSetupOpen] = useState(false);

  const startTour = () => setIsTourOpen(true);
  const closeTour = () => {
    setIsTourOpen(false);
    localStorage.setItem('@mura-manager:hasSeenTour_v1', 'true');
  };
  const finishTour = () => {
    setIsTourOpen(false);
    localStorage.setItem('@mura-manager:hasSeenTour_v1', 'true');
  };

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

  const openProfileSetup = () => setIsProfileSetupOpen(true);
  const closeProfileSetup = () => setIsProfileSetupOpen(false);
  const finishProfileSetup = () => {
    setIsProfileSetupOpen(false);
    localStorage.setItem('@mura-manager:hasSetupProfile_v1', 'true');
  };

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

  const contextValue = useMemo(() => ({
    isReady,
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
    isTourOpen, isProfileSetupOpen,
    startTour, closeTour, finishTour,
    openProfileSetup, closeProfileSetup, finishProfileSetup
  }), [
    isReady, breeds, birds, couples, coupleEggs, eggLots, meatLots, farmSettings,
    isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
    isTutorialOpen, activeBreed, incubationLots, showToast, recoverAllBirds, isTourOpen, isProfileSetupOpen
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
