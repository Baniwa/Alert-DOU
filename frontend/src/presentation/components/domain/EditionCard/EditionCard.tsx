import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import type { Edition } from '../../../../domain/entities/Edition'
import { Section, SECTION_DESCRIPTIONS, SECTION_LABELS } from '../../../../domain/value-objects/Section'

const SECTION_ACCENT: Record<Section, { bar: string; glow: string; badge: string; icon: string }> = {
  [Section.SECTION_1]: {
    bar: 'bg-[#1351B4]',
    glow: 'hover:shadow-[0_0_24px_-4px_rgba(19,81,180,0.45)]',
    badge: 'bg-[#1351B4]/20 text-[#5B9BD5] border border-[#1351B4]/30',
    icon: '⚖️',
  },
  [Section.SECTION_2]: {
    bar: 'bg-[#C9A84C]',
    glow: 'hover:shadow-[0_0_24px_-4px_rgba(201,168,76,0.4)]',
    badge: 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30',
    icon: '👤',
  },
  [Section.SECTION_3]: {
    bar: 'bg-[#168821]',
    glow: 'hover:shadow-[0_0_24px_-4px_rgba(22,136,33,0.4)]',
    badge: 'bg-[#168821]/15 text-[#4CAF50] border border-[#168821]/30',
    icon: '📄',
  },
  [Section.EXTRA]: {
    bar: 'bg-[#C9A84C]',
    glow: 'hover:shadow-[0_0_24px_-4px_rgba(201,168,76,0.3)]',
    badge: 'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20',
    icon: '📢',
  },
}

interface Props {
  edition: Edition
}

export function EditionCard({ edition }: Props) {
  const accent = SECTION_ACCENT[edition.section]
  const label = SECTION_LABELS[edition.section].split('—')[0].trim()
  const description = SECTION_DESCRIPTIONS[edition.section]

  return (
    <Link
      to={`/editions/${edition.id}`}
      className={`group relative flex flex-col bg-[#0A1628] border border-white/8 rounded-xl overflow-hidden transition-all duration-300 ${accent.glow} hover:border-white/20 hover:-translate-y-0.5`}
    >
      {/* Top accent bar */}
      <div className={`h-0.5 w-full ${accent.bar}`} />

      <div className="flex flex-col flex-1 p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${accent.badge}`}>
            <span>{accent.icon}</span>
            {label}
          </span>
          <span className="text-[11px] text-gray-600 font-mono">
            Nº {edition.editionNumber}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-white leading-snug mb-2 group-hover:text-[#C9A84C] transition-colors duration-200">
          {edition.title}
        </h3>

        {/* Description */}
        <p className="text-[12px] text-gray-500 leading-relaxed flex-1 mb-5">
          {description}
        </p>

        {/* Footer */}
        <div className="flex items-end justify-between pt-3 border-t border-white/6">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Publicado em</p>
            <p className="text-[13px] font-semibold text-gray-300">
              {format(edition.pubDate, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Páginas</p>
            <p className="text-[13px] font-semibold text-gray-300">
              {edition.pageCount.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom arrow indicator */}
      <div className="px-5 pb-4 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[11px] text-[#C9A84C] font-semibold">Ver detalhes</span>
        <span className="text-[#C9A84C] text-sm">→</span>
      </div>
    </Link>
  )
}
