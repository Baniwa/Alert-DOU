import { format, isWeekend, subDays, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, FileText, Layers, Scale, Users, Sparkles, ArrowRight, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { useEditions } from '../../../application/hooks/useEditions'
import { editionKeys } from '../../../application/query-keys/editions.keys'
import { Section } from '../../../domain/value-objects/Section'
import type { Edition } from '../../../domain/entities/Edition'
import type { AISummary } from '../../../domain/entities/AISummary'
import { fetchEditionSummary, fetchAvailableDates, fetchEditionsForDate } from '../../../infrastructure/api/editions.api'
import { apiClient } from '../../../infrastructure/api/client'
import { toAISummary } from '../../../infrastructure/mappers/summary.mapper'
import type { AISummaryDTO } from '../../../infrastructure/api/dto/AISummaryDTO'
import { ApiError } from '../../../infrastructure/api/client'
import { CalendarPicker } from '../../components/ui/CalendarPicker'

// ── constants ───────────────────────────────────────────────────────────────

const MIN_CALENDAR_DATE = new Date('2026-01-01T00:00:00')

// ── helpers ─────────────────────────────────────────────────────────────────

function lastWorkday(): Date {
  let d = new Date()
  while (isWeekend(d)) d = subDays(d, 1)
  return d
}
function prevWorkday(d: Date): Date {
  let p = subDays(d, 1)
  while (isWeekend(p)) p = subDays(p, 1)
  return p
}
function nextWorkday(d: Date): Date {
  const n = new Date(d)
  n.setDate(n.getDate() + 1)
  while (isWeekend(n)) n.setDate(n.getDate() + 1)
  return n
}

const fetchAllSummaries = async (): Promise<AISummary[]> => {
  const { data } = await apiClient.get<AISummaryDTO[]>('/summaries')
  return data.map(toAISummary)
}

// ── section column config ────────────────────────────────────────────────────

const SECTION_CONFIG = {
  [Section.SECTION_1]: {
    icon: Scale,
    label: 'Seção 1',
    sublabel: 'Atos Normativos',
    accent: 'border-t-[#1351B4]',
    iconBg: 'bg-[#1351B4]/10',
    iconColor: 'text-[#1351B4]',
    badgeColor: 'bg-[#1351B4]/10 text-[#1351B4] border-[#1351B4]/20',
  },
  [Section.SECTION_2]: {
    icon: Users,
    label: 'Seção 2',
    sublabel: 'Pessoal',
    accent: 'border-t-[#C9A84C]',
    iconBg: 'bg-[#C9A84C]/15',
    iconColor: 'text-[#C9A84C]',
    badgeColor: 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20',
  },
  [Section.SECTION_3]: {
    icon: FileText,
    label: 'Seção 3',
    sublabel: 'Contratos',
    accent: 'border-t-[#168821]',
    iconBg: 'bg-[#168821]/10',
    iconColor: 'text-[#168821]',
    badgeColor: 'bg-[#168821]/10 text-[#168821] border-[#168821]/20',
  },
}

// ── SectionColumn ────────────────────────────────────────────────────────────

interface SectionColumnProps {
  section: Section
  edition: Edition | undefined
  existingSummary: AISummary | undefined
}

function SectionColumn({ section, edition, existingSummary }: SectionColumnProps) {
  const cfg = SECTION_CONFIG[section]
  const Icon = cfg.icon
  const [shouldGenerate, setShouldGenerate] = useState(false)

  const { data: summary, isLoading, isError, error } = useQuery({
    queryKey: ['summary', edition?.id],
    queryFn: () => fetchEditionSummary(edition!.id),
    enabled: !!edition && shouldGenerate && !existingSummary,
    initialData: existingSummary,
    retry: false,
    staleTime: Infinity,
  })

  const apiError = error instanceof ApiError ? error : null

  if (!edition) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center min-h-[280px] text-center">
        <Layers size={28} className="text-gray-300 mb-3" />
        <p className="text-sm text-gray-400 font-medium">{cfg.label} não publicada hoje</p>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm border-t-4 ${cfg.accent} flex flex-col`}>
      {/* Column header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={15} className={cfg.iconColor} />
            </div>
            <div>
              <p className="text-[12px] font-extrabold text-gray-800 leading-none">{cfg.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{cfg.sublabel}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
            Nº {edition.editionNumber}
          </span>
        </div>
        <p className="text-[11px] text-gray-400">{edition.pageCount.toLocaleString('pt-BR')} páginas</p>
      </div>

      {/* Summary area */}
      <div className="flex-1 p-5">
        {isLoading && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1351B4] animate-pulse" />
              <span className="text-[11px] font-bold text-[#1351B4] uppercase tracking-wider">Gerando resumo com IA...</span>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-2.5 bg-gray-100 rounded animate-pulse ${i === 5 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        )}

        {isError && (
          <div className="py-4">
            <p className="text-[12px] font-bold text-red-600 mb-1">
              {apiError?.status === 503
                ? 'Chave Gemini não configurada'
                : apiError?.status === 502
                ? 'Link do PDF expirou'
                : 'Falha ao gerar resumo'}
            </p>
            <p className="text-[11px] text-red-500 leading-relaxed mb-3">
              {apiError?.status === 503
                ? 'Configure GEMINI_API_KEY no .env.'
                : apiError?.status === 502
                ? 'A edição foi encontrada no DOU, mas o link temporário do PDF expirou. Tente novamente em alguns minutos.'
                : (apiError?.message ?? 'Erro desconhecido.')}
            </p>
            {apiError?.status !== 503 && (
              <button
                onClick={() => setShouldGenerate(true)}
                className="text-[11px] font-bold text-red-600 hover:underline"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && summary && (
          <div className="space-y-3">
            <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-6">
              {summary.summary.replace(/[*#]/g, '').trim()}
            </p>
            <Link
              to={`/editions/${edition.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1351B4] hover:text-[#168821] transition-colors"
            >
              Ler resumo completo
              <ArrowRight size={11} />
            </Link>
          </div>
        )}

        {!isLoading && !isError && !summary && !shouldGenerate && (
          <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-center">
            <Sparkles size={22} className="text-gray-300 mb-3" />
            <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
              Resumo IA ainda não gerado para esta edição.
            </p>
            <button
              onClick={() => setShouldGenerate(true)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${cfg.iconBg} ${cfg.iconColor} border-current/20 hover:opacity-80`}
            >
              Gerar com IA
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCalendar, setShowCalendar] = useState(false)
  const [isFetchingDate, setIsFetchingDate] = useState(false)
  const [fetchDateError, setFetchDateError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const date = (() => {
    const p = searchParams.get('date')
    return p ? new Date(p + 'T00:00:00') : lastWorkday()
  })()
  const setDate = (d: Date) => setSearchParams({ date: format(d, 'yyyy-MM-dd') }, { replace: false })

  const today = lastWorkday()
  const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  // Arrows are limited to the last 30 days; the calendar widget goes back to 2026-01-01
  const minDate = subMonths(today, 1)

  const { data: editions, isLoading, isError } = useEditions(date)
  const { data: allSummaries } = useQuery({
    queryKey: ['summaries'],
    queryFn: fetchAllSummaries,
    staleTime: 2 * 60 * 1000,
  })
  const { data: availableDates } = useQuery({
    queryKey: ['edition-dates'],
    queryFn: fetchAvailableDates,
    staleTime: 5 * 60 * 1000,
  })

  // Auto-redirect to most recent available date when:
  // - User opened the app without a date param (portfolio "live" link)
  // - Today/last workday has no editions yet (scraper hasn't run)
  // - There is at least one date with data in the DB
  useEffect(() => {
    const hasManualDate = !!searchParams.get('date')
    const todayIsEmpty = !isLoading && !isError && editions?.length === 0
    const fallback = availableDates?.[0]

    if (!hasManualDate && todayIsEmpty && fallback) {
      setSearchParams({ date: format(fallback, 'yyyy-MM-dd') }, { replace: true })
    }
  }, [isLoading, isError, editions, availableDates, searchParams, setSearchParams])

  const summaryByEditionId = useMemo(() => {
    if (!allSummaries) return {} as Record<number, AISummary>
    return Object.fromEntries(allSummaries.map((s) => [s.editionId, s])) as Record<number, AISummary>
  }, [allSummaries])

  async function handleFetchDate() {
    setIsFetchingDate(true)
    setFetchDateError(null)
    try {
      const result = await fetchEditionsForDate(date)
      await queryClient.invalidateQueries({ queryKey: editionKeys.byDate(date) })
      await queryClient.invalidateQueries({ queryKey: ['edition-dates'] })
      if (result.editions_found === 0) {
        setFetchDateError('Nenhuma edição encontrada para esta data — pode ser feriado ou falha no DOU.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[handleFetchDate]', msg)
      setFetchDateError(`Erro: ${msg}`)
    } finally {
      setIsFetchingDate(false)
    }
  }

  const mainSections = [Section.SECTION_1, Section.SECTION_2, Section.SECTION_3]
  const sectionEditions = mainSections.map((s) => editions?.find((e) => e.section === s))
  const totalPages = editions?.reduce((sum, e) => sum + e.pageCount, 0) ?? 0
  const editionNumber = editions?.[0]?.editionNumber

  return (
    <div className="w-full">

      {/* ── Masthead ── */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">
          Diário Oficial da União
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight capitalize">
              {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </h1>
            {editionNumber && !isLoading && (
              <p className="text-[12px] text-gray-500 mt-1">
                Edição nº {editionNumber} · {totalPages.toLocaleString('pt-BR')} páginas no total
              </p>
            )}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDate(prevWorkday(date))}
              disabled={format(prevWorkday(date), 'yyyy-MM-dd') < format(minDate, 'yyyy-MM-dd')}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#1351B4] hover:text-[#1351B4] hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Calendar picker — replaces native date input + "Outras datas" dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCalendar((v) => !v)}
                className={`h-9 px-3.5 flex items-center gap-2 text-[13px] font-semibold rounded-lg border bg-white transition-all focus:outline-none ${
                  showCalendar
                    ? 'border-[#1351B4] text-[#1351B4]'
                    : 'border-gray-300 text-gray-800 hover:border-[#1351B4] hover:text-[#1351B4]'
                }`}
              >
                <Calendar size={14} />
                {format(date, "dd/MM/yyyy")}
              </button>

              {showCalendar && (
                <CalendarPicker
                  selectedDate={date}
                  availableDates={availableDates ?? []}
                  latestDate={today}
                  minCalendarDate={MIN_CALENDAR_DATE}
                  onSelect={setDate}
                  onClose={() => setShowCalendar(false)}
                />
              )}
            </div>

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

      {/* ── Loading skeleton ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
          <p className="text-2xl mb-3 text-red-400">⚠️</p>
          <p className="text-sm font-bold text-red-800">Não foi possível conectar ao servidor</p>
        </div>
      )}

      {/* ── No editions for this date ── */}
      {!isLoading && !isError && editions?.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-16 text-center">
          {isWeekend(date) ? (
            <>
              <p className="text-3xl mb-4">📭</p>
              <p className="text-sm font-bold text-gray-700 mb-1">Nenhuma publicação nesta data</p>
              <p className="text-xs text-gray-500">Finais de semana e feriados não possuem edição do DOU.</p>
            </>
          ) : (
            <>
              <p className="text-3xl mb-4">🔍</p>
              <p className="text-sm font-bold text-gray-700 mb-2">Esta data ainda não foi indexada</p>
              <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
                Os dados do DOU para {format(date, "dd/MM/yyyy")} ainda não foram carregados.
                Clique para buscar agora — leva cerca de 20 segundos.
              </p>
              {fetchDateError && (
                <p className="text-xs text-red-500 mb-4 max-w-xs mx-auto">{fetchDateError}</p>
              )}
              <button
                onClick={handleFetchDate}
                disabled={isFetchingDate}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1351B4] hover:bg-[#0c326f] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-all shadow-sm"
              >
                <RefreshCw size={14} className={isFetchingDate ? 'animate-spin' : ''} />
                {isFetchingDate ? 'Buscando no DOU...' : 'Buscar no DOU'}
              </button>
              {isFetchingDate && (
                <p className="text-xs text-gray-400 mt-3">Iniciando browser, aguarde...</p>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 3-column newspaper layout ── */}
      {!isLoading && !isError && editions && editions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {mainSections.map((section) => {
            const edition = sectionEditions[mainSections.indexOf(section)]
            return (
              <SectionColumn
                key={section}
                section={section}
                edition={edition}
                existingSummary={edition ? summaryByEditionId[edition.id] : undefined}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
