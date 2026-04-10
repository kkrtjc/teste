import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { clearHistory, getHistory } from '../lib/storage'

export function History() {
  const [items, setItems] = useState(() => getHistory())

  useEffect(() => {
    setItems(getHistory())
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold">Histórico</h1>
            <p className="mt-1 text-sm text-slate-600">Últimas consultas (até 20).</p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            onClick={() => {
              clearHistory()
              setItems([])
            }}
          >
            Limpar
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Sem histórico ainda. Abra um item pela <Link className="font-semibold text-emerald-700" to="/search">Busca</Link>.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-2">
          {items.map((h) => (
            <Link
              key={h.id}
              to={`/disease/${encodeURIComponent(h.id)}`}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"
            >
              <div>
                <div className="font-semibold">{h.nome}</div>
                <div className="text-xs text-slate-500">{new Date(h.dataConsulta).toLocaleString('pt-BR')}</div>
              </div>
              <span className="text-sm font-semibold text-slate-400">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

