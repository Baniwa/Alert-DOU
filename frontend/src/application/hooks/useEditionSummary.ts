import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEditionSummary, fetchExistingSummary } from '../../infrastructure/api/editions.api'
import { editionKeys } from '../query-keys/editions.keys'

function shouldRetryGeneration(count: number, err: unknown) {
  const status = (err as { status?: number })?.status ?? 0
  if (status === 503) return false
  if (status === 0) return count < 5
  return count < 2
}

export function useEditionSummary(editionId: number, enabled = true) {
  const queryClient = useQueryClient()

  const existing = useQuery({
    queryKey: editionKeys.summary(editionId),
    queryFn: () => fetchExistingSummary(editionId),
    enabled,
    staleTime: Infinity,
  })

  const generation = useMutation({
    mutationFn: () => fetchEditionSummary(editionId),
    retry: shouldRetryGeneration,
    retryDelay: (attempt) => Math.min(3000 * attempt, 15_000),
    onSuccess: (summary) => {
      queryClient.setQueryData(editionKeys.summary(editionId), summary)
      queryClient.invalidateQueries({ queryKey: ['summaries'] })
    },
  })

  return {
    summary: existing.data ?? undefined,
    isMissing: existing.isSuccess && existing.data === null,
    isChecking: existing.isLoading,
    isGenerating: generation.isPending,
    isError: existing.isError || generation.isError,
    error: generation.error ?? existing.error,
    failureCount: generation.failureCount,
    generate: () => generation.mutate(),
  }
}
