import { useEffect, useMemo, useState } from 'react'

type VersionFile = {
  versao: string
  dataAtualizacao?: string
  totalDoencas?: number
  idioma?: string
  checksum?: string
}

const LS_KEY = 'appVersion'

function compareVersions(v1: string, v2: string) {
  const a = v1.split('.').map((n) => Number(n))
  const b = v2.split('.').map((n) => Number(n))
  for (let i = 0; i < 3; i++) {
    const x = a[i] || 0
    const y = b[i] || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

export function useAppVersion() {
  const [remote, setRemote] = useState<VersionFile | null>(null)
  const [local, setLocal] = useState<VersionFile>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '{"versao":"1.0.0"}')
    } catch {
      return { versao: '1.0.0' }
    }
  })

  const version = local.versao || '1.0.0'
  const updateAvailable = useMemo(() => !!remote && compareVersions(remote.versao, version) > 0, [remote, version])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/version.json?cache-bust=${Date.now()}`)
        if (!res.ok) return
        const vf = (await res.json()) as VersionFile
        if (cancelled) return
        setRemote(vf)
      } catch {
        // ignore
      }
    }
    load()
    const id = window.setInterval(load, 24 * 60 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  function applyUpdate() {
    if (!remote) return
    localStorage.setItem(LS_KEY, JSON.stringify(remote))
    setLocal(remote)
    window.location.reload()
  }

  return { version, updateAvailable, applyUpdate }
}

