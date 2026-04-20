import { useState } from 'react'

interface LoginProps {
  onLogin: () => void
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Função para calcular o hash SHA-256 da senha
  async function hashPassword(pwd: string) {
    const encoder = new TextEncoder()
    const data = encoder.encode(pwd)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Preencha todos os campos.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Busca o arquivo de credenciais
      const response = await fetch('/credentials.json')
      if (!response.ok) {
        throw new Error('Não foi possível carregar as credenciais.')
      }
      const data = await response.json()
      
      const pwdHash = await hashPassword(password)

      const user = data.users.find((u: any) => u.username === username && u.passwordHash === pwdHash)

      if (user) {
        localStorage.setItem('auth_token', 'logged_in')
        onLogin()
      } else {
        setError('Usuário ou senha incorretos.')
      }
    } catch (err) {
      setError('Erro ao processar o login. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐓</div>
          <h1 className="text-2xl font-extrabold text-[#2d5016]">Acesso Restrito</h1>
          <p className="text-sm text-slate-500 mt-1">Guia de Doenças em Galinhas</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="username">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#2d5016] focus:outline-none focus:ring-1 focus:ring-[#2d5016]"
              placeholder="Digite seu usuário"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#2d5016] focus:outline-none focus:ring-1 focus:ring-[#2d5016]"
              placeholder="Digite sua senha"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="text-red-600 text-sm font-semibold text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-[#2d5016] px-6 py-3 text-base font-bold text-white shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
