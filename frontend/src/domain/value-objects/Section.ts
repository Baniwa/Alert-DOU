export type Section = 'secao1' | 'secao2' | 'secao3' | 'extra'

export const Section = {
  SECTION_1: 'secao1',
  SECTION_2: 'secao2',
  SECTION_3: 'secao3',
  EXTRA: 'extra',
} as const satisfies Record<string, Section>

export const SECTION_LABELS: Record<Section, string> = {
  [Section.SECTION_1]: 'Seção 1 — Atos Normativos',
  [Section.SECTION_2]: 'Seção 2 — Pessoal',
  [Section.SECTION_3]: 'Seção 3 — Contratos',
  [Section.EXTRA]: 'Edição Extra',
}

export const SECTION_DESCRIPTIONS: Record<Section, string> = {
  [Section.SECTION_1]: 'Decretos, portarias e atos normativos do governo federal',
  [Section.SECTION_2]: 'Nomeações, exonerações e movimentações de pessoal',
  [Section.SECTION_3]: 'Licitações, contratos e editais de órgãos públicos',
  [Section.EXTRA]: 'Publicação extraordinária fora do horário regular',
}

export function detectSection(title: string): Section {
  const t = title.toLowerCase()
  if (t.includes('seção 2') || t.includes('secao 2')) return Section.SECTION_2
  if (t.includes('seção 3') || t.includes('secao 3')) return Section.SECTION_3
  if (t.includes('extra')) return Section.EXTRA
  return Section.SECTION_1
}
