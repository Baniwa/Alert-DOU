export interface AISummary {
  readonly id: number
  readonly editionId: number
  readonly editionNumber?: string
  readonly editionTitle?: string
  readonly model: string
  readonly summary: string
  readonly pagesRead: number
  readonly createdAt: Date
}
