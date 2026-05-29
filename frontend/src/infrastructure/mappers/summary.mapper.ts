import type { AISummary } from '../../domain/entities/AISummary'
import type { AISummaryDTO } from '../api/dto/AISummaryDTO'

export function toAISummary(dto: AISummaryDTO): AISummary {
  return {
    id: dto.id,
    editionId: dto.edition_id,
    editionNumber: dto.edition_number,
    editionTitle: dto.edition_title,
    model: dto.model,
    summary: dto.summary,
    pagesRead: dto.pages_read,
    createdAt: new Date(dto.created_at),
  }
}
