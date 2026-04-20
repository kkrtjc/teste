export type Disease = {
  id: string
  nome: string
  categoria?: string
  resumo?: string
  html?: string
  texto?: string
  tags?: string[]
  section?: string
}

export type Guide = {
  id: string
  titulo: string
  html: string
  texto: string
}

export type DiseasesFile = {
  versao: string
  totalDoencas: number
  coverImage?: string
  intro?: string
  guides?: Guide[]
  diseases: Disease[]
}

