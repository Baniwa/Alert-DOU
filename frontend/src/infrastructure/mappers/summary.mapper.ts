import { AISummary } from '../../domain/entities/AISummary'
import { AISummaryDTO } from '../api/dto/AISummaryDTO'

export function toAISummary(dto: AISummaryDTO): AISummary {
  return {
    id: dto.id,
    editionId: dto.edition_id,
    model: dto.model,
    summary: dto.summary,
    pagesRead: dto.pages_read,
    createdAt: new Date(dto.created_at),
  }
}
