import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getFavorites, toggleFavorite } from '../lib/storage'
import { getDisease } from '../lib/db'
import type { Disease } from '../lib/types'

export function Favorites() {
  const [items, setItems] = useState<Disease[]>([])

  useEffect(() => {
    const favs = getFavorites()
    Promise.all(favs.map((f) => getDisease(f.id))).then((list) => setItems(list.filter(Boolean) as Disease[]))
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-extrabold">Favoritos</h1>
        <p className="mt-1 text-sm text-slate-600">Itens que você marcou para consultar rápido.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Nenhum favorito ainda. Vá em <Link className="font-semibold text-emerald-700" to="/search">Buscar</Link> e marque uma doença.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((d) => (
            <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <Link to={`/disease/${encodeURIComponent(d.id)}`} className="font-bold hover:underline">
                {d.nome}
              </Link>
              <div className="mt-2 flex gap-2">
                <Link to={`/disease/${encodeURIComponent(d.id)}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                  Abrir
                </Link>
                <button
                  type="button"
                  className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                  onClick={() => {
                    toggleFavorite(d.id)
                    setItems((prev) => prev.filter((x) => x.id !== d.id))
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

