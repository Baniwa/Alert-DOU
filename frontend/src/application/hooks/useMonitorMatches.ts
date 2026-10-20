import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchSearchCoverage, searchEditionsByName } from '../../infrastructure/api/editions.api'
import type { EditionSearchResult } from '../../infrastructure/api/editions.api'

export interface MonitorMatch {
  value: string
  results: EditionSearchResult[]
  newResults: number
  isLoading: boolean
  isError: boolean
}

const STALE_TIME = 15 * 60 * 1000

export function useMonitorMatches(values: string[], lastVisit: string | null) {
  const queries = useQueries({
    queries: values.map((value) => ({
      queryKey: ['monitor-match', value],
      queryFn: () => searchEditionsByName(value, 10),
      staleTime: STALE_TIME,
      retry: false,
    })),
  })

  const matches: MonitorMatch[] = values.map((value, i) => {
    const results = queries[i]?.data ?? []
    return {
      value,
      results,
      newResults: lastVisit ? results.filter((r) => r.pub_date > lastVisit).length : 0,
      isLoading: queries[i]?.isLoading ?? false,
      isError: queries[i]?.isError ?? false,
    }
  })

  return {
    matches,
    isLoading: queries.some((q) => q.isLoading),
    withResults: matches.filter((m) => m.results.length > 0).length,
    withNewResults: matches.filter((m) => m.newResults > 0).length,
  }
}

export function useSearchCoverage() {
  return useQuery({ queryKey: ['search-coverage'], queryFn: fetchSearchCoverage, staleTime: STALE_TIME })
}
