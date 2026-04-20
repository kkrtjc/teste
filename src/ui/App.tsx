import React, { useState, useEffect } from 'react'
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { useOnline } from './hooks/useOnline'
import { Home } from './pages/Home'
import { Diseases } from './pages/Diseases'
import { AiAnalysis } from './pages/AiAnalysis'
import { Guides } from './pages/Guides'
import { DiseaseDetail } from './pages/DiseaseDetail'
import { useAppVersion } from './hooks/useAppVersion'
import { Login } from './pages/Login'

export default function App() {
  const online = useOnline()
  const { version, updateAvailable, applyUpdate } = useAppVersion()
  const navigate = useNavigate()

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token === 'logged_in') {
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  if (isAuthenticated === null) return null

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setIsAuthenticated(false)
  }

  const handleForceUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.update()
        }
        window.location.reload()
      })
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-left font-semibold text-slate-900 hover:bg-slate-100"
          >
            <span className="text-xl">🐓</span>
            <span className="leading-tight">
              Guia de Doenças
              <span className="block text-xs font-medium text-slate-500">Galinhas • Offline</span>
            </span>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                online ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {online ? 'Online' : 'Offline'}
            </span>

            {/* BOTÃO DA ENGRENAGEM */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>

              {showSettings && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-xl z-20 overflow-hidden">
                    <div className="p-2 space-y-1">
                      <button
                        onClick={() => { handleForceUpdate(); setShowSettings(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-lg">🔄</span>
                        Forçar Atualização
                      </button>
                      
                      <div className="border-t border-slate-100 my-1"></div>
                      
                      <button
                        onClick={() => { handleLogout(); setShowSettings(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <span className="text-lg">🚪</span>
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="mx-auto max-w-5xl px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <Tab to="/">Início</Tab>
            <Tab to="/diseases">Doenças</Tab>
            <Tab to="/analysis">Análise</Tab>
            <Tab to="/guides">Tabelas</Tab>
          </div>
        </nav>

        {updateAvailable && (
          <div className="border-t border-slate-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Nova atualização disponível!</span>
            <button
              onClick={applyUpdate}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm uppercase"
            >
              Atualizar
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/diseases" element={<Diseases />} />
          <Route path="/analysis" element={<AiAnalysis />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/disease/:id" element={<DiseaseDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Protocolo Elite</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Guia Digital de Doenças v{version}</span>
          </div>
          <span className="text-[9px] font-black text-[#2d5016] uppercase border-b-2 border-emerald-500 pb-1">Funciona Offline</span>
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
        `shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
          isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-100 bg-white text-slate-500'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function NotFound() {
  return (
    <div className="text-center py-10">
      <h1 className="text-xl font-bold">404 - Não encontrado</h1>
    </div>
  )
}
