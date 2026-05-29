import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchEditionById } from '../../../infrastructure/api/editions.api'
import { editionKeys } from '../../../application/query-keys/editions.keys'
import { useEditionSummary } from '../../../application/hooks/useEditionSummary'
import { SECTION_LABELS } from '../../../domain/value-objects/Section'
import { SectionBadge } from '../../components/domain/SectionBadge/SectionBadge'
import { SummaryPanel } from '../../components/domain/SummaryPanel/SummaryPanel'

export function EditionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const editionId = Number(id)
  const [summaryEnabled, setSummaryEnabled] = useState(false)

  const { data: edition, isLoading, isError } = useQuery({
    queryKey: editionKeys.detail(editionId),
    queryFn: () => fetchEditionById(editionId),
    enabled: !isNaN(editionId),
  })

  const summaryQuery = useEditionSummary(editionId, summaryEnabled)

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-[#0F1C2E] rounded" />
        <div className="h-32 bg-gray-100 dark:bg-[#0F1C2E] rounded-lg" />
      </div>
    )
  }

  if (isError || !edition) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 mb-4">Edição não encontrada.</p>
        <Link to="/" className="text-xs text-[#1351B4] hover:text-[#C9A84C]">← Voltar</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Link to="/" className="text-xs text-[#1351B4] dark:text-[#C9A84C] hover:opacity-80 mb-6 block">
        ← Voltar para edições
      </Link>

      {/* Edition header */}
      <div className="border border-gray-200 dark:border-white/10 rounded-lg p-6 mb-6 bg-white dark:bg-[#0F1C2E]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <SectionBadge section={edition.section} />
          <span className="text-xs text-gray-400">Edição nº {edition.editionNumber}</span>
        </div>

        <h2 className="text-xl font-bold text-[#071D41] dark:text-white mb-1">{edition.title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {SECTION_LABELS[edition.section]}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 dark:border-white/5 pt-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Data de Publicação</p>
            <p className="font-semibold text-[#071D41] dark:text-white">
              {format(edition.pubDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Páginas</p>
            <p className="font-semibold text-[#071D41] dark:text-white">{edition.pageCount}</p>
          </div>
        </div>

        <a
          href={edition.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm px-4 py-2 bg-[#071D41] text-white rounded-lg hover:bg-[#0D2847] border border-[#C9A84C]/30 hover:border-[#C9A84C] transition-all"
        >
          Abrir PDF Oficial ↗
        </a>
      </div>

      {/* AI Summary */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-[#071D41] dark:text-white uppercase tracking-wider mb-3">
          Resumo Executivo
        </h3>
        <SummaryPanel
          editionId={editionId}
          summary={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
          error={summaryQuery.error}
          onGenerate={() => setSummaryEnabled(true)}
        />
      </div>
    </div>
  )
}
