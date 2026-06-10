/** Shape returned by GET /editions/ and GET /editions/{id} — mirrors Python's EditionOut schema */
export interface EditionDTO {
  id: number
  title: string
  edition_number: string
  pub_date: string       // "YYYY-MM-DD"
  page_count: number
  pdf_url: string
  scraped_at: string     // ISO 8601 datetime
}
