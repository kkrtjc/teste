import localforage from 'localforage';
import { supabase } from './supabaseClient';
import type { Bird } from './AppContext';
import { ADMIN_CPF, ADMIN_CANONICAL_ID } from './AuthContext';

function isBirdLike(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  const hasIdOrRing = Boolean(item.id || item.anilha);
  const hasBirdField = Boolean(item.sexo || item.raca || item.baia || item.status || item.origem || item.dataNascimento || item.peso);
  return hasIdOrRing && hasBirdField;
}

function normalizeBird(raw: any): Bird {
  return {
    id: String(raw.id || `recovered-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    anilha: String(raw.anilha || ''),
    nome: raw.nome || '',
    sexo: raw.sexo === 'Fêmea' ? 'Fêmea' : 'Macho',
    raca: raw.raca || '',
    baia: raw.baia || 'ND',
    status: raw.status || 'Reprodutor',
    imagem: raw.imagem || (Array.isArray(raw.imagens) && raw.imagens[0]) || undefined,
    imagens: Array.isArray(raw.imagens) ? raw.imagens : (raw.imagem ? [raw.imagem] : []),
    vacinas: raw.vacinas || undefined,
    origem: raw.origem || 'Criatório',
    casalId: raw.casalId || raw.casal_id || undefined,
    paiId: raw.paiId || raw.pai_id || undefined,
    maeId: raw.maeId || raw.mae_id || undefined,
    isPaiExterno: Boolean(raw.isPaiExterno ?? raw.is_pai_externo),
    isMaeExterno: Boolean(raw.isMaeExterno ?? raw.is_mae_externo),
    dataNascimento: raw.dataNascimento || raw.data_nascimento || undefined,
    peso: raw.peso || undefined,
    dataBaixa: raw.dataBaixa || raw.data_baixa || undefined,
    observacoes: raw.observacoes || ''
  };
}

export async function deepScanAllStorage(currentUserId?: string): Promise<{ count: number; birds: Bird[]; report: string }> {
  const allFoundBirds: Bird[] = [];
  const logEntries: string[] = [];

  logEntries.push(`[${new Date().toISOString()}] Iniciando Varredura Profunda de Recuperação...`);

  // 1. Varredura no localforage (driver padrão)
  try {
    const lfKeys = await localforage.keys();
    logEntries.push(`LocalForage: ${lfKeys.length} chaves encontradas: [${lfKeys.join(', ')}]`);
    for (const key of lfKeys) {
      try {
        const val: any = await localforage.getItem(key);
        if (Array.isArray(val)) {
          let foundInKey = 0;
          for (const item of val) {
            if (isBirdLike(item)) {
              allFoundBirds.push(normalizeBird(item));
              foundInKey++;
            }
          }
          if (foundInKey > 0) {
            logEntries.push(`-> LocalForage '${key}': ${foundInKey} ave(s) identificada(s)`);
          }
        } else if (isBirdLike(val)) {
          allFoundBirds.push(normalizeBird(val));
          logEntries.push(`-> LocalForage '${key}': 1 ave avulsa identificada`);
        }
      } catch (err) {
        logEntries.push(`! Erro ao ler chave localforage '${key}': ${err}`);
      }
    }
  } catch (err) {
    logEntries.push(`! Falha ao listar chaves do localforage: ${err}`);
  }

  // 2. Varredura nativa em todos os bancos IndexedDB do navegador
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      let dbNames: string[] = ['localforage', 'keyval-store', 'mura-manager', 'supabase-auth-token'];
      if (typeof (window.indexedDB as any).databases === 'function') {
        const dbs = await (window.indexedDB as any).databases().catch(() => []);
        const foundNames = (dbs || []).map((d: any) => d.name).filter(Boolean) as string[];
        dbNames = Array.from(new Set([...dbNames, ...foundNames]));
      }

      logEntries.push(`IndexedDB: inspecionando bancos: [${dbNames.join(', ')}]`);

      for (const dbName of dbNames) {
        try {
          const birdsFromDb = await new Promise<Bird[]>((resolve) => {
            const req = window.indexedDB.open(dbName);
            req.onerror = () => resolve([]);
            req.onblocked = () => resolve([]);
            req.onsuccess = () => {
              const db = req.result;
              const storeNames = Array.from(db.objectStoreNames);
              if (storeNames.length === 0) {
                db.close();
                resolve([]);
                return;
              }

              const recovered: Bird[] = [];
              let pendingStores = storeNames.length;

              for (const sName of storeNames) {
                try {
                  const tx = db.transaction(sName, 'readonly');
                  const store = tx.objectStore(sName);
                  const getAllReq = store.getAll();
                  getAllReq.onsuccess = () => {
                    const values = getAllReq.result || [];
                    for (const v of values) {
                      if (Array.isArray(v)) {
                        for (const sub of v) {
                          if (isBirdLike(sub)) recovered.push(normalizeBird(sub));
                        }
                      } else if (isBirdLike(v)) {
                        recovered.push(normalizeBird(v));
                      }
                    }
                    pendingStores--;
                    if (pendingStores <= 0) {
                      db.close();
                      resolve(recovered);
                    }
                  };
                  getAllReq.onerror = () => {
                    pendingStores--;
                    if (pendingStores <= 0) {
                      db.close();
                      resolve(recovered);
                    }
                  };
                } catch {
                  pendingStores--;
                  if (pendingStores <= 0) {
                    db.close();
                    resolve(recovered);
                  }
                }
              }
            };
          });

          if (birdsFromDb.length > 0) {
            logEntries.push(`-> IndexedDB '${dbName}': ${birdsFromDb.length} ave(s) recuperada(s)`);
            allFoundBirds.push(...birdsFromDb);
          }
        } catch (dbErr) {
          logEntries.push(`! Erro ao inspecionar IndexedDB '${dbName}': ${dbErr}`);
        }
      }
    } catch (idbErr) {
      logEntries.push(`! Falha na varredura nativa IndexedDB: ${idbErr}`);
    }
  }

  // 3. Varredura no localStorage
  if (typeof localStorage !== 'undefined') {
    logEntries.push(`LocalStorage: inspecionando ${localStorage.length} chaves`);
    for (let i = 0; i < localStorage.length; i++) {
      const lsKey = localStorage.key(i);
      if (!lsKey) continue;
      const raw = localStorage.getItem(lsKey);
      if (!raw || (!raw.trim().startsWith('[') && !raw.trim().startsWith('{'))) continue;

      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          let count = 0;
          for (const item of parsed) {
            if (isBirdLike(item)) {
              allFoundBirds.push(normalizeBird(item));
              count++;
            }
          }
          if (count > 0) {
            logEntries.push(`-> LocalStorage '${lsKey}': ${count} ave(s) recuperada(s)`);
          }
        } else if (isBirdLike(parsed)) {
          allFoundBirds.push(normalizeBird(parsed));
          logEntries.push(`-> LocalStorage '${lsKey}': 1 ave recuperada`);
        }
      } catch {}
    }
  }

  // 4. Varredura no sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    for (let i = 0; i < sessionStorage.length; i++) {
      const sKey = sessionStorage.key(i);
      if (!sKey) continue;
      const raw = sessionStorage.getItem(sKey);
      if (!raw || (!raw.trim().startsWith('[') && !raw.trim().startsWith('{'))) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isBirdLike(item)) allFoundBirds.push(normalizeBird(item));
          }
        } else if (isBirdLike(parsed)) {
          allFoundBirds.push(normalizeBird(parsed));
        }
      } catch {}
    }
  }

  // 5. Deduplicação inteligente e refinada
  const uniqueMap = new Map<string, Bird>();
  for (const b of allFoundBirds) {
    const anilhaClean = (b.anilha || '').toLowerCase().trim();
    const key = anilhaClean ? `anilha:${anilhaClean}` : `id:${b.id}`;
    
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, b);
    } else {
      const existing = uniqueMap.get(key)!;
      uniqueMap.set(key, {
        ...existing,
        ...b,
        imagem: existing.imagem || b.imagem,
        imagens: (existing.imagens && existing.imagens.length > 0) ? existing.imagens : (b.imagens || []),
        nome: existing.nome || b.nome,
        raca: existing.raca || b.raca,
        baia: (existing.baia && existing.baia !== 'ND') ? existing.baia : (b.baia || existing.baia),
        status: existing.status || b.status,
        dataNascimento: existing.dataNascimento || b.dataNascimento,
        peso: existing.peso || b.peso,
        observacoes: existing.observacoes || b.observacoes
      });
    }
  }

  const finalBirds = Array.from(uniqueMap.values());
  finalBirds.sort((a, b) => {
    const anilhaA = (a.anilha || '').toString().trim();
    const anilhaB = (b.anilha || '').toString().trim();
    return anilhaA.localeCompare(anilhaB, undefined, { numeric: true, sensitivity: 'base' });
  });

  logEntries.push(`Resultado: Total de ${finalBirds.length} aves únicas recuperadas.`);

  // 6. Consolidação e Blindagem: Salva em TODAS as gavetas locais
  if (finalBirds.length > 0) {
    try {
      const keysToPopulate = [
        '@mura-manager:admin:birds',
        '@mura-manager:birds',
        `@mura-manager:${ADMIN_CPF}:birds`,
        `@mura-manager:${ADMIN_CANONICAL_ID}:birds`,
        `@mura-manager:admin-${ADMIN_CPF}:birds`,
      ];
      if (currentUserId) {
        keysToPopulate.push(`@mura-manager:${currentUserId}:birds`);
      }

      for (const k of keysToPopulate) {
        await localforage.setItem(k, finalBirds).catch(() => {});
      }

      localStorage.setItem('@mura-manager:emergency-birds-backup', JSON.stringify(finalBirds));
      localStorage.setItem('@mura-manager:emergency-backup-date', new Date().toISOString());
      logEntries.push(`Consolidação concluída: salvas em ${keysToPopulate.length} chaves locais e localStorage.`);
    } catch (saveErr) {
      logEntries.push(`! Erro ao salvar aves consolidadas: ${saveErr}`);
    }

    // 7. Envio para o Supabase para segurança permanente na nuvem
    if (supabase && currentUserId) {
      try {
        const payload = finalBirds.map(b => ({
          id: b.id,
          user_id: currentUserId,
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

        const { error: upsertErr } = await supabase.from('birds').upsert(payload, { onConflict: 'id' });
        if (!upsertErr) {
          logEntries.push(`Nuvem: ${payload.length} aves sincronizadas com sucesso no Supabase!`);
        } else {
          logEntries.push(`! Supabase upsert aviso: ${upsertErr.message}`);
        }
      } catch (sbErr) {
        logEntries.push(`! Falha na sincronização com Supabase: ${sbErr}`);
      }
    }
  }

  const fullReport = logEntries.join('\n');
  return {
    count: finalBirds.length,
    birds: finalBirds,
    report: fullReport
  };
}
