import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getDisease } from '../lib/db'
import type { Disease, DiseaseField } from '../lib/types'
import { pushHistory, toggleFavorite, isFavorite } from '../lib/storage'

function labelFor(kind: DiseaseField['kind']) {
  switch (kind) {
    case 'sintomas':
      return 'Sintomas'
    case 'prevencao':
      return 'Prevenção'
    case 'tratamento':
      return 'Tratamento'
    case 'antibioticos':
      return 'Antibióticos'
    case 'anticoccidianos':
      return 'Anticoccidianos'
    case 'vermifugos':
      return 'Vermífugos'
    case 'medicamentos':
      return 'Medicamentos'
    case 'produtos_aves':
      return 'Produtos (Aves)'
    case 'produtos_ambiente':
      return 'Produtos (Ambiente)'
    case 'suporte':
      return 'Suporte'
    case 'suplementacao':
      return 'Suplementação'
    case 'primeiros_socorros':
      return 'Primeiros Socorros'
    case 'aviso':
      return 'Aviso'
    case 'intro':
      return 'Descrição'
    default:
      return 'Detalhes'
  }
}

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

  const byKind = useMemo(() => {
    if (!disease) return []
    return disease.fields
  }, [disease])

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
            <div className="mt-1 text-xs text-slate-500">ID: {disease.id}</div>
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
          <Link to="/search" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            Voltar para busca
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

      {byKind.map((f, idx) => (
        <section key={idx} className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-extrabold text-slate-900">{labelFor(f.kind)}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{f.text}</p>
        </section>
      ))}
    </div>
  )
}

