import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDiseases } from '../hooks/useDiseases'

export function Search() {
  const { loading, diseases, fuse } = useDiseases()
  const [q, setQ] = useState('')

  const results = useMemo(() => {
    const query = q.trim()
    if (!query) return diseases
    if (!fuse) return []
    return fuse.search(query, { limit: 50 }).map((r) => r.item)
  }, [q, fuse, diseases])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-extrabold">Buscar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Digite sintomas, doença ou medicamento (ex.: <span className="font-semibold">“diarreia”</span>,{' '}
          <span className="font-semibold">“tillosina”</span>).
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {loading ? 'Carregando…' : `${results.length} resultado(s)`}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando conteúdo…</div>
        ) : (
          results.map((d) => (
            <Link key={d.id} to={`/disease/${encodeURIComponent(d.id)}`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
              <div className="font-bold">{d.nome}</div>
              <div className="mt-1 line-clamp-3 text-sm text-slate-600">{d.fields.find((f) => f.kind === 'intro')?.text || d.fields[0]?.text}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

