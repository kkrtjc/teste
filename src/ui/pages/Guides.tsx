export function Guides() {
  return (
    <div className="space-y-8 pb-10">
      <div className="px-1">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Tabelas Rápidas</h1>
        <p className="text-sm text-slate-500 font-medium">Cronogramas e orientações técnicas para o manejo.</p>
      </div>

      {/* TABELA DE VACINAÇÃO */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="text-xl">💉</span>
          <h2 className="text-lg font-extrabold text-[#2d5016] uppercase tracking-tighter">Calendário de Vacinação</h2>
        </div>
        
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-50 text-[10px] font-black text-emerald-900 uppercase tracking-widest">
                <th className="px-4 py-4">Idade</th>
                <th className="px-4 py-4">Vacina</th>
                <th className="px-4 py-4">Aplicação</th>
              </tr>
            </thead>
            <tbody className="text-xs font-bold text-slate-700">
              <tr className="border-t border-slate-100">
                <td className="px-4 py-4 text-emerald-700 font-black">1º Dia</td>
                <td className="px-4 py-4">Marek e Bouba</td>
                <td className="px-4 py-4">Subcutânea / Asa</td>
              </tr>
              <tr className="border-t border-slate-100 bg-slate-50/30">
                <td className="px-4 py-4 text-emerald-700 font-black">8º Dia</td>
                <td className="px-4 py-4">Newcastle e Bronquite</td>
                <td className="px-4 py-4">Ocular ou Água</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-4 text-emerald-700 font-black">14º Dia</td>
                <td className="px-4 py-4">Gumboro (1ª dose)</td>
                <td className="px-4 py-4">Água de beber</td>
              </tr>
              <tr className="border-t border-slate-100 bg-slate-50/30">
                <td className="px-4 py-4 text-emerald-700 font-black">35º Dia</td>
                <td className="px-4 py-4">Bouba Forte</td>
                <td className="px-4 py-4">Membrana da asa</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-4 text-emerald-700 font-black">60º Dia</td>
                <td className="px-4 py-4">Coriza (1ª dose)</td>
                <td className="px-4 py-4">Intramuscular</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* GUIA DE VERMIFUGAÇÃO DETALHADO */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-slate-900">
          <span className="text-xl">🪱</span>
          <h2 className="text-lg font-extrabold uppercase tracking-tighter">Entendendo a Vermifugação</h2>
        </div>
        
        <div className="space-y-4">
          {/* Card: Tipos de Vermes */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Tipos de Vermes e Ação
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="font-black text-[#2d5016] uppercase mb-2">Vermes Redondos (Nematódeos)</h4>
                <p className="text-slate-600 font-bold mb-2">Ex: Ascarídia (lombriga) e Heterakis.</p>
                <p className="text-slate-500">Geralmente ficam no intestino e cecos. Roubam nutrientes e causam fraqueza.</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <h4 className="font-black text-[#2d5016] uppercase mb-2">Vermes Chatos (Cestódeos)</h4>
                <p className="text-slate-600 font-bold mb-2">Ex: Tênias (fita).</p>
                <p className="text-slate-500">Se fixam na parede do intestino. Exigem princípios ativos específicos pois são mais resistentes.</p>
              </div>
            </div>
          </div>

          {/* Card: Medicamentos e Ação */}
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-sm">
            <h3 className="text-sm font-black text-emerald-900 uppercase mb-4">Medicamentos Comuns</h3>
            <div className="space-y-4 text-xs">
              <div className="flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-emerald-700 shadow-sm">01</div>
                <div>
                  <h4 className="font-black text-emerald-900 uppercase">Mebendazol / Albendazol</h4>
                  <p className="text-emerald-800/70 font-medium">Age impedindo que o verme absorva glicose. O verme "morre de fome" e é expelido. Eficaz contra a maioria dos vermes redondos.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-emerald-700 shadow-sm">02</div>
                <div>
                  <h4 className="font-black text-emerald-900 uppercase">Levamisol / Piperazina</h4>
                  <p className="text-emerald-800/70 font-medium">Atuam paralisando o sistema nervoso do verme. Ele solta do intestino e sai vivo nas fezes (importante limpar o galinheiro após o uso).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-emerald-700 shadow-sm">03</div>
                <div>
                  <h4 className="font-black text-emerald-900 uppercase">Praziquantel</h4>
                  <p className="text-emerald-800/70 font-medium">O principal aliado contra vermes chatos (tênias). Causa uma contração severa no verme, desintegrando sua proteção externa.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Dica Extra: Manejo */}
          <div className="rounded-3xl bg-[#2d5016] p-6 text-white shadow-lg">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 text-emerald-300">Dica de Ouro do Protocolo</h4>
            <p className="text-sm font-bold leading-relaxed">
              Nunca use apenas o mesmo vermífugo para sempre. Os vermes criam resistência. O ideal é rotacionar os princípios ativos e sempre fornecer um suplemento vitamínico (Vitamina A e Complexo B) após a vermifugação para ajudar na recuperação da mucosa intestinal das aves.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
