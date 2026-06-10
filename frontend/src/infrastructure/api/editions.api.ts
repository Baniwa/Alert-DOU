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
  // Re-scrape + PDF download + AI generation can take up to ~60s for older editions
  const { data } = await apiClient.get<AISummaryDTO>(`/editions/${editionId}/summary`, { timeout: 240_000 })
  return toAISummary(data)
}

export async function fetchEditionSummaryEn(editionId: number): Promise<AISummary> {
  // Translation via Gemini — cached in DB after first call, subsequent calls are instant
  const { data } = await apiClient.get<AISummaryDTO>(`/editions/${editionId}/summary/en`, { timeout: 120_000 })
  return toAISummary(data)
}

export async function fetchAvailableDates(): Promise<Date[]> {
  const { data } = await apiClient.get<string[]>('/editions/dates')
  return data.map((d) => new Date(d + 'T00:00:00'))
}
