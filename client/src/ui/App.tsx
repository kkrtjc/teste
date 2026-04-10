import React from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useOnline } from './hooks/useOnline'
import { Home } from './pages/Home'
import { Search } from './pages/Search'
import { Diseases } from './pages/Diseases'
import { Guides } from './pages/Guides'
import { Favorites } from './pages/Favorites'
import { History } from './pages/History'
import { DiseaseDetail } from './pages/DiseaseDetail'
import { useAppVersion } from './hooks/useAppVersion'
import { useInstallPrompt } from './hooks/useInstallPrompt'

export default function App() {
  const online = useOnline()
  const { version, updateAvailable, applyUpdate } = useAppVersion()
  const { canInstall, promptInstall } = useInstallPrompt()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-left font-semibold text-slate-900 hover:bg-slate-100"
            aria-label="Ir para início"
          >
            <span className="text-xl">🐓</span>
            <span className="leading-tight">
              Guia de Doenças
              <span className="block text-xs font-medium text-slate-500">Galinhas • Offline</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
              title={online ? 'Online' : 'Offline'}
            >
              {online ? 'Online' : 'Offline'}
            </span>

            {canInstall && (
              <button
                type="button"
                onClick={promptInstall}
                className="rounded-lg bg-[#2d5016] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Instalar
              </button>
            )}
          </div>
        </div>

        <nav className="mx-auto max-w-5xl px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto">
            <Tab to="/">Início</Tab>
            <Tab to="/diseases">Doenças</Tab>
            <Tab to="/guides">Guias</Tab>
            <Tab to="/search">Buscar</Tab>
            <Tab to="/favorites">Favoritos</Tab>
            <Tab to="/history">Histórico</Tab>
          </div>
        </nav>

        {updateAvailable && (
          <div className="border-t border-slate-200 bg-amber-50">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
              <div className="text-sm">
                <span className="font-semibold text-amber-900">Novas informações disponíveis.</span>{' '}
                <span className="text-amber-900/80">Atualize para ver as mudanças.</span>
              </div>
              <button
                type="button"
                onClick={applyUpdate}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Atualizar
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/diseases" element={<Diseases />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/search" element={<Search />} />
          <Route path="/disease/:id" element={<DiseaseDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500">
          <span>
            Versão: <span className="font-semibold">{version}</span>
          </span>
          <span>Funciona offline após abrir 1x.</span>
        </div>
      </footer>
    </div>
  )
}

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
          isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function NotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h1 className="text-lg font-bold">Página não encontrada</h1>
      <p className="mt-1 text-sm text-slate-600">Volte para a página inicial.</p>
    </div>
  )
}

