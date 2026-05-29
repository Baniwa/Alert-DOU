import { format } from 'date-fns'
import type { Edition } from '../../domain/entities/Edition'
import type { AISummary } from '../../domain/entities/AISummary'
import { toEdition, toEditionList } from '../mappers/edition.mapper'
import { toAISummary } from '../mappers/summary.mapper'
import { apiClient } from './client'
import type { EditionDTO } from './dto/EditionDTO'
import type { AISummaryDTO } from './dto/AISummaryDTO'

export async function fetchEditions(pubDate?: Date): Promise<Edition[]> {
  const params = pubDate ? { pub_date: format(pubDate, 'yyyy-MM-dd') } : {}
  const { data } = await apiClient.get<EditionDTO[]>('/editions/', { params })
  return toEditionList(data)
}

export async function fetchEditionById(id: number): Promise<Edition> {
  const { data } = await apiClient.get<EditionDTO>(`/editions/${id}`)
  return toEdition(data)
}

export async function fetchEditionSummary(editionId: number): Promise<AISummary> {
  const { data } = await apiClient.get<AISummaryDTO>(`/editions/${editionId}/summary`)
  return toAISummary(data)
}
