import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  selectedDate: Date
  availableDates: Date[]
  latestDate: Date
  minCalendarDate: Date
  onSelect: (d: Date) => void
  onClose: () => void
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function CalendarPicker({ selectedDate, availableDates, latestDate, minCalendarDate, onSelect, onClose }: Props) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate))
  const [isVisible, setIsVisible] = useState(false)
  const [monthKey, setMonthKey] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const now = useMemo(() => new Date(), [])

  // Animate in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const availableSet = useMemo(
    () => new Set(availableDates.map((d) => format(d, 'yyyy-MM-dd'))),
    [availableDates]
  )

  // Calendar grid: always starts on Sunday
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [viewMonth])

  // Hard floor is minCalendarDate (Jan 1, 2026 by design); ignore availableDates floor
  // so the user can navigate to months before any data is in the DB.
  const earliestMonth = useMemo(() => startOfMonth(minCalendarDate), [minCalendarDate])

  const canGoBack = viewMonth > earliestMonth
  const canGoForward = !isSameMonth(viewMonth, startOfMonth(now))

  function goToMonth(next: Date) {
    setViewMonth(next)
    setMonthKey((k) => k + 1)
  }

  // A day is navigable if it's a weekday within [minCalendarDate, today].
  // We don't block unknown past weekdays — the user may navigate there even
  // before the backfill has populated the DB for that date.
  function isNavigable(day: Date): boolean {
    const dow = getDay(day)
    const isWeekend = dow === 0 || dow === 6
    return !isWeekend && day >= minCalendarDate && day <= now
  }

  function handleDayClick(day: Date) {
    if (!isNavigable(day)) return
    onSelect(day)
    onClose()
  }

  function handleToday() {
    onSelect(latestDate)
    onClose()
  }

  return (
    <div
      ref={containerRef}
      style={{ transformOrigin: 'top right' }}
      className={`
        absolute right-0 top-12 z-50 w-[280px]
        bg-white rounded-2xl overflow-hidden
        border border-gray-100
        shadow-[0_12px_48px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.06)]
        transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}
      `}
    >
      {/* ── Month navigation ── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
        <button
          onClick={() => canGoBack && goToMonth(subMonths(viewMonth, 1))}
          disabled={!canGoBack}
          aria-label="Mês anterior"
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
        </button>

        <span className="text-[13px] font-bold text-gray-800 capitalize select-none">
          {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>

        <button
          onClick={() => canGoForward && goToMonth(addMonths(viewMonth, 1))}
          disabled={!canGoForward}
          aria-label="Próximo mês"
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Weekday header ── */}
      <div className="grid grid-cols-7 px-3 mb-0.5">
        {WEEKDAYS.map((abbr, i) => (
          <div
            key={i}
            className={`
              text-center text-[10px] font-bold py-1 select-none
              ${i === 0 || i === 6 ? 'text-gray-300' : 'text-gray-400'}
            `}
          >
            {abbr}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div key={monthKey} className="grid grid-cols-7 px-3 pb-2 animate-[calFadeIn_0.15s_ease-out]">
        {gridDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, viewMonth)
          const isAvailable = availableSet.has(key)   // confirmed: in DB with edition
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, now)
          const canNav = isNavigable(day)              // weekday in [minDate, today]

          // Visual state priorities:
          // 1. selected      → blue filled circle
          // 2. confirmed     → bold dark text + green dot + green hover
          // 3. unknown past  → medium gray text + gray hover (navigable, no dot)
          // 4. blocked       → very light gray, cursor-not-allowed (weekend / future)
          const dayClass = isSelected
            ? 'bg-[#1351B4] text-white font-bold shadow-md shadow-blue-200'
            : isAvailable
            ? `font-semibold hover:bg-green-50 hover:text-[#168821] cursor-pointer ${isToday ? 'ring-[1.5px] ring-[#168821]' : ''} text-gray-800`
            : canNav
            ? `text-gray-400 hover:bg-gray-100 cursor-pointer ${isToday ? 'ring-[1.5px] ring-gray-300' : ''}`
            : 'text-gray-200 cursor-not-allowed'

          // Invisible placeholder for days outside current month
          if (!inMonth) return <div key={key} className="h-9" />

          return (
            <div key={key} className="flex flex-col items-center gap-0.5 py-0.5">
              <button
                onClick={() => handleDayClick(day)}
                disabled={!canNav && !isSelected}
                title={format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                className={`
                  w-8 h-8 flex items-center justify-center rounded-full text-[13px] leading-none
                  transition-all duration-100 active:scale-90 select-none
                  ${dayClass}
                `}
              >
                {format(day, 'd')}
              </button>

              {/* Dot: green = confirmed in DB, invisible spacer otherwise */}
              {isAvailable && !isSelected
                ? <div className="w-1 h-1 rounded-full bg-[#168821] opacity-70" />
                : <div className="w-1 h-1" />
              }
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
        <span className="text-[11px] text-gray-400 tabular-nums">
          {availableDates.length} {availableDates.length === 1 ? 'edição' : 'edições'}
        </span>
        <button
          onClick={handleToday}
          className="text-[12px] font-bold text-[#1351B4] hover:opacity-70 active:opacity-50 transition-opacity"
        >
          Hoje
        </button>
      </div>
    </div>
  )
}
