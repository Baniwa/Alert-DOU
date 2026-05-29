import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchEditionById } from '../../../infrastructure/api/editions.api'
import { editionKeys } from '../../../application/query-keys/editions.keys'
import { useEditionSummary } from '../../../application/hooks/useEditionSummary'
import { SECTION_LABELS } from '../../../domain/value-objects/Section'
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
      <div className="max-w-3xl space-y-4 animate-pulse">
        <div className="h-4 w-24 bg-white/5 rounded" />
        <div className="h-40 bg-[#0A1628] rounded-xl border border-white/5" />
      </div>
    )
  }

  if (isError || !edition) {
    return (
      <div className="max-w-3xl text-center py-16">
        <p className="text-gray-500 mb-4">Edição não encontrada.</p>
        <Link to="/" className="text-xs text-[#C9A84C] hover:opacity-80">← Voltar</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">

      {/* Back */}
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-[#C9A84C] transition-colors mb-6"
      >
        <ArrowLeft size={13} />
        Voltar para edições
      </Link>

      {/* Edition card */}
      <div className="bg-[#0A1628] border border-white/8 rounded-xl overflow-hidden mb-6">
        <div className="p-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1351B4]/15 flex items-center justify-center">
                <FileText size={18} className="text-[#5B9BD5]" />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">
                  {SECTION_LABELS[edition.section]}
                </p>
                <h2 className="text-lg font-bold text-white leading-tight">{edition.title}</h2>
              </div>
            </div>
            <span className="text-[11px] text-gray-600 font-mono bg-white/4 px-2 py-1 rounded-md whitespace-nowrap">
              Nº {edition.editionNumber}
            </span>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/6">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Publicação</p>
              <p className="text-[13px] font-semibold text-gray-200">
                {format(edition.pubDate, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Páginas</p>
              <p className="text-[13px] font-semibold text-gray-200">
                {edition.pageCount.toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Edição</p>
              <p className="text-[13px] font-semibold text-gray-200">Nº {edition.editionNumber}</p>
            </div>
          </div>
        </div>

        {/* PDF button */}
        <div className="px-6 pb-5">
          <a
            href={edition.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-medium px-4 py-2.5 bg-[#071D41] border border-[#C9A84C]/30 text-white rounded-lg hover:border-[#C9A84C]/70 hover:bg-[#0D2847] transition-all"
          >
            <ExternalLink size={13} />
            Abrir PDF Oficial
          </a>
        </div>
      </div>

      {/* AI Summary */}
      <div>
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest mb-3">
          Resumo Executivo com IA
        </p>
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
