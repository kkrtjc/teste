import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
};

export type MeatLot = {
  id: string;
  baia: string;
  avesIds: string[];
  qtdAves?: number;            // quantidade manual (quando não se vincula aves individuais)
  dataInicio: string;
  pesoMedioInicial: string;
  pesoMeta?: string;           // peso alvo de abate
  status: 'Crescimento' | 'Terminação' | 'Abatido';
  raca?: string;
  observacao?: string;
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
    pesoMedio: '3.5 kg'
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567002',
    nome: 'Brahma',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Raça de grande porte, dócil, excelente para carne e postura de ovos grandes no inverno.',
    imagem: '/breeds/brahma.jpg',
    totalAves: 0,
    tempoCrescimento: 210,
    pesoMedio: '4.5 kg'
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567003',
    nome: 'Sedosa',
    foco: 'Ornamental',
    descricao: 'Famosa por sua plumagem incrivelmente macia e felpuda que parece cabelo ou lã. Excelentes mães.',
    imagem: '/breeds/sedosa.jpg',
    totalAves: 0,
    tempoCrescimento: 150,
    pesoMedio: '1.2 kg'
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567004',
    nome: 'Caipira',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galinha rústica de quintal, perfeitamente adaptada a sistemas livres, com carne saborosa e ovos caipiras.',
    imagem: '/breeds/caipira.jpg',
    totalAves: 0,
    tempoCrescimento: 120,
    pesoMedio: '2.8 kg'
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567005',
    nome: 'GSB',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galo Sertanejo Balão (GSB). Gigante de corpo arredondado, cauda curta e peito muito largo.',
    imagem: '/breeds/gsb.jpg',
    totalAves: 0,
    tempoCrescimento: 240,
    pesoMedio: '5.5 kg'
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567006',
    nome: 'Indio gigante',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galo de altura excepcional, pernas longas e corpo ereto. Orgulho do melhoramento genético nacional.',
    imagem: '/breeds/indio_gigante.jpg',
    totalAves: 0,
    tempoCrescimento: 210,
    pesoMedio: '5.0 kg'
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567007',
    nome: 'Polaco',
    foco: 'Misto (Carne e Ovos)',
    descricao: 'Galinha de pescoço pelado (Transilvânia / Polaca), muito rústica, dócil e produtiva.',
    imagem: '/breeds/polaco.jpg',
    totalAves: 0,
    tempoCrescimento: 150,
    pesoMedio: '3.0 kg'
  }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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

      // ── MODO ONLINE: SUPABASE CONFIGURADO E USUÁRIO LOGADO ──
      if (isSupabaseConfigured && user) {
        // 1. Carrega dados do cache local (para início instantâneo em 0ms)
        await loadFromLocalForage();
        setIsReady(true);

        // 2. Sincroniza em segundo plano sem prender a tela do usuário
        syncWithSupabaseBackground().catch(err => {
          console.error('Erro na sincronização em segundo plano:', err);
        });
      } else {
        // ── MODO OFFLINE ──
        await loadFromLocalForage();
        setIsReady(true);
      }
    }

    async function syncWithSupabaseBackground() {
      if (!isSupabaseConfigured || !user) return;
      try {

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
        supabase!.from('breeds').select('*').eq('user_id', user.id).order('nome', { ascending: true }),
        supabase!.from('birds').select('*').eq('user_id', user.id).order('anilha', { ascending: true }),
        supabase!.from('couples').select('*').eq('user_id', user.id),
        supabase!.from('egg_lots').select('*').eq('user_id', user.id),
        supabase!.from('meat_lots').select('*').eq('user_id', user.id),
        supabase!.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase!.from('couple_eggs').select('*').eq('user_id', user.id),
        supabase!.from('incubation_lots').select('*').eq('user_id', user.id)
      ]);

      let sbBreeds = resBreeds.data || [];
      let sbBirds = resBirds.data || [];
      let sbCouples = resCouples.data || [];
      let sbEggLots = resEggLots.data || [];
      let sbMeatLots = resMeatLots.data || [];
      let sbSettings = resSettings.data || null;
      let sbCoupleEggs = resCoupleEggs.data || [];
      let sbIncubationLots = resIncubationLots.data || [];

      // ── PRIMEIRA INICIALIZAÇÃO / MIGRAÇÃO LOCAL ──
      const localBreeds: any = await localforage.getItem(getStorageKey('breeds'));
      const localBirds: any = await localforage.getItem(getStorageKey('birds'));
      const localCouples: any = await localforage.getItem(getStorageKey('couples'));
      const localEggLots: any = await localforage.getItem(getStorageKey('egglots'));
      const localMeatLots: any = await localforage.getItem(getStorageKey('meatlots'));
      const localSettings: any = await localforage.getItem(getStorageKey('settings'));
      const localCoupleEggs: any = await localforage.getItem(getStorageKey('couple-eggs'));
      const localIncubationLots: any = await localforage.getItem(getStorageKey('incubation-lots'));

      const isSbEmpty = sbBreeds.length === 0 && sbBirds.length === 0;
      const hasLocalData = (localBreeds && localBreeds.length > 0) || (localBirds && localBirds.length > 0);

      if (isSbEmpty && hasLocalData) {
        console.log('Migrando dados locais do IndexedDB para o Supabase...');
        try {
          if (localBreeds && localBreeds.length > 0) {
            const breedsToInsert = localBreeds.map((b: any) => ({
              id: b.id,
              user_id: user.id,
              nome: b.nome,
              foco: b.foco,
              descricao: b.descricao,
              imagem: b.imagem,
              tempo_crescimento: b.tempoCrescimento || 0,
              peso_medio: b.pesoMedio || ''
            }));
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
              peso: b.peso,
              imagens: b.imagens || [],
              observacoes: b.observacoes || ''
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
              femeas_ids: l.femeasIds || [],
              expectativa_diaria: l.expectativaDiaria || 0,
              data_inicio: l.dataInicio || '',
              status: l.status || 'Ativo',
              raca: l.raca || '',
              qtd_femeas: l.qtdFemeas || 0,
              preco_venda_padrao: l.precoVendaPadrao || 6.0,
              custo_prod_padrao: l.custoProdPadrao || 0.30,
              observacao: l.observacao || '',
              registros: l.registros || []
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
          if (localCoupleEggs && localCoupleEggs.length > 0) {
            const coupleEggsToInsert = localCoupleEggs.map((e: any) => ({
              id: e.id,
              user_id: user.id,
              couple_id: e.coupleId,
              femea_id: e.femeaId,
              status: e.status,
              data_introducao: e.dataIntroducao
            }));
            await supabase!.from('couple_eggs').insert(coupleEggsToInsert);
          }
          if (localIncubationLots && localIncubationLots.length > 0) {
            const incubationLotsToInsert = localIncubationLots.map((l: any) => ({
              id: l.id,
              user_id: user.id,
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
            await supabase!.from('incubation_lots').insert(incubationLotsToInsert);
          }
          if (localSettings) {
            const settingsToInsert = { id: user.id, name: localSettings.name, photo: localSettings.photo, email: localSettings.email, phone: localSettings.phone };
            await supabase!.from('profiles').upsert(settingsToInsert);
            sbSettings = settingsToInsert;
          }
        } catch (migrationError) {
          console.error('Erro durante a migracao automatica de IndexedDB para o Supabase, ignorando e prosseguindo:', migrationError);
        }
      }

      // Evita raças duplicadas pelo nome (mantendo apenas o primeiro registro)
      let uniqueSbBreeds: any[] = [];
      const seenNames = new Set<string>();
      for (const b of sbBreeds) {
        const nameLower = (b.nome || '').trim().toLowerCase();
        if (!seenNames.has(nameLower)) {
          seenNames.add(nameLower);
          uniqueSbBreeds.push(b);
        } else {
          // Se for duplicada, deletamos do Supabase para limpar o banco
          if (isSupabaseConfigured && user) {
            supabase!
              .from('breeds')
              .delete()
              .eq('id', b.id)
              .then(({ error }) => { if (error) console.error('Erro ao deletar raca duplicada no Supabase:', error); });
          }
        }
      }

      // Grava no estado e sincroniza no cache localforage com preservação de propriedades locais
      let mappedBreeds: Breed[] = uniqueSbBreeds.map((b: any) => {
        const localBreed = (localBreeds || []).find((x: any) => x.id === b.id);
        const nameLower = (b.nome || '').toLowerCase();
        const seedMatch = DEFAULT_BREEDS.find(db => db.nome.toLowerCase() === nameLower);
        return {
          id: b.id,
          nome: b.nome || '',
          foco: b.foco || seedMatch?.foco || '',
          descricao: b.descricao || seedMatch?.descricao || '',
          imagem: b.imagem || seedMatch?.imagem,
          totalAves: b.total_aves || b.totalAves || 0,
          tempoCrescimento: b.tempo_crescimento !== undefined ? b.tempo_crescimento : (localBreed?.tempoCrescimento || seedMatch?.tempoCrescimento || 0),
          pesoMedio: b.peso_medio !== undefined ? b.peso_medio : (localBreed?.pesoMedio || seedMatch?.pesoMedio || '')
        };
      });

      const missingBreeds = DEFAULT_BREEDS.filter(
        db => !mappedBreeds.some(mb => mb.nome.toLowerCase() === db.nome.toLowerCase())
      );

      if (missingBreeds.length > 0) {
        mappedBreeds = [...mappedBreeds, ...missingBreeds];
        if (isSupabaseConfigured && user) {
          const breedsToUpsert = missingBreeds.map(b => ({
            id: b.id,
            user_id: user.id,
            nome: b.nome,
            foco: b.foco,
            descricao: b.descricao,
            imagem: b.imagem,
            tempo_crescimento: b.tempoCrescimento,
            peso_medio: b.pesoMedio
          }));
          supabase!.from('breeds').upsert(breedsToUpsert, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Erro ao semear raças iniciais:', error);
          });
        }
      }

      setBreeds(mappedBreeds);
      await localforage.setItem(getStorageKey('breeds'), mappedBreeds);

      // Mapeamento e mesclagem de imagens das aves
      const sbBirdIds = new Set<string>(sbBirds.map((b: any) => b.id));
      const mappedBirds: Bird[] = sbBirds.map((b: any) => {
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
          dataBaixa: localBird?.dataBaixa,
          observacoes: b.observacoes || localBird?.observacoes || ''
        };
      });

      // ── PROTEÇÃO CONTRA PERDA DE AVES LOCAIS ──
      // Se houver aves criadas no dispositivo que ainda não estão no Supabase (ex: criadas offline ou em oscilação de rede)
      const unsyncedLocalBirds = (localBirds || []).filter((lb: any) => lb && lb.id && !sbBirdIds.has(lb.id));
      if (unsyncedLocalBirds.length > 0) {
        console.log(`[Sync Defensivo] Preservando ${unsyncedLocalBirds.length} ave(s) salvas no dispositivo que ainda não subiram para a nuvem.`);
        mappedBirds.push(...unsyncedLocalBirds);

        if (isSupabaseConfigured && user) {
          const birdsToPush = unsyncedLocalBirds.map((b: any) => ({
            id: b.id,
            user_id: user.id,
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
          
          supabase!.from('birds').upsert(birdsToPush, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Erro ao subir aves pendentes para o Supabase:', error);
          });
        }
      }

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

      // Mapeia lotes de ovos de snake_case para camelCase preservando propriedades locais (como registros)
      const mappedEggLots = sbEggLots.map((l: any) => {
        const local = (localEggLots || []).find((x: any) => x.id === l.id);
        
        // registros vem do Supabase como jsonb (array) ou string ou do localforage
        let sbRegs: any[] = [];
        if (Array.isArray(l.registros)) {
          sbRegs = l.registros;
        } else if (typeof l.registros === 'string' && l.registros.trim()) {
          try { sbRegs = JSON.parse(l.registros); } catch { sbRegs = []; }
        }

        const localRegs: any[] = local?.registros || [];
        
        // Mescla registros mantendo o mais completo entre local e nuvem
        let finalRegs = sbRegs;
        if (localRegs.length > sbRegs.length) {
          finalRegs = localRegs;
          // Se o dispositivo local tem mais registros do que a nuvem, sincroniza forçado para o Supabase
          if (isSupabaseConfigured && user) {
            supabase!
              .from('egg_lots')
              .update({ registros: localRegs })
              .eq('id', l.id)
              .then(({ error }) => {
                if (error) console.error('Erro ao sincronizar registros de ovos locais para o Supabase:', error);
              });
          }
        }

        return {
          id: l.id,
          baia: l.baia || '',
          femeasIds: l.femeas_ids || l.femeasIds || [],
          expectativaDiaria: l.expectativa_diaria !== undefined ? l.expectativa_diaria : (l.expectativaDiaria || 0),
          dataInicio: l.data_inicio || l.dataInicio || '',
          status: l.status || 'Ativo',
          raca: l.raca || local?.raca || '',
          qtdFemeas: l.qtd_femeas || l.qtdFemeas || local?.qtdFemeas || 0,
          precoVendaPadrao: l.preco_venda_padrao || l.precoVendaPadrao || local?.precoVendaPadrao || 6.0,
          custoProdPadrao: l.custo_prod_padrao || l.custoProdPadrao || local?.custoProdPadrao || 0.30,
          observacao: l.observacao || local?.observacao || '',
          registros: finalRegs
        };
      });

      // Preserva também lotes de ovos criados localmente que ainda não estavam no Supabase
      const sbEggLotIds = new Set<string>(sbEggLots.map((l: any) => l.id));
      const unsyncedEggLots = (localEggLots || []).filter((ll: any) => ll && ll.id && !sbEggLotIds.has(ll.id));
      if (unsyncedEggLots.length > 0) {
        mappedEggLots.push(...unsyncedEggLots);
        if (isSupabaseConfigured && user) {
          const eggLotsToPush = unsyncedEggLots.map((l: any) => ({
            id: l.id,
            user_id: user.id,
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
            registros: l.registros || []
          }));
          supabase!.from('egg_lots').upsert(eggLotsToPush, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Erro ao subir lotes de ovos pendentes para o Supabase:', error);
          });
        }
      }

      setEggLots(mappedEggLots);
      await localforage.setItem(getStorageKey('egglots'), mappedEggLots);

      // Mapeia lotes de corte de snake_case para camelCase preservando propriedades locais (como raca, observacoes, pesoMeta)
      const mappedMeatLots = sbMeatLots.map((l: any) => {
        const local = (localMeatLots || []).find((x: any) => x.id === l.id);
        return {
          id: l.id,
          baia: l.baia || '',
          avesIds: l.aves_ids || l.avesIds || [],
          dataInicio: l.data_inicio || l.dataInicio || '',
          pesoMedioInicial: l.peso_medio_inicial || l.pesoMedioInicial || '',
          status: l.status || 'Crescimento',
          // Preserva propriedades offline-first locais
          raca: l.raca || local?.raca || '',
          observacao: l.observacao || local?.observacao || '',
          pesoMeta: l.peso_meta || l.pesoMeta || local?.pesoMeta || '',
          qtdAves: l.qtd_aves || l.qtdAves || local?.qtdAves || 0
        };
      });

      // Preserva também lotes de corte criados localmente que ainda não estavam no Supabase
      const sbMeatLotIds = new Set<string>(sbMeatLots.map((l: any) => l.id));
      const unsyncedMeatLots = (localMeatLots || []).filter((ml: any) => ml && ml.id && !sbMeatLotIds.has(ml.id));
      if (unsyncedMeatLots.length > 0) {
        mappedMeatLots.push(...unsyncedMeatLots);
        if (isSupabaseConfigured && user) {
          const meatLotsToPush = unsyncedMeatLots.map((l: any) => ({
            id: l.id,
            user_id: user.id,
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
          supabase!.from('meat_lots').upsert(meatLotsToPush, { onConflict: 'id' }).then(({ error }) => {
            if (error) console.error('Erro ao subir lotes de corte pendentes para o Supabase:', error);
          });
        }
      }

      setMeatLots(mappedMeatLots);
      await localforage.setItem(getStorageKey('meatlots'), mappedMeatLots);

      // Mapeia ovos de casais de snake_case para camelCase
      const mappedCoupleEggs = sbCoupleEggs.map((e: any) => ({
        id: e.id,
        coupleId: e.couple_id || e.coupleId || '',
        femeaId: e.femea_id || e.femeaId || '',
        status: e.status || 'Em Espera',
        dataIntroducao: e.data_introducao || e.dataIntroducao || ''
      }));
      setCoupleEggs(mappedCoupleEggs);
      await localforage.setItem(getStorageKey('couple-eggs'), mappedCoupleEggs);

      // Mapeia lotes de incubação de snake_case para camelCase
      const mappedIncubationLots = sbIncubationLots.map((l: any) => ({
        id: l.id,
        coupleId: l.couple_id || l.coupleId || '',
        numeroLote: l.numero_lote || l.numeroLote || '',
        quantidadeOvos: l.quantidade_ovos !== undefined ? l.quantidade_ovos : (l.quantidadeOvos || 0),
        dataInicio: l.data_inicio || l.dataInicio || '',
        baia: l.baia || '',
        ovoscopia1Realizada: l.ovoscopia1_realizada !== undefined ? l.ovoscopia1_realizada : false,
        ovoscopia2Realizada: l.ovoscopia2_realizada !== undefined ? l.ovoscopia2_realizada : false,
        ovosDescartados1: l.ovos_descartados1 !== undefined ? l.ovos_descartados1 : 0,
        ovosDescartados2: l.ovos_descartados2 !== undefined ? l.ovos_descartados2 : 0,
        eclodido: l.eclodido !== undefined ? l.eclodido : false
      }));
      setIncubationLots(mappedIncubationLots);
      await localforage.setItem(getStorageKey('incubation-lots'), mappedIncubationLots);

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
      } catch (syncError) {
        console.error("Erro critico na sincronizacao em background, fazendo fallback offline:", syncError);
        await loadFromLocalForage();
      }
    }

    async function loadFromLocalForage() {
      if (!user) return;
      const storageItems = [
        { suffix: 'breeds',          setter: setBreeds },
        { suffix: 'birds',           setter: setBirds },
        { suffix: 'couples',         setter: (d: any) => {
            const migrated = (d || []).map((c: any) => ({
              ...c,
              femeaIds: c.femeaIds || (c.femeaId ? [c.femeaId] : []),
            }));
            setCouples(migrated);
          }
        },
        { suffix: 'couple-eggs',     setter: setCoupleEggs },
        { suffix: 'egglots',         setter: setEggLots },
        { suffix: 'meatlots',        setter: setMeatLots },
        { suffix: 'incubation-lots', setter: setIncubationLots },
        { suffix: 'settings',        setter: setFarmSettings }
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
            if (item.suffix === 'breeds') {
              let currentBreeds = data as Breed[];
              
              // Limpeza de duplicados locais
              let uniqueLocalBreeds: Breed[] = [];
              const seenLocalNames = new Set<string>();
              for (const b of currentBreeds) {
                const nameLower = (b.nome || '').trim().toLowerCase();
                if (!seenLocalNames.has(nameLower)) {
                  seenLocalNames.add(nameLower);
                  uniqueLocalBreeds.push(b);
                }
              }
              currentBreeds = uniqueLocalBreeds;

              const missingLocal = DEFAULT_BREEDS.filter(
                db => !currentBreeds.some(mb => mb.nome.toLowerCase() === db.nome.toLowerCase())
              );
              currentBreeds = currentBreeds.map(b => {
                const seedMatch = DEFAULT_BREEDS.find(db => db.nome.toLowerCase() === b.nome.toLowerCase());
                if (seedMatch) {
                  return {
                    ...b,
                    foco: b.foco || seedMatch.foco,
                    descricao: b.descricao || seedMatch.descricao,
                    imagem: b.imagem || seedMatch.imagem,
                    tempoCrescimento: b.tempoCrescimento || seedMatch.tempoCrescimento,
                    pesoMedio: b.pesoMedio || seedMatch.pesoMedio
                  };
                }
                return b;
              });
              if (missingLocal.length > 0) {
                currentBreeds = [...currentBreeds, ...missingLocal];
                await localforage.setItem(userKey, currentBreeds);
              }
              (item.setter as any)(currentBreeds);
            } else {
              (item.setter as any)(data);
            }
          } else if (item.suffix === 'breeds') {
            (item.setter as any)(DEFAULT_BREEDS);
            await localforage.setItem(userKey, DEFAULT_BREEDS);
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
          .insert({
            id: breed.id,
            user_id: user.id,
            nome: breed.nome,
            foco: breed.foco,
            descricao: breed.descricao,
            imagem: breed.imagem,
            tempo_crescimento: breed.tempoCrescimento || 0,
            peso_medio: breed.pesoMedio || ''
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
            peso: bird.peso,
            imagens: bird.imagens || [],
            observacoes: bird.observacoes || ''
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

    // Limpa referências de pedigree (pai e mãe) nas aves filhas
    setBirds(prev => {
      const next = prev.map(b => {
        let changed = false;
        const updated = { ...b };
        if (b.paiId === id) { updated.paiId = ''; changed = true; }
        if (b.maeId === id) { updated.maeId = ''; changed = true; }
        return changed ? updated : b;
      });
      localforage.setItem(getStorageKey('birds'), next).catch(err => console.error(err));
      
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

    // Deleta casais associados à ave removida (machos e fêmeas) em cascata
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
        supabase!
          .from('couple_eggs')
          .insert({
            id: egg.id,
            user_id: user.id,
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
        supabase!
          .from('incubation_lots')
          .insert({
            id: lot.id,
            user_id: user.id,
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
        if (updatedLot.coupleId !== undefined) dbUpdate.couple_id = updatedLot.coupleId;
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
        supabase!
          .from('egg_lots')
          .insert({
            id: lot.id,
            user_id: user.id,
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
            registros: lot.registros || []
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

        if (Object.keys(dbUpdate).length > 0) {
          supabase!
            .from('egg_lots')
            .update(dbUpdate)
            .eq('id', id)
            .eq('user_id', user.id)
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

  const removeEggLot = (id: string) => {
    setEggLots(prev => {
      const next = prev.filter(l => l.id !== id);
      localforage.setItem(getStorageKey('egglots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('egg_lots')
          .delete()
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase removeEggLot:', error); });
      }
      return next;
    });
  };

  const removeMeatLot = (id: string) => {
    setMeatLots(prev => {
      const next = prev.filter(l => l.id !== id);
      localforage.setItem(getStorageKey('meatlots'), next).catch(err => console.error(err));
      
      if (isSupabaseConfigured && user) {
        supabase!
          .from('meat_lots')
          .delete()
          .eq('id', id)
          .then(({ error }) => { if (error) console.error('Erro Supabase removeMeatLot:', error); });
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
        await supabase!.from('meat_lots').delete().eq('user_id', user.id);
        const toInsert = backupData.meatlots.map((l: any) => ({
          id: l.id,
          user_id: user.id,
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
        await supabase!.from('couple_eggs').delete().eq('user_id', user.id);
        const toInsert = backupData.coupleEggs.map((e: any) => ({
          id: e.id,
          user_id: user.id,
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
        await supabase!.from('incubation_lots').delete().eq('user_id', user.id);
        const toInsert = backupData.incubationLots.map((l: any) => ({
          id: l.id,
          user_id: user.id,
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
    localStorage.setItem('@mura-manager:has-seen-tutorial', 'true');
    if (user) {
      localStorage.setItem(`@mura-manager:${user.id}:has-seen-tutorial`, 'true');
    }
  };

  const contextValue = useMemo(() => ({
    isReady,
    breeds, addBreed, editBreed, removeBreed,
    birds, addBird, editBird, removeBird,
    couples, addCouple, editCouple, removeCouple,
    coupleEggs, addCoupleEgg, editCoupleEgg, removeCoupleEgg,
    eggLots, addEggLot, editEggLot, removeEggLot,
    meatLots, addMeatLot, editMeatLot, removeMeatLot,
    farmSettings, updateFarmSettings,
    importBackup,
    isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
    openAddBirdModal, openBirdProfile, closeModals,
    isTutorialOpen, openTutorial, closeTutorial,
    activeBreed, setActiveBreed,
    incubationLots, addIncubationLot, editIncubationLot, removeIncubationLot
  }), [
    isReady, breeds, birds, couples, coupleEggs, eggLots, meatLots, farmSettings,
    isAddBirdModalOpen, preSelectedBreedForNewBird, birdToEditId, selectedBirdProfileId,
    isTutorialOpen, activeBreed, incubationLots
  ]);

  return (
    <AppContext.Provider value={contextValue}>
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
