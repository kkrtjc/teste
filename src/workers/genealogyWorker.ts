/**
 * Genealogy & Inbreeding Worker (Off-Main-Thread)
 * Executa os cálculos matemáticos zootécnicos de Wright (F) e árvores de parentesco
 * fora da thread de renderização do navegador, mantendo 60/120 FPS sem nenhum frame drop.
 */

interface BirdRef {
  id: string;
  paiId?: string | null;
  maeId?: string | null;
  isPaiExterno?: boolean;
  isMaeExterno?: boolean;
}

function getAncestorsWithDistances(
  startBirdId: string,
  birdsMap: Map<string, BirdRef>,
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

function calculateInbreeding(
  birdId: string,
  birdsMap: Map<string, BirdRef>,
  visited = new Set<string>()
): number {
  if (visited.has(birdId)) return 0;
  visited.add(birdId);

  const target = birdsMap.get(birdId);
  if (!target) return 0;

  const fatherId = target.paiId && !target.isPaiExterno ? target.paiId : null;
  const motherId = target.maeId && !target.isMaeExterno ? target.maeId : null;

  if (!fatherId || !motherId) return 0;
  if (fatherId === motherId) return 50;

  const fatherAncestors = getAncestorsWithDistances(fatherId, birdsMap);
  const motherAncestors = getAncestorsWithDistances(motherId, birdsMap);

  let inbreedingF = 0;

  if (motherAncestors.has(fatherId)) {
    for (const d of motherAncestors.get(fatherId)!) {
      const faF = calculateInbreeding(fatherId, birdsMap, new Set(visited)) / 100;
      inbreedingF += Math.pow(0.5, d) * (1 + faF);
    }
  }
  if (fatherAncestors.has(motherId)) {
    for (const d of fatherAncestors.get(motherId)!) {
      const moF = calculateInbreeding(motherId, birdsMap, new Set(visited)) / 100;
      inbreedingF += Math.pow(0.5, d) * (1 + moF);
    }
  }

  for (const [ancestorId, fatherDists] of fatherAncestors.entries()) {
    if (motherAncestors.has(ancestorId) && ancestorId !== fatherId && ancestorId !== motherId) {
      const motherDists = motherAncestors.get(ancestorId)!;
      const ancestorF = calculateInbreeding(ancestorId, birdsMap, new Set(visited)) / 100;

      for (const n1 of fatherDists) {
        for (const n2 of motherDists) {
          inbreedingF += Math.pow(0.5, n1 + n2 + 1) * (1 + ancestorF);
        }
      }
    }
  }

  return Math.min(100, Math.round(inbreedingF * 1000) / 10);
}

self.onmessage = (e: MessageEvent) => {
  const { id, type, birdId, birds, pairs } = e.data;

  try {
    const birdsMap = new Map<string, BirdRef>();
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i];
      birdsMap.set(b.id, {
        id: b.id,
        paiId: b.paiId,
        maeId: b.maeId,
        isPaiExterno: b.isPaiExterno,
        isMaeExterno: b.isMaeExterno
      });
    }

    if (type === 'single') {
      const f = calculateInbreeding(birdId, birdsMap);
      self.postMessage({ id, success: true, inbreedingF: f });
    } else if (type === 'batch') {
      const results: Record<string, number> = {};
      for (const bId of (e.data.birdIds || [])) {
        results[bId] = calculateInbreeding(bId, birdsMap);
      }
      self.postMessage({ id, success: true, results });
    } else if (type === 'pairs') {
      const pairResults: Record<string, number> = {};
      for (const pair of (pairs || [])) {
        const dummyKey = `${pair.machoId}x${pair.femeaId}`;
        const dummyMap = new Map(birdsMap);
        dummyMap.set(dummyKey, {
          id: dummyKey,
          paiId: pair.machoId,
          maeId: pair.femeaId,
          isPaiExterno: false,
          isMaeExterno: false
        });
        pairResults[dummyKey] = calculateInbreeding(dummyKey, dummyMap);
      }
      self.postMessage({ id, success: true, pairResults });
    }
  } catch (err: any) {
    self.postMessage({ id, success: false, error: err?.message || 'Calculation error' });
  }
};

export {};
