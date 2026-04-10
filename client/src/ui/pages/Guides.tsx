import { useDiseases } from '../hooks/useDiseases'

export function Guides() {
  const { guides, loading } = useDiseases()

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h1 className="text-lg font-extrabold">Tabelas e Guias</h1>
        <p className="mt-1 text-sm text-slate-600">Vacinação, vermifugação, checklist e recomendações do ebook original.</p>
      </div>

      {loading ? (
        <div className="text-sm text-slate-600">Carregando…</div>
      ) : (
        guides.map((g) => (
          <section key={g.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-extrabold">{g.titulo}</h2>
            <pre className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{g.texto}</pre>
          </section>
        ))
      )}
    </div>
  )
}

