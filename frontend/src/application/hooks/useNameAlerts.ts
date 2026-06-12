import { useQueries } from '@tanstack/react-query'
import { searchEditionsByName } from '../../infrastructure/api/editions.api'
import type { EditionSearchResult } from '../../infrastructure/api/editions.api'

export interface NameAlert {
  name: string
  results: EditionSearchResult[]
  isLoading: boolean
  isError: boolean
}

export function useNameAlerts(names: string[]) {
  const queries = useQueries({
    queries: names.map((name) => ({
      queryKey: ['name-alert', name],
      queryFn: () => searchEditionsByName(name, 10),
      staleTime: 5 * 60 * 1000,
      retry: false,
      enabled: names.length > 0,
    })),
  })

  const alerts: NameAlert[] = names.map((name, i) => ({
    name,
    results: queries[i]?.data ?? [],
    isLoading: queries[i]?.isLoading ?? false,
    isError: queries[i]?.isError ?? false,
  }))

  const isLoading = queries.some((q) => q.isLoading)
  const totalMatches = alerts.reduce((sum, a) => sum + a.results.length, 0)
  const namesWithAlerts = alerts.filter((a) => a.results.length > 0).length

  return { alerts, isLoading, totalMatches, namesWithAlerts }
}
