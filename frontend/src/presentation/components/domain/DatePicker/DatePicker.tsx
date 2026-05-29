import { addDays, format, isWeekend } from 'date-fns'
import { subDays } from 'date-fns'

interface Props {
  value: Date
  onChange: (date: Date) => void
}

function prevWorkday(d: Date): Date {
  let prev = subDays(d, 1)
  while (isWeekend(prev)) prev = subDays(prev, 1)
  return prev
}

function nextWorkday(d: Date): Date {
  let next = addDays(d, 1)
  while (isWeekend(next)) next = addDays(next, 1)
  return next
}

const BTN = "w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:border-[#C9A84C]/50 hover:text-[#C9A84C] transition-all duration-150 text-base disabled:opacity-25 disabled:cursor-not-allowed select-none"

export function DatePicker({ value, onChange }: Props) {
  const today = new Date()
  const isToday = format(value, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(prevWorkday(value))} className={BTN} aria-label="Dia anterior">
        ‹
      </button>

      <input
        type="date"
        value={format(value, 'yyyy-MM-dd')}
        max={format(today, 'yyyy-MM-dd')}
        onChange={(e) => e.target.value && onChange(new Date(e.target.value + 'T00:00:00'))}
        className="h-8 px-3 text-[13px] font-medium bg-[#0A1628] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#C9A84C]/60 transition-colors cursor-pointer"
      />

      <button
        onClick={() => onChange(nextWorkday(value))}
        disabled={isToday}
        className={BTN}
        aria-label="Próximo dia"
      >
        ›
      </button>
    </div>
  )
}
