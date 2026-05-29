import { format, isWeekend, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
  const totalPages = editions?.reduce((sum, e) => sum + e.pageCount, 0) ?? 0

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-white/8">
        <div>
          <p className="text-[11px] font-semibold text-[#C9A84C] uppercase tracking-[0.15em] mb-1">
            Diário Oficial da União
          </p>
          <h2 className="text-2xl font-extrabold text-white leading-tight">
            {format(date, "EEEE',' dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <DatePicker value={date} onChange={setDate} />
      </div>

      {/* Stats bar */}
      {!isLoading && editions && editions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Seções publicadas', value: ordered.length },
            { label: 'Total de páginas', value: totalPages.toLocaleString('pt-BR') },
            { label: 'Edição nº', value: editions[0].editionNumber },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0A1628] border border-white/8 rounded-xl px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-[#0A1628] rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-8 text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm font-semibold text-red-400 mb-1">Não foi possível conectar à API</p>
          <p className="text-xs text-red-600">{import.meta.env.VITE_API_URL ?? 'http://localhost:8002'}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && ordered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-16 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-sm font-semibold text-gray-400 mb-1">Nenhuma edição coletada para esta data</p>
          <p className="text-xs text-gray-600">O DOU é publicado apenas em dias úteis.</p>
        </div>
      )}

      {/* Edition grid */}
      {!isLoading && ordered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ordered.map((edition) => edition && (
              <EditionCard key={edition.id} edition={edition} />
            ))}
          </div>

          {extras.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Edições Extras
              </p>
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
