import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDiseases } from '../hooks/useDiseases'

const CATS = [
  'Doenças bacterianas sistemicas',
  'Doenças virais',
  'Doenças bacterianas respiratorias',
  'Problemas de nutrição',
  'Casos isolados',
]

export function Diseases() {
  const { diseases, loading } = useDiseases()
  const [cat, setCat] = useState<string>(CATS[0])

  const filtered = useMemo(() => diseases.filter((d) => (d.categoria || 'Casos isolados') === cat), [diseases, cat])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-extrabold">Doenças</h1>
        <p className="mt-1 text-sm text-slate-600">Escolha uma subcategoria:</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                c === cat ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {loading ? (
          <div className="text-sm text-slate-600">Carregando…</div>
        ) : (
          filtered.map((d) => (
            <Link key={d.id} to={`/disease/${encodeURIComponent(d.id)}`} className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
              <div className="font-bold">{d.nome}</div>
              <div className="mt-1 line-clamp-3 text-sm text-slate-600">{d.resumo || d.texto || ''}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

