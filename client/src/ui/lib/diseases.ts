import Fuse from 'fuse.js'
import type { Disease, DiseasesFile, Guide } from './types'
import { getAllDiseases, getMeta, putAllDiseases, setMeta } from './db'

const META_VERSION = 'diseasesVersion'
const META_INTRO = 'diseasesIntro'
const META_COVER = 'diseasesCover'
const META_GUIDES = 'diseasesGuides'

export async function ensureDiseasesLoaded() {
  const localVersion = await getMeta(META_VERSION)
  const cached = await getAllDiseases()
  if (cached.length > 0 && localVersion) {
    const intro = (await getMeta(META_INTRO)) || ''
    const cover = (await getMeta(META_COVER)) || '/cover-ebook.png'
    let guides: Guide[] = []
    try {
      guides = JSON.parse((await getMeta(META_GUIDES)) || '[]')
    } catch {
      guides = []
    }
    return { version: localVersion, intro, coverImage: cover, guides, diseases: cached }
  }

  // first run: load bundled diseases.json
  const res = await fetch('/diseases.json', { cache: 'no-store' })
  if (!res.ok) throw new Error('diseases.json')
  const json = (await res.json()) as DiseasesFile
  await putAllDiseases(json.diseases)
  await setMeta(META_VERSION, json.versao)
  await setMeta(META_INTRO, json.intro || '')
  await setMeta(META_COVER, json.coverImage || '/cover-ebook.png')
  await setMeta(META_GUIDES, JSON.stringify(json.guides || []))
  return {
    version: json.versao,
    intro: json.intro || '',
    coverImage: json.coverImage || '/cover-ebook.png',
    guides: json.guides || [],
    diseases: json.diseases,
  }
}

export function makeFuse(diseases: Disease[]) {
  return new Fuse(diseases, {
    keys: [
      { name: 'nome', weight: 0.45 },
      { name: 'tags', weight: 0.2 },
      { name: 'texto', weight: 0.35 },
    ],
    threshold: 0.3,
    minMatchCharLength: 2,
    ignoreLocation: true,
  })
}

