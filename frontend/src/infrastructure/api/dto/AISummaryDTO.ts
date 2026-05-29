/** Shape returned by GET /editions/{id}/summary — mirrors Python's SummaryOut schema */
export interface AISummaryDTO {
  id: number
  edition_id: number
  edition_number?: string
  edition_title?: string
  model: string
  summary: string
  pages_read: number
  created_at: string   // ISO 8601 datetime
}
