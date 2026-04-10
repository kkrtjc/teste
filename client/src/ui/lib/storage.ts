const FAV_KEY = 'favorites'
const HIST_KEY = 'history'

export type FavoriteEntry = { id: string; dataMarcada: string }
export type HistoryEntry = { id: string; nome: string; dataConsulta: string }

export function getFavorites(): FavoriteEntry[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]')
  } catch {
    return []
  }
}

export function isFavorite(id: string) {
  return getFavorites().some((f) => f.id === id)
}

export function toggleFavorite(id: string) {
  const now = new Date().toISOString()
  const favs = getFavorites()
  const idx = favs.findIndex((f) => f.id === id)
  if (idx >= 0) favs.splice(idx, 1)
  else favs.unshift({ id, dataMarcada: now })
  localStorage.setItem(FAV_KEY, JSON.stringify(favs))
  return favs
}

export function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) || '[]')
  } catch {
    return []
  }
}

export function pushHistory(entry: { id: string; nome: string }) {
  const now = new Date().toISOString()
  const list = getHistory().filter((h) => h.id !== entry.id)
  list.unshift({ id: entry.id, nome: entry.nome, dataConsulta: now })
  localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 20)))
}

export function clearHistory() {
  localStorage.removeItem(HIST_KEY)
}

