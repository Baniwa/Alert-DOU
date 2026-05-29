import { Section } from '../value-objects/Section'

export interface Edition {
  readonly id: number
  readonly title: string
  readonly editionNumber: string
  readonly pubDate: Date
  readonly pageCount: number
  readonly pdfUrl: string
  readonly scrapedAt: Date
  readonly section: Section
}
