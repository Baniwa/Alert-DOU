import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import type { Edition } from '../../../../domain/entities/Edition'
import { SECTION_DESCRIPTIONS } from '../../../../domain/value-objects/Section'
import { SectionBadge } from '../SectionBadge/SectionBadge'

interface Props {
  edition: Edition
}

export function EditionCard({ edition }: Props) {
  return (
    <Link
      to={`/editions/${edition.id}`}
      className="block group bg-white dark:bg-[#0F1C2E] border border-gray-200 dark:border-[#1351B4]/20 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-[#C9A84C]/60 transition-all duration-200"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <SectionBadge section={edition.section} />
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            Edição nº {edition.editionNumber}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-[#071D41] dark:text-white mb-1 leading-snug group-hover:text-[#C9A84C] transition-colors">
          {edition.title}
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
          {SECTION_DESCRIPTIONS[edition.section]}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/5 pt-3">
          <span>
            {format(edition.pubDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          <span>{edition.pageCount} páginas</span>
        </div>
      </div>

      <div className="h-0.5 w-full bg-gradient-to-r from-[#071D41] via-[#1351B4] to-[#C9A84C] opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}
