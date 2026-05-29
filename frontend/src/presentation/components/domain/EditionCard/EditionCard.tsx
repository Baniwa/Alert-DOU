import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, FileText, Scale, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Edition } from '../../../../domain/entities/Edition'
import { Section, SECTION_DESCRIPTIONS } from '../../../../domain/value-objects/Section'

const SECTION_CONFIG: Record<Section, {
  icon: React.ElementType
  label: string
  accent: string
  iconBg: string
  iconColor: string
  border: string
  glow: string
}> = {
  [Section.SECTION_1]: {
    icon: Scale,
    label: 'Seção 1',
    accent: 'bg-[#1351B4]',
    iconBg: 'bg-[#1351B4]/15',
    iconColor: 'text-[#5B9BD5]',
    border: 'hover:border-[#1351B4]/50',
    glow: 'hover:shadow-[0_4px_32px_-4px_rgba(19,81,180,0.35)]',
  },
  [Section.SECTION_2]: {
    icon: Users,
    label: 'Seção 2',
    accent: 'bg-[#C9A84C]',
    iconBg: 'bg-[#C9A84C]/15',
    iconColor: 'text-[#C9A84C]',
    border: 'hover:border-[#C9A84C]/50',
    glow: 'hover:shadow-[0_4px_32px_-4px_rgba(201,168,76,0.35)]',
  },
  [Section.SECTION_3]: {
    icon: FileText,
    label: 'Seção 3',
    accent: 'bg-[#168821]',
    iconBg: 'bg-[#168821]/15',
    iconColor: 'text-[#4CAF50]',
    border: 'hover:border-[#168821]/50',
    glow: 'hover:shadow-[0_4px_32px_-4px_rgba(22,136,33,0.35)]',
  },
  [Section.EXTRA]: {
    icon: FileText,
    label: 'Extra',
    accent: 'bg-[#C9A84C]/60',
    iconBg: 'bg-[#C9A84C]/10',
    iconColor: 'text-[#C9A84C]/70',
    border: 'hover:border-[#C9A84C]/30',
    glow: 'hover:shadow-[0_4px_32px_-4px_rgba(201,168,76,0.2)]',
  },
}

interface Props { edition: Edition }

export function EditionCard({ edition }: Props) {
  const cfg = SECTION_CONFIG[edition.section]
  const Icon = cfg.icon

  return (
    <Link
      to={`/editions/${edition.id}`}
      className={`group relative flex flex-col bg-[#0A1628] border border-white/8 rounded-xl overflow-hidden transition-all duration-250 ${cfg.border} ${cfg.glow} hover:-translate-y-0.5`}
    >
      {/* Top color bar */}
      <div className={`h-[3px] w-full ${cfg.accent}`} />

      <div className="p-5 flex flex-col flex-1 gap-4">

        {/* Icon + Section label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${cfg.iconBg} flex items-center justify-center`}>
              <Icon size={16} className={cfg.iconColor} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-300 leading-none">{cfg.label}</p>
              <p className="text-[10px] text-gray-600 mt-0.5 leading-none">Atos Normativos</p>
            </div>
          </div>
          <span className="text-[10px] text-gray-600 font-mono bg-white/4 px-2 py-1 rounded-md">
            Nº {edition.editionNumber}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[14px] font-semibold text-white leading-snug group-hover:text-[#C9A84C] transition-colors duration-200">
          {edition.title}
        </h3>

        {/* Description */}
        <p className="text-[12px] text-gray-500 leading-relaxed flex-1">
          {SECTION_DESCRIPTIONS[edition.section]}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/6">
          <div className="flex items-center gap-4 text-[11px] text-gray-600">
            <span>{format(edition.pubDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
            <span className="w-px h-3 bg-white/10" />
            <span>{edition.pageCount.toLocaleString('pt-BR')} pág.</span>
          </div>
          <ArrowRight
            size={14}
            className="text-gray-700 group-hover:text-[#C9A84C] group-hover:translate-x-0.5 transition-all duration-200"
          />
        </div>
      </div>
    </Link>
  )
}
