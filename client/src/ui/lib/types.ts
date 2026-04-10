export type Severity = 'baixa' | 'media' | 'alta' | 'na'

export type DiseaseField =
  | { kind: 'intro'; text: string }
  | { kind: 'sintomas'; text: string }
  | { kind: 'prevencao'; text: string }
  | { kind: 'tratamento'; text: string }
  | { kind: 'antibioticos'; text: string }
  | { kind: 'anticoccidianos'; text: string }
  | { kind: 'vermifugos'; text: string }
  | { kind: 'medicamentos'; text: string }
  | { kind: 'produtos_aves'; text: string }
  | { kind: 'produtos_ambiente'; text: string }
  | { kind: 'suporte'; text: string }
  | { kind: 'suplementacao'; text: string }
  | { kind: 'primeiros_socorros'; text: string }
  | { kind: 'aviso'; text: string }
  | { kind: 'outro'; text: string }

export type Disease = {
  id: string
  nome: string
  tipo?: string
  severidade?: Severity
  tags?: string[]
  fields: DiseaseField[]
  section?: string
}

export type DiseasesFile = {
  versao: string
  totalDoencas: number
  diseases: Disease[]
}

