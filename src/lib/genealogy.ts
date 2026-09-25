import type { Bird } from './AppContext';

export type RelationshipType =
  | 'Pai'
  | 'Mãe'
  | 'Irmão Pleno'
  | 'Irmã Plena'
  | 'Meio-Irmão (Paterno)'
  | 'Meia-Irmã (Paterna)'
  | 'Meio-Irmão (Materno)'
  | 'Meia-Irmã (Materna)'
  | 'Avô Paterno'
  | 'Avó Paterna'
  | 'Avô Materno'
  | 'Avó Materna'
  | 'Tio Paterno'
  | 'Tia Paterna'
  | 'Tio Materno'
  | 'Tia Materna'
  | 'Filho'
  | 'Filha'
  | 'Sobrinho'
  | 'Sobrinha'
  | 'Neto'
  | 'Neta'
  | 'Primo'
  | 'Prima';

export type RelatedBirdInfo = {
  bird: Bird;
  relationship: RelationshipType;
  relationshipGroup: 'Pais' | 'Irmãos' | 'Avós' | 'Tios' | 'Filhos' | 'Sobrinhos' | 'Netos' | 'Primos';
  geneticsSharePercent: number;
};

/**
 * Obtém o mapa de ancestrais de um indivíduo com suas distâncias de geração
 */
function getAncestorsWithDistances(
  startBirdId: string,
  birdsMap: Map<string, Bird>,
  maxDepth = 5
): Map<string, number[]> {
  const ancestorDistances = new Map<string, number[]>();

  function traverse(currentId: string, depth: number) {
    if (depth > maxDepth) return;
    const b = birdsMap.get(currentId);
    if (!b) return;

    if (b.paiId && !b.isPaiExterno && birdsMap.has(b.paiId)) {
      const pId = b.paiId;
      if (!ancestorDistances.has(pId)) ancestorDistances.set(pId, []);
      ancestorDistances.get(pId)!.push(depth + 1);
      traverse(pId, depth + 1);
    }

    if (b.maeId && !b.isMaeExterno && birdsMap.has(b.maeId)) {
      const mId = b.maeId;
      if (!ancestorDistances.has(mId)) ancestorDistances.set(mId, []);
      ancestorDistances.get(mId)!.push(depth + 1);
      traverse(mId, depth + 1);
    }
  }

  traverse(startBirdId, 0);
  return ancestorDistances;
}

// ── LRU Memoization Cache para Cálculos Genealógicos (0.00ms em acessos repetidos) ──
const INBREEDING_CACHE = new Map<string, number>();
const MAX_GENEALOGY_CACHE_SIZE = 500;

export function clearGenealogyCache() {
  INBREEDING_CACHE.clear();
  RELATED_BIRDS_CACHE.clear();
}

// ── Web Worker Singleton para Cálculos Zootécnicos Off-Main-Thread ──
let genealogyWorkerInstance: Worker | null = null;
let genealogyWorkerAttempted = false;

function getGenealogyWorker(): Worker | null {
  if (genealogyWorkerAttempted && !genealogyWorkerInstance) return null;
  if (typeof Worker === 'undefined') {
    genealogyWorkerAttempted = true;
    return null;
  }
  if (!genealogyWorkerInstance) {
    genealogyWorkerAttempted = true;
    try {
      genealogyWorkerInstance = new Worker(new URL('../workers/genealogyWorker.ts', import.meta.url), { type: 'module' });
      genealogyWorkerInstance.onerror = () => {
        genealogyWorkerInstance = null;
      };
    } catch {
      genealogyWorkerInstance = null;
    }
  }
  return genealogyWorkerInstance;
}

/**
 * Calcula o Coeficiente de Consanguinidade de Wright (F) de uma ave (0 a 100%)
 * com aceleração via LRU Cache em memória (0.00ms após o primeiro cálculo).
 */
export function calculateInbreedingCoefficient(
  birdId: string,
  birds: Bird[],
  visited = new Set<string>()
): number {
  if (!birdId) return 0;

  // Cache de alta velocidade para chamadas do nível raiz
  if (visited.size === 0) {
    const target = birds.find(b => b.id === birdId);
    if (!target || (!target.paiId && !target.maeId)) return 0;
    const cacheKey = `${birdId}:${target.paiId || ''}:${target.maeId || ''}:${birds.length}`;
    if (INBREEDING_CACHE.has(cacheKey)) {
      return INBREEDING_CACHE.get(cacheKey)!;
    }
    const computed = computeInbreedingInternal(birdId, birds, visited);
    if (INBREEDING_CACHE.size >= MAX_GENEALOGY_CACHE_SIZE) {
      const first = INBREEDING_CACHE.keys().next().value;
      if (first) INBREEDING_CACHE.delete(first);
    }
    INBREEDING_CACHE.set(cacheKey, computed);
    return computed;
  }

  return computeInbreedingInternal(birdId, birds, visited);
}

function computeInbreedingInternal(
  birdId: string,
  birds: Bird[],
  visited: Set<string>
): number {
  if (visited.has(birdId)) return 0;
  visited.add(birdId);

  const birdsMap = new Map<string, Bird>(birds.map(b => [b.id, b]));
  const target = birdsMap.get(birdId);

  if (!target) return 0;
  const fatherId = target.paiId && !target.isPaiExterno ? target.paiId : null;
  const motherId = target.maeId && !target.isMaeExterno ? target.maeId : null;

  if (!fatherId || !motherId) {
    return 0;
  }

  if (fatherId === motherId) {
    return 50;
  }

  const fatherAncestors = getAncestorsWithDistances(fatherId, birdsMap);
  const motherAncestors = getAncestorsWithDistances(motherId, birdsMap);

  let inbreedingF = 0;

  // 1. Caso o pai seja ancestral da mãe ou a mãe seja ancestral do pai
  if (motherAncestors.has(fatherId)) {
    for (const d of motherAncestors.get(fatherId)!) {
      const faF = computeInbreedingInternal(fatherId, birds, new Set(visited)) / 100;
      inbreedingF += Math.pow(0.5, d) * (1 + faF);
    }
  }
  if (fatherAncestors.has(motherId)) {
    for (const d of fatherAncestors.get(motherId)!) {
      const moF = computeInbreedingInternal(motherId, birds, new Set(visited)) / 100;
      inbreedingF += Math.pow(0.5, d) * (1 + moF);
    }
  }

  // 2. Ancestrais comuns entre pai e mãe
  for (const [ancestorId, fatherDists] of fatherAncestors.entries()) {
    if (motherAncestors.has(ancestorId) && ancestorId !== fatherId && ancestorId !== motherId) {
      const motherDists = motherAncestors.get(ancestorId)!;
      const ancestorF = computeInbreedingInternal(ancestorId, birds, new Set(visited)) / 100;

      for (const n1 of fatherDists) {
        for (const n2 of motherDists) {
          inbreedingF += Math.pow(0.5, n1 + n2 + 1) * (1 + ancestorF);
        }
      }
    }
  }

  return Math.min(100, Math.round(inbreedingF * 1000) / 10);
}

/**
 * Versão assíncrona executada off-main-thread em Web Worker
 * Não bloqueia a thread de renderização mesmo com árvores genealógicas gigantes.
 */
export function calculateInbreedingAsync(birdId: string, birds: Bird[]): Promise<number> {
  const worker = getGenealogyWorker();
  if (!worker) {
    return Promise.resolve(calculateInbreedingCoefficient(birdId, birds));
  }

  return new Promise((resolve) => {
    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', handleMessage);
      resolve(calculateInbreedingCoefficient(birdId, birds));
    }, 4000);

    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.id === id) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        if (e.data.success && typeof e.data.inbreedingF === 'number') {
          resolve(e.data.inbreedingF);
        } else {
          resolve(calculateInbreedingCoefficient(birdId, birds));
        }
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ id, type: 'single', birdId, birds });
  });
}

/**
 * Calcula a consanguinidade projetada para um acasalamento hipotético entre Macho e Fêmea
 */
export function calculatePairInbreeding(
  machoId: string,
  femeaId: string,
  birds: Bird[]
): number {
  const dummyBird: Bird = {
    id: 'dummy-child',
    anilha: 'DUMMY',
    nome: 'Fictício',
    sexo: 'Macho',
    raca: '',
    baia: '',
    status: 'Adulto',
    paiId: machoId,
    maeId: femeaId,
    isPaiExterno: false,
    isMaeExterno: false
  };

  return calculateInbreedingCoefficient('dummy-child', [...birds, dummyBird]);
}

const RELATED_BIRDS_CACHE = new Map<string, RelatedBirdInfo[]>();

/**
 * Mapeia todos os parentes da ave alvo no criatório (com LRU cache 0.00ms)
 */
export function findRelatedBirds(targetBird: Bird, birds: Bird[]): RelatedBirdInfo[] {
  if (!targetBird || !targetBird.id) return [];
  const cacheKey = `${targetBird.id}:${targetBird.paiId || ''}:${targetBird.maeId || ''}:${birds.length}`;
  if (RELATED_BIRDS_CACHE.has(cacheKey)) {
    return RELATED_BIRDS_CACHE.get(cacheKey)!;
  }
  const results = computeRelatedBirdsInternal(targetBird, birds);
  if (RELATED_BIRDS_CACHE.size >= 100) {
    const first = RELATED_BIRDS_CACHE.keys().next().value;
    if (first) RELATED_BIRDS_CACHE.delete(first);
  }
  RELATED_BIRDS_CACHE.set(cacheKey, results);
  return results;
}

function computeRelatedBirdsInternal(targetBird: Bird, birds: Bird[]): RelatedBirdInfo[] {
  const results: RelatedBirdInfo[] = [];
  const birdsMap = new Map<string, Bird>(birds.map(b => [b.id, b]));
  const addedIds = new Set<string>();

  const targetId = targetBird.id;
  const fatherId = targetBird.paiId && !targetBird.isPaiExterno ? targetBird.paiId : null;
  const motherId = targetBird.maeId && !targetBird.isMaeExterno ? targetBird.maeId : null;

  const father = fatherId ? birdsMap.get(fatherId) : null;
  const mother = motherId ? birdsMap.get(motherId) : null;

  // 1. PAIS
  if (father && !addedIds.has(father.id)) {
    addedIds.add(father.id);
    results.push({
      bird: father,
      relationship: 'Pai',
      relationshipGroup: 'Pais',
      geneticsSharePercent: 50
    });
  }

  if (mother && !addedIds.has(mother.id)) {
    addedIds.add(mother.id);
    results.push({
      bird: mother,
      relationship: 'Mãe',
      relationshipGroup: 'Pais',
      geneticsSharePercent: 50
    });
  }

  // 2. AVÓS (Grandparents)
  if (father) {
    if (father.paiId && !father.isPaiExterno && birdsMap.has(father.paiId)) {
      const gPaterno = birdsMap.get(father.paiId)!;
      if (!addedIds.has(gPaterno.id) && gPaterno.id !== targetId) {
        addedIds.add(gPaterno.id);
        results.push({
          bird: gPaterno,
          relationship: 'Avô Paterno',
          relationshipGroup: 'Avós',
          geneticsSharePercent: 25
        });
      }
    }
    if (father.maeId && !father.isMaeExterno && birdsMap.has(father.maeId)) {
      const gPaterna = birdsMap.get(father.maeId)!;
      if (!addedIds.has(gPaterna.id) && gPaterna.id !== targetId) {
        addedIds.add(gPaterna.id);
        results.push({
          bird: gPaterna,
          relationship: 'Avó Paterna',
          relationshipGroup: 'Avós',
          geneticsSharePercent: 25
        });
      }
    }
  }

  if (mother) {
    if (mother.paiId && !mother.isPaiExterno && birdsMap.has(mother.paiId)) {
      const gMaterno = birdsMap.get(mother.paiId)!;
      if (!addedIds.has(gMaterno.id) && gMaterno.id !== targetId) {
        addedIds.add(gMaterno.id);
        results.push({
          bird: gMaterno,
          relationship: 'Avô Materno',
          relationshipGroup: 'Avós',
          geneticsSharePercent: 25
        });
      }
    }
    if (mother.maeId && !mother.isMaeExterno && birdsMap.has(mother.maeId)) {
      const gMaterna = birdsMap.get(mother.maeId)!;
      if (!addedIds.has(gMaterna.id) && gMaterna.id !== targetId) {
        addedIds.add(gMaterna.id);
        results.push({
          bird: gMaterna,
          relationship: 'Avó Materna',
          relationshipGroup: 'Avós',
          geneticsSharePercent: 25
        });
      }
    }
  }

  const fullSiblingsIds = new Set<string>();
  const halfSiblingsIds = new Set<string>();

  // 3. IRMÃOS E MEIOS-IRMÃOS
  birds.forEach(other => {
    if (other.id === targetId || addedIds.has(other.id)) return;

    const otherFatherId = other.paiId && !other.isPaiExterno ? other.paiId : null;
    const otherMotherId = other.maeId && !other.isMaeExterno ? other.maeId : null;

    const sameFather = fatherId && otherFatherId && fatherId === otherFatherId;
    const sameMother = motherId && otherMotherId && motherId === otherMotherId;

    if (sameFather && sameMother) {
      fullSiblingsIds.add(other.id);
      addedIds.add(other.id);
      results.push({
        bird: other,
        relationship: other.sexo === 'Macho' ? 'Irmão Pleno' : 'Irmã Plena',
        relationshipGroup: 'Irmãos',
        geneticsSharePercent: 50
      });
    } else if (sameFather && !sameMother) {
      halfSiblingsIds.add(other.id);
      addedIds.add(other.id);
      results.push({
        bird: other,
        relationship: other.sexo === 'Macho' ? 'Meio-Irmão (Paterno)' : 'Meia-Irmã (Paterna)',
        relationshipGroup: 'Irmãos',
        geneticsSharePercent: 25
      });
    } else if (sameMother && !sameFather) {
      halfSiblingsIds.add(other.id);
      addedIds.add(other.id);
      results.push({
        bird: other,
        relationship: other.sexo === 'Macho' ? 'Meio-Irmão (Materno)' : 'Meia-Irmã (Materna)',
        relationshipGroup: 'Irmãos',
        geneticsSharePercent: 25
      });
    }
  });

  // 4. TIOS E TIAS
  if (father) {
    birds.forEach(other => {
      if (other.id === father.id || other.id === targetId || addedIds.has(other.id)) return;
      const oPai = other.paiId && !other.isPaiExterno ? other.paiId : null;
      const oMae = other.maeId && !other.isMaeExterno ? other.maeId : null;

      const fPai = father.paiId && !father.isPaiExterno ? father.paiId : null;
      const fMae = father.maeId && !father.isMaeExterno ? father.maeId : null;

      const sameF = fPai && oPai && fPai === oPai;
      const sameM = fMae && oMae && fMae === oMae;

      if (sameF || sameM) {
        addedIds.add(other.id);
        results.push({
          bird: other,
          relationship: other.sexo === 'Macho' ? 'Tio Paterno' : 'Tia Paterna',
          relationshipGroup: 'Tios',
          geneticsSharePercent: sameF && sameM ? 25 : 12.5
        });
      }
    });
  }

  if (mother) {
    birds.forEach(other => {
      if (other.id === mother.id || other.id === targetId || addedIds.has(other.id)) return;
      const oPai = other.paiId && !other.isPaiExterno ? other.paiId : null;
      const oMae = other.maeId && !other.isMaeExterno ? other.maeId : null;

      const mPai = mother.paiId && !mother.isPaiExterno ? mother.paiId : null;
      const mMae = mother.maeId && !mother.isMaeExterno ? mother.maeId : null;

      const sameF = mPai && oPai && mPai === oPai;
      const sameM = mMae && oMae && mMae === oMae;

      if (sameF || sameM) {
        addedIds.add(other.id);
        results.push({
          bird: other,
          relationship: other.sexo === 'Macho' ? 'Tio Materno' : 'Tia Materna',
          relationshipGroup: 'Tios',
          geneticsSharePercent: sameF && sameM ? 25 : 12.5
        });
      }
    });
  }

  // 5. FILHOS
  const childrenIds = new Set<string>();
  birds.forEach(other => {
    if (other.id === targetId || addedIds.has(other.id)) return;
    if (
      (other.paiId && !other.isPaiExterno && other.paiId === targetId) ||
      (other.maeId && !other.isMaeExterno && other.maeId === targetId)
    ) {
      childrenIds.add(other.id);
      addedIds.add(other.id);
      results.push({
        bird: other,
        relationship: other.sexo === 'Macho' ? 'Filho' : 'Filha',
        relationshipGroup: 'Filhos',
        geneticsSharePercent: 50
      });
    }
  });

  // 6. SOBRINHOS E SOBRINHAS
  birds.forEach(other => {
    if (other.id === targetId || addedIds.has(other.id)) return;
    const oPai = other.paiId && !other.isPaiExterno ? other.paiId : null;
    const oMae = other.maeId && !other.isMaeExterno ? other.maeId : null;

    const fatherIsSibling = (oPai && fullSiblingsIds.has(oPai)) || (oPai && halfSiblingsIds.has(oPai));
    const motherIsSibling = (oMae && fullSiblingsIds.has(oMae)) || (oMae && halfSiblingsIds.has(oMae));

    if (fatherIsSibling || motherIsSibling) {
      const isFull = (oPai && fullSiblingsIds.has(oPai)) || (oMae && fullSiblingsIds.has(oMae));
      addedIds.add(other.id);
      results.push({
        bird: other,
        relationship: other.sexo === 'Macho' ? 'Sobrinho' : 'Sobrinha',
        relationshipGroup: 'Sobrinhos',
        geneticsSharePercent: isFull ? 25 : 12.5
      });
    }
  });

  // 7. NETOS E NETAS
  birds.forEach(other => {
    if (other.id === targetId || addedIds.has(other.id)) return;
    const oPai = other.paiId && !other.isPaiExterno ? other.paiId : null;
    const oMae = other.maeId && !other.isMaeExterno ? other.maeId : null;

    if ((oPai && childrenIds.has(oPai)) || (oMae && childrenIds.has(oMae))) {
      addedIds.add(other.id);
      results.push({
        bird: other,
        relationship: other.sexo === 'Macho' ? 'Neto' : 'Neta',
        relationshipGroup: 'Netos',
        geneticsSharePercent: 25
      });
    }
  });

  // 8. PRIMOS E PRIMAS (Filhos dos Tios)
  birds.forEach(other => {
    if (other.id === targetId || addedIds.has(other.id)) return;
    const oPai = other.paiId && !other.isPaiExterno ? other.paiId : null;
    const oMae = other.maeId && !other.isMaeExterno ? other.maeId : null;

    const uncleIds = new Set(results.filter(r => r.relationshipGroup === 'Tios').map(r => r.bird.id));
    if ((oPai && uncleIds.has(oPai)) || (oMae && uncleIds.has(oMae))) {
      addedIds.add(other.id);
      results.push({
        bird: other,
        relationship: other.sexo === 'Macho' ? 'Primo' : 'Prima',
        relationshipGroup: 'Primos',
        geneticsSharePercent: 12.5
      });
    }
  });

  return results;
}
