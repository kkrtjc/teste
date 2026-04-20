import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDiseases } from '../hooks/useDiseases'

const CATEGORIES = [
  { id: 'Doenças bacterianas respiratorias', label: 'Doenças Respiratórias', img: '/img_categorias/img_respiratorias.webp' },
  { id: 'Doenças bacterianas sistemicas', label: 'Doenças Sistêmicas', img: '/img_categorias/img_sistemicas.webp' },
  { id: 'Doenças virais', label: 'Doenças Virais', img: '/img_categorias/img_virais.webp' },
  { id: 'Casos isolados', label: 'Casos Isolados', img: '/img_categorias/casos_isolados.webp' },
  { id: 'Problemas de nutrição', label: 'Problemas de Nutrição', img: '/img_categorias/img_nutricionais.webp' },
]

export function Diseases() {
  const { diseases, loading } = useDiseases()
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!selectedCat) return []
    return diseases.filter((d) => (d.categoria || 'Casos isolados') === selectedCat)
  }, [diseases, selectedCat])

  return (
    <div className="space-y-6 pb-10">
      
      {!selectedCat ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className="group relative flex flex-col items-center justify-end aspect-square rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:border-[#2d5016] transition-all"
            >
              {/* IMAGEM DO CARD */}
              <div className="absolute inset-0 w-full h-full">
                <img 
                  src={cat.img} 
                  alt={cat.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Overlay para facilitar leitura do texto */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>

              {/* NOME EM BAIXO */}
              <span className="relative z-10 w-full p-3 text-sm font-black text-center text-white leading-tight uppercase tracking-tighter">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={() => setSelectedCat(null)}
            className="flex items-center gap-2 text-sm font-bold text-[#2d5016] mb-2 px-1"
          >
            ← Voltar para categorias
          </button>
          
          <h2 className="text-xl font-black text-slate-900 px-1 uppercase tracking-tight">
            {CATEGORIES.find(c => c.id === selectedCat)?.label}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            {loading ? (
              <div className="text-sm text-slate-600 p-1 font-bold animate-pulse">Carregando doenças...</div>
            ) : (
              filtered.map((d) => (
                <Link 
                  key={d.id} 
                  to={`/disease/${encodeURIComponent(d.id)}`} 
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 transition-all active:scale-95"
                >
                  <div className="font-extrabold text-slate-900 uppercase text-sm mb-1">{d.nome}</div>
                  <div className="line-clamp-2 text-xs text-slate-500 font-medium">{d.resumo || d.texto || ''}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
