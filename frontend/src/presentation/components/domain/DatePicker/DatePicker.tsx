import { format, subDays, addDays, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

export function DatePicker({ value, onChange }: Props) {
  const today = new Date()
  const isToday = format(value, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(prevWorkday(value))}
        className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:border-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors text-gray-500 dark:text-gray-400"
        aria-label="Dia útil anterior"
      >
        ‹
      </button>

      <input
        type="date"
        value={format(value, 'yyyy-MM-dd')}
        max={format(today, 'yyyy-MM-dd')}
        onChange={(e) => e.target.value && onChange(new Date(e.target.value + 'T00:00:00'))}
        className="px-3 py-2 text-sm bg-white dark:bg-[#0F1C2E] border border-gray-200 dark:border-white/10 rounded-lg text-[#071D41] dark:text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
      />

      <button
        onClick={() => onChange(nextWorkday(value))}
        disabled={isToday}
        className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:border-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Próximo dia útil"
      >
        ›
      </button>

      <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
        {format(value, "EEEE, dd 'de' MMMM", { locale: ptBR })}
      </span>
    </div>
  )
}
