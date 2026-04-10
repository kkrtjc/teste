import { useEffect, useMemo, useState } from 'react'
import { ensureDiseasesLoaded, makeFuse } from '../lib/diseases'
import type { Disease } from '../lib/types'

export function useDiseases() {
  const [loading, setLoading] = useState(true)
  const [diseases, setDiseases] = useState<Disease[]>([])

  useEffect(() => {
    let cancelled = false
    ensureDiseasesLoaded()
      .then((r) => {
        if (cancelled) return
        setDiseases(r.diseases)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fuse = useMemo(() => (diseases.length ? makeFuse(diseases) : null), [diseases])

  return { loading, diseases, fuse }
}

