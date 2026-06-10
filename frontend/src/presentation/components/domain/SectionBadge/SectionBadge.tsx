import { Section, SECTION_LABELS } from '../../../../domain/value-objects/Section'

const SECTION_STYLES: Record<Section, string> = {
  [Section.SECTION_1]: 'bg-[#071D41] text-white',
  [Section.SECTION_2]: 'bg-[#1351B4] text-white',
  [Section.SECTION_3]: 'bg-[#168821] text-white',
  [Section.EXTRA]: 'bg-[#C9A84C] text-[#071D41]',
}

interface Props {
  section: Section
}

export function SectionBadge({ section }: Props) {
  const label = SECTION_LABELS[section].split('—')[0].trim()
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase ${SECTION_STYLES[section]}`}>
      {label}
    </span>
  )
}
