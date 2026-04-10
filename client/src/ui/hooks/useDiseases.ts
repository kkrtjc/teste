import { useEffect, useMemo, useState } from 'react'
import { ensureDiseasesLoaded, makeFuse } from '../lib/diseases'
import type { Disease, Guide } from '../lib/types'

export function useDiseases() {
  const [loading, setLoading] = useState(true)
  const [diseases, setDiseases] = useState<Disease[]>([])
  const [intro, setIntro] = useState('')
  const [coverImage, setCoverImage] = useState('/cover-ebook.png')
  const [guides, setGuides] = useState<Guide[]>([])

  useEffect(() => {
    let cancelled = false
    ensureDiseasesLoaded()
      .then((r) => {
        if (cancelled) return
        setDiseases(r.diseases)
        setIntro(r.intro || '')
        setCoverImage(r.coverImage || '/cover-ebook.png')
        setGuides(r.guides || [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const fuse = useMemo(() => (diseases.length ? makeFuse(diseases) : null), [diseases])

  return { loading, diseases, fuse, intro, coverImage, guides }
}

