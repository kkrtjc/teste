import { Link } from 'react-router-dom'
import { useDiseases } from '../hooks/useDiseases'

export function Home() {
  const { loading, diseases, intro, coverImage } = useDiseases()

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-extrabold">Guia de Doenças em Galinhas</h1>
        <p className="mt-1 text-sm text-slate-600">Conteúdo completo do ebook original, com funcionamento offline.</p>
        <img src={coverImage} alt="Capa do ebook" className="mt-3 w-full rounded-xl border border-slate-200" />
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          <div className="mb-1 font-bold text-slate-900">Introdução</div>
          {intro || 'Carregando introdução…'}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/diseases"
            className="rounded-lg bg-[#2d5016] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Ver doenças
          </Link>
          <Link
            to="/guides"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Tabelas e guias
          </Link>
          <Link to="/favorites" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Ver favoritos
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-extrabold">Resumo</h2>
          <span className="text-xs text-slate-500">{loading ? 'Carregando…' : `${diseases.length} itens`}</span>
        </div>
        <div className="mt-2 text-sm text-slate-600">
          Este app inclui: aba de doenças por subcategorias, busca fuzzy, favoritos, histórico, e tabelas de vacinação/vermifugação.
        </div>
      </div>
    </div>
  )
}

