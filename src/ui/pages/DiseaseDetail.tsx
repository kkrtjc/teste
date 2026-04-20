import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDisease } from '../lib/db'
import type { Disease } from '../lib/types'
import { pushHistory, toggleFavorite, isFavorite } from '../lib/storage'

export function DiseaseDetail() {
  const { id } = useParams()
  const [disease, setDisease] = useState<Disease | null>(null)
  const [fav, setFav] = useState(false)

  useEffect(() => {
    if (!id) return
    getDisease(id).then((d) => {
      if (d) {
        setDisease(d)
        setFav(isFavorite(d.id))
        pushHistory({ id: d.id, nome: d.nome })
      }
    })
  }, [id])

  if (!disease) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-600">Carregando…</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold">{disease.nome}</h1>
            <div className="mt-1 text-xs text-slate-500">{disease.categoria || 'Doença'}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              toggleFavorite(disease.id)
              setFav(isFavorite(disease.id))
            }}
            className={`rounded-xl px-3 py-2 text-sm font-extrabold ${
              fav ? 'bg-rose-50 text-rose-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {fav ? '★ Favorito' : '☆ Favoritar'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/diseases" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            Voltar para doenças
          </Link>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            onClick={async () => {
              const url = window.location.href
              const text = `Guia: ${disease.nome}`
              if (navigator.share) {
                try {
                  await navigator.share({ title: disease.nome, text, url })
                  return
                } catch {
                  // ignore
                }
              }
              try {
                await navigator.clipboard.writeText(url)
                alert('Link copiado!')
              } catch {
                alert('Não foi possível copiar. Copie manualmente o endereço.')
              }
            }}
          >
            Compartilhar
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {disease.html ? (
          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: disease.html }} />
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-slate-700">{disease.texto || disease.resumo || ''}</pre>
        )}
      </section>
    </div>
  )
}

