import Fuse from 'fuse.js'
import type { Disease, DiseasesFile } from './types'
import { getAllDiseases, getMeta, putAllDiseases, setMeta } from './db'

const META_VERSION = 'diseasesVersion'

export async function ensureDiseasesLoaded() {
  const localVersion = await getMeta(META_VERSION)
  const cached = await getAllDiseases()
  if (cached.length > 0 && localVersion) return { version: localVersion, diseases: cached }

  // first run: load bundled diseases.json
  const res = await fetch('/diseases.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('diseases.json')
  const json = (await res.json()) as DiseasesFile
  await putAllDiseases(json.diseases)
  await setMeta(META_VERSION, json.versao)
  return { version: json.versao, diseases: json.diseases }
}

export function makeFuse(diseases: Disease[]) {
  return new Fuse(diseases, {
    keys: [
      { name: 'nome', weight: 0.45 },
      { name: 'tags', weight: 0.2 },
      { name: 'fields.text', weight: 0.35 },
    ],
    threshold: 0.3,
    minMatchCharLength: 2,
    ignoreLocation: true,
  })
}

