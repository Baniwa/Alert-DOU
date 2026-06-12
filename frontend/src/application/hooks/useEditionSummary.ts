import { useQuery } from '@tanstack/react-query'
import { fetchEditionSummary } from '../../infrastructure/api/editions.api'
import { editionKeys } from '../query-keys/editions.keys'

export function useEditionSummary(editionId: number, enabled = true) {
  const q = useQuery({
    queryKey: editionKeys.summary(editionId),
    queryFn: () => fetchEditionSummary(editionId),
    enabled,
    staleTime: Infinity,
    retry: (count, err: unknown) => {
      const status = (err as { status?: number })?.status ?? 0
      if (status === 503) return false
      if (status === 0) return count < 5
      return count < 2
    },
    retryDelay: (attempt) => Math.min(3000 * attempt, 15_000),
  })
  return { ...q, failureCount: q.failureCount }
}
