import { format } from 'date-fns'

export const editionKeys = {
  all: ['editions'] as const,
  byDate: (date: Date) => ['editions', 'date', format(date, 'yyyy-MM-dd')] as const,
  detail: (id: number) => ['editions', 'detail', id] as const,
  summary: (id: number) => ['editions', 'summary', id] as const,
}
