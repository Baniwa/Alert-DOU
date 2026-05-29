import { isWeekend, subDays } from 'date-fns'
import { useState } from 'react'
import { useEditions } from '../../../application/hooks/useEditions'
import { Section } from '../../../domain/value-objects/Section'
import { DatePicker } from '../../components/domain/DatePicker/DatePicker'
import { EditionCard } from '../../components/domain/EditionCard/EditionCard'

function lastWorkday(): Date {
  let d = new Date()
  while (isWeekend(d)) d = subDays(d, 1)
  return d
}

const SECTION_ORDER = [Section.SECTION_1, Section.SECTION_2, Section.SECTION_3, Section.EXTRA]

export function HomePage() {
  const [date, setDate] = useState<Date>(lastWorkday)
  const { data: editions, isLoading, isError } = useEditions(date)

  const ordered = SECTION_ORDER
    .map((s) => editions?.find((e) => e.section === s))
    .filter(Boolean)

  const extras = editions?.filter((e) => e.section === Section.EXTRA) ?? []

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#071D41] dark:text-white mb-1">
          Edições do DOU
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Selecione uma data para visualizar as edições publicadas.
        </p>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-gray-100 dark:bg-[#0F1C2E] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-6 bg-red-50 dark:bg-red-950/20 text-center">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
            Não foi possível carregar as edições
          </p>
          <p className="text-xs text-red-500">Verifique se a API está rodando em {import.meta.env.VITE_API_URL ?? 'http://localhost:8002'}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && ordered.length === 0 && (
        <div className="border border-dashed border-gray-300 dark:border-white/10 rounded-lg p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Nenhuma edição encontrada para esta data.
          </p>
          <p className="text-xs text-gray-400">
            O DOU é publicado apenas em dias úteis. Execute o scraper para coletar edições.
          </p>
        </div>
      )}

      {/* Edition grid */}
      {!isLoading && ordered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ordered.map((edition) => edition && (
              <EditionCard key={edition.id} edition={edition} />
            ))}
          </div>

          {extras.length > 1 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Edições Extras</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {extras.map((e) => <EditionCard key={e.id} edition={e} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
