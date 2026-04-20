import { useState, useEffect } from 'react'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

export function AiAnalysis() {
  const [symptoms, setSymptoms] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleAnalyze = async () => {
    if (!isOnline) return
    if (!symptoms.trim()) {
      setError('Por favor, descreva os sintomas primeiro.')
      return
    }
    setIsAnalyzing(true)
    setError('')
    setAiResponse('')

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Você é um médico veterinário especialista em aves (galinhas e galos). 
              Analise os seguintes sintomas e sugira a doença mais provável baseada no manual. 
              Sempre recomende um veterinário profissional.
              Sintomas: "${symptoms}"`
            }]
          }]
        })
      })
      const data = await response.json()
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setAiResponse(data.candidates[0].content.parts[0].text)
      } else {
        throw new Error('Resposta inesperada da IA.')
      }
    } catch (err) {
      setError('Erro ao tentar analisar. Verifique sua conexão.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      
      {/* ALERTA DE ISOLAMENTO */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <h2 className="text-xl font-extrabold text-red-700 flex items-center gap-2 mb-3">
          ⚠️ Isolamento Imediato
        </h2>
        <p className="text-sm text-red-900 leading-relaxed font-bold">
          Ao observar qualquer sinal estranho, isole a ave imediatamente das outras antes de iniciar o diagnóstico.
        </p>
      </div>

      {/* ORIENTAÇÕES DE OBSERVAÇÃO */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3">O que observar antes da análise:</h3>
        <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
          <li>Observe as <strong>fezes</strong> (cor, consistência).</li>
          <li>Verifique se continua a <strong>beber e comer</strong> normal.</li>
          <li>Emite <strong>sons ao respirar</strong> ou espirros? (Cuidado para não confundir com espirros durante a alimentação).</li>
          <li>Há <strong>secreção nasal ou ocular</strong> (espuma no olho ou nariz escorrendo)?</li>
          <li>Tem <strong>baba na garganta</strong>? Sente algum cheiro forte (fedida)?</li>
          <li>Olhe o <strong>interior da garganta</strong>: há sinais de placas amarelas ou escuras?</li>
        </ul>
        <p className="mt-4 text-xs font-bold text-[#2d5016]">
          Quanto mais informações você fornecer abaixo, mais precisa será a análise da nossa IA.
        </p>
      </div>

      {/* PAINEL DA IA */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#2d5016] mb-4">Relatar Sintomas</h2>
        
        {!isOnline ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="font-semibold text-sm">Esta ferramenta precisa de conexão com a internet para funcionar.</p>
          </div>
        ) : (
          <>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Descreva aqui tudo o que você observou detalhadamente..."
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#2d5016] focus:outline-none min-h-[150px] mb-3"
            />
            
            {error && <div className="text-red-600 text-sm mb-3 font-semibold">{error}</div>}
            
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full sm:w-auto rounded-xl bg-[#2d5016] px-6 py-3 text-sm font-bold text-white shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isAnalyzing ? 'Analisando...' : 'Analisar Sintomas'}
            </button>

            {aiResponse && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="font-bold text-emerald-800 mb-2">Análise do Especialista:</h3>
                <div className="text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed">
                  {aiResponse}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
