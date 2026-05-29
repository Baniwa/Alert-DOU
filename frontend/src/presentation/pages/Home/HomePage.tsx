import { format, isWeekend, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, FileText, Layers } from 'lucide-react'
import { useState } from 'react'
import { useEditions } from '../../../application/hooks/useEditions'
import { Section } from '../../../domain/value-objects/Section'
import { EditionCard } from '../../components/domain/EditionCard/EditionCard'

function lastWorkday(): Date {
  let d = new Date()
  while (isWeekend(d)) d = subDays(d, 1)
  return d
}

function prevWorkday(d: Date): Date {
  let prev = subDays(d, 1)
  while (isWeekend(prev)) prev = subDays(prev, 1)
  return prev
}

function nextWorkday(d: Date): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + 1)
  while (isWeekend(next)) next.setDate(next.getDate() + 1)
  return next
}

const SECTION_ORDER = [Section.SECTION_1, Section.SECTION_2, Section.SECTION_3, Section.EXTRA]

export function HomePage() {
  const [date, setDate] = useState<Date>(lastWorkday)
  const { data: editions, isLoading, isError } = useEditions(date)
  const today = lastWorkday()
  const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

  const ordered = SECTION_ORDER
    .map((s) => editions?.find((e) => e.section === s))
    .filter(Boolean)

  const extras = editions?.filter((e) => e.section === Section.EXTRA) ?? []
  const totalPages = editions?.reduce((sum, e) => sum + e.pageCount, 0) ?? 0

  return (
    <div className="max-w-5xl">

      {/* ── Page heading ── */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold text-[#C9A84C] uppercase tracking-[0.18em] mb-2">
          Diário Oficial da União
        </p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            {format(date, "EEEE',' dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h1>

          {/* Date nav */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDate(prevWorkday(date))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all"
            >
              <ChevronLeft size={15} />
            </button>

            <input
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              max={format(today, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setDate(new Date(e.target.value + 'T00:00:00'))}
              className="h-8 px-3 text-[12px] font-medium bg-[#0A1628] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#C9A84C]/50 transition-colors cursor-pointer"
            />

            <button
              onClick={() => setDate(nextWorkday(date))}
              disabled={isToday}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      {!isLoading && editions && editions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#0A1628] border border-white/8 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1351B4]/20 flex items-center justify-center flex-shrink-0">
              <Layers size={14} className="text-[#5B9BD5]" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-1">Seções</p>
              <p className="text-xl font-bold text-white leading-none">{ordered.length}</p>
            </div>
          </div>
          <div className="bg-[#0A1628] border border-white/8 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/15 flex items-center justify-center flex-shrink-0">
              <FileText size={14} className="text-[#C9A84C]" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-1">Total de páginas</p>
              <p className="text-xl font-bold text-white leading-none">{totalPages.toLocaleString('pt-BR')}</p>
            </div>
          </div>
          <div className="bg-[#0A1628] border border-white/8 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-1">Edição</p>
            <p className="text-xl font-bold text-white leading-none">Nº {editions[0].editionNumber}</p>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-[#0A1628] rounded-xl animate-pulse border border-white/5" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-10 text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="text-sm font-semibold text-red-400 mb-1">Não foi possível conectar à API</p>
          <p className="text-xs text-red-700 font-mono">{import.meta.env.VITE_API_URL ?? 'http://localhost:8002'}</p>
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && !isError && ordered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 p-16 text-center">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-sm font-semibold text-gray-400 mb-1">Nenhuma edição coletada para esta data</p>
          <p className="text-xs text-gray-600">O DOU é publicado apenas em dias úteis.</p>
        </div>
      )}

      {/* ── Editions grid ── */}
      {!isLoading && ordered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ordered.map((ed) => ed && <EditionCard key={ed.id} edition={ed} />)}
          </div>

          {extras.length > 0 && (
            <div className="mt-8">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
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
