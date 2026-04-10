import { Link } from 'react-router-dom'
import { useDiseases } from '../hooks/useDiseases'

export function Home() {
  const { loading, diseases } = useDiseases()

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-extrabold">Guia de Doenças em Galinhas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Abra uma vez com internet para baixar tudo. Depois funciona <span className="font-semibold">100% offline</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/search"
            className="rounded-lg bg-[#2d5016] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Buscar doença / remédio
          </Link>
          <Link to="/favorites" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Ver favoritos
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-extrabold">Doenças</h2>
          <span className="text-xs text-slate-500">{loading ? 'Carregando…' : `${diseases.length} itens`}</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {loading ? (
            <div className="text-sm text-slate-600">Carregando conteúdo…</div>
          ) : (
            diseases
              .slice()
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
              .map((d) => (
                <Link
                  key={d.id}
                  to={`/disease/${encodeURIComponent(d.id)}`}
                  className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div className="font-bold">{d.nome}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {d.fields.find((f) => f.kind === 'intro')?.text || d.fields[0]?.text || ''}
                  </div>
                </Link>
              ))
          )}
        </div>
      </div>
    </div>
  )
}

