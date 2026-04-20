import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { Disease } from './types'

interface DiseasesDB extends DBSchema {
  diseases: {
    key: string
    value: Disease
    indexes: { 'by-name': string }
  }
  meta: {
    key: string
    value: { key: string; value: string }
  }
}

let _db: Promise<IDBPDatabase<DiseasesDB>> | null = null

export function getDb() {
  if (_db) return _db
  _db = openDB<DiseasesDB>('DiseasesDB', 1, {
    upgrade(db) {
      const store = db.createObjectStore('diseases', { keyPath: 'id' })
      store.createIndex('by-name', 'nome')
      db.createObjectStore('meta', { keyPath: 'key' })
    },
  })
  return _db
}

export async function putAllDiseases(list: Disease[]) {
  const db = await getDb()
  const tx = db.transaction('diseases', 'readwrite')
  await tx.store.clear()
  for (const d of list) await tx.store.put(d)
  await tx.done
}

export async function getAllDiseases() {
  const db = await getDb()
  return db.getAll('diseases')
}

export async function getDisease(id: string) {
  const db = await getDb()
  return db.get('diseases', id)
}

export async function setMeta(key: string, value: string) {
  const db = await getDb()
  await db.put('meta', { key, value })
}

export async function getMeta(key: string) {
  const db = await getDb()
  const v = await db.get('meta', key)
  return v?.value || null
}

