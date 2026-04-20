import { Link } from 'react-router-dom'
import { useDiseases } from '../hooks/useDiseases'

export function Home() {
  const { coverImage } = useDiseases()

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {coverImage && (
          <img src={coverImage} alt="Capa do ebook" className="mb-6 w-full rounded-xl shadow-sm" />
        )}

        <h1 className="text-2xl font-extrabold text-[#2d5016]">Apresentação</h1>
        
        <div className="mt-4 space-y-4 text-slate-700 leading-relaxed">
          <p><strong>Olá, amigo criador!</strong></p>
          <p>Se você chegou até aqui, é provável que tenha enfrentado uma situação comum entre os apaixonados por aves: ver suas galinhas adoecerem e não saber exatamente como proceder.</p>
          <p>Eu entendo bem esse sentimento. Meu nome é João Paulo, estudando te zootecnia e sou criador de galinhas há mais de 10 anos.</p>
          <p>Neste guia, compartilho com você o conhecimento prático que adquiri ao longo dos anos, cuidando de diversas aves e superando desafios que vão desde doenças até problemas de higiene.</p>
          
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4 text-amber-800 my-6">
            <p className="text-sm">
              <strong>Aviso importante:</strong> Não sou médico veterinário, e este material não substitui o atendimento profissional. O que você encontrará aqui é fruto da minha experiência real como criador, refletindo o que realmente funcionou no dia a dia da criação.
            </p>
          </div>

          <h2 className="text-lg font-bold text-[#2d5016] mt-6 border-b border-slate-100 pb-2">Por que estou fazendo isso?</h2>
          <p>Minha missão com este e-book é ajudar você a evitar erros comuns, proteger suas aves e garantir uma criação saudável, de forma clara e objetiva, sem complicações linguísticas.</p>
          <p>Neste guia, você encontrará informações diretas e práticas, testadas no cotidiano. Se você ama suas galinhas tanto quanto eu, este guia se tornará um recurso essencial em sua jornada como criador.</p>

          <h2 className="text-lg font-bold text-[#2d5016] mt-6 border-b border-slate-100 pb-2">Para quem este guia é destinado?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Para aqueles que estão iniciando agora e desejam aprimorar os cuidados com as galinhas.</li>
            <li>Para criadores que já enfrentaram perdas devido a doenças e buscam evitar recorrências.</li>
            <li>Para todos que acreditam que a prevenção e o conhecimento são as melhores ferramentas na criação.</li>
          </ul>

          <h2 className="text-lg font-bold text-[#2d5016] mt-6 border-b border-slate-100 pb-2">O que você encontrará neste e-book</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Principais doenças que afetam as galinhas com orientações para identificação rápida.</li>
            <li>Causas e sintomas mais comuns, apresentados de forma clara e acessível.</li>
            <li>Tratamentos que se mostraram eficazes na prática, incluindo medicamentos injetáveis, via oral e comprimidos.</li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/diseases"
            className="rounded-xl bg-[#2d5016] px-6 py-3 text-center text-base font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
          >
            Acessar Doenças
          </Link>
        </div>
      </div>
    </div>
  )
}

