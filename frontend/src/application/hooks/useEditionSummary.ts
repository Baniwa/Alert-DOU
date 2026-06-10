import { useQuery } from '@tanstack/react-query'
import { fetchEditionSummary } from '../../infrastructure/api/editions.api'
import { editionKeys } from '../query-keys/editions.keys'

export function useEditionSummary(editionId: number, enabled = true) {
  return useQuery({
    queryKey: editionKeys.summary(editionId),
    queryFn: () => fetchEditionSummary(editionId),
    enabled,
    staleTime: Infinity,   // Summaries are immutable once generated
    retry: (count, err: unknown) => {
      // Don't retry on 503 (no API key) — user action required
      const status = (err as { status?: number })?.status
      return count < 2 && status !== 503
    },
  })
}
