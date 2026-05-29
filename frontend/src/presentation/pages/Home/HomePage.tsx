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
    <div className="w-full">

      {/* ── Page heading ── */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2">
          Diário Oficial da União
        </p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
            {format(date, "EEEE',' dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h1>

          {/* Date nav */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDate(prevWorkday(date))}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#1351B4] hover:text-[#1351B4] hover:shadow-sm transition-all"
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="date"
              value={format(date, 'yyyy-MM-dd')}
              max={format(today, 'yyyy-MM-dd')}
              onChange={(e) => e.target.value && setDate(new Date(e.target.value + 'T00:00:00'))}
              className="h-9 px-3 text-[13px] font-semibold bg-white border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-[#1351B4] focus:ring-1 focus:ring-[#1351B4] transition-colors cursor-pointer"
            />

            <button
              onClick={() => setDate(nextWorkday(date))}
              disabled={isToday}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#1351B4] hover:text-[#1351B4] hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Newsletter Header ── */}
      {!isLoading && !isError && (
        <div className={`mb-8 p-5 rounded-xl border shadow-sm ${ordered.length > 0 ? 'bg-[#168821]/5 border-[#168821]/20' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${ordered.length > 0 ? 'bg-[#168821] text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
              {ordered.length > 0 ? <FileText size={20} /> : <Layers size={20} />}
            </div>
            <div>
              <h2 className={`text-lg font-bold mb-1 ${ordered.length > 0 ? 'text-[#168821]' : 'text-gray-700'}`}>
                {ordered.length > 0 ? 'Publicações de hoje já disponíveis! 📰' : 'Nenhuma publicação neste dia.'}
              </h2>
              <p className="text-[13px] text-gray-600 leading-relaxed max-w-3xl">
                {ordered.length > 0 
                  ? `Foram publicadas ${ordered.length} seções oficiais e ${extras.length} edições extras. O documento completo contém ${totalPages.toLocaleString('pt-BR')} páginas sob a edição de número ${editions?.[0]?.editionNumber}.` 
                  : 'O Diário Oficial da União não registrou publicações nesta data. Geralmente isso ocorre em finais de semana ou feriados nacionais.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center mb-8 shadow-sm">
          <p className="text-3xl mb-4 text-red-500">⚠️</p>
          <p className="text-[15px] font-bold text-red-800 mb-1">Não foi possível conectar ao servidor Gov.br</p>
          <p className="text-xs text-red-600 font-mono bg-red-100 inline-block px-2 py-1 rounded mt-2">{import.meta.env.VITE_API_URL ?? 'http://localhost:8002'}</p>
        </div>
      )}

      {/* ── Editions grid ── */}
      {!isLoading && ordered.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ordered.map((ed) => ed && <EditionCard key={ed.id} edition={ed} />)}
          </div>

          {extras.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-3 mb-5">
                <h3 className="text-sm font-bold text-[#1351B4] uppercase tracking-wider">
                  Edições Extras
                </h3>
                <div className="h-px bg-gray-200 flex-1" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {extras.map((e) => <EditionCard key={e.id} edition={e} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
