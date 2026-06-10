import { useQuery } from '@tanstack/react-query'
import { fetchEditions } from '../../infrastructure/api/editions.api'
import { editionKeys } from '../query-keys/editions.keys'

export function useEditions(pubDate: Date) {
  return useQuery({
    queryKey: editionKeys.byDate(pubDate),
    queryFn: () => fetchEditions(pubDate),
    staleTime: 5 * 60 * 1000,   // 5 min — DOU editions don't change after publication
    retry: 2,
  })
}
