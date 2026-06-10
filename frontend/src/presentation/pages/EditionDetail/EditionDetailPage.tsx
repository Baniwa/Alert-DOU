import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchEditionById } from '../../../infrastructure/api/editions.api'
import { editionKeys } from '../../../application/query-keys/editions.keys'
import { useEditionSummary } from '../../../application/hooks/useEditionSummary'
import { SECTION_LABELS } from '../../../domain/value-objects/Section'
import { SummaryPanel } from '../../components/domain/SummaryPanel/SummaryPanel'

export function EditionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-40 bg-white rounded-xl border border-gray-200 shadow-sm" />
      </div>
    )
  }

  if (isError || !edition) {
    return (
      <div className="max-w-3xl text-center py-16">
        <p className="text-gray-500 mb-4">Edição não encontrada.</p>
        <Link to="/" className="text-[13px] font-semibold text-[#1351B4] hover:underline">← Voltar</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Back — goes to previous page so date state is preserved */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1351B4] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Voltar para edições
      </button>

      <div className="flex flex-col gap-8 items-stretch">
        {/* Top: Info */}
        <div className="w-full flex flex-col gap-6">
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1351B4]/10 flex items-center justify-center">
                    <FileText size={18} className="text-[#1351B4]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">
                      {SECTION_LABELS[edition.section]}
                    </p>
                    <h2 className="text-lg font-extrabold text-gray-900 leading-tight">{edition.title}</h2>
                  </div>
                </div>
                <span className="text-[11px] text-gray-700 font-mono bg-gray-100 border border-gray-200 px-2 py-1 rounded-md whitespace-nowrap">
                  Nº {edition.editionNumber}
                </span>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-3 gap-4 pt-5 border-t border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Publicação</p>
                  <p className="text-[13px] font-semibold text-gray-800">
                    {format(edition.pubDate, "dd 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Páginas</p>
                  <p className="text-[13px] font-semibold text-gray-800">
                    {edition.pageCount.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Edição</p>
                  <p className="text-[13px] font-semibold text-gray-800">Nº {edition.editionNumber}</p>
                </div>
              </div>
            </div>

            {/* PDF button */}
            <div className="px-6 pb-6">
              <a
                href={edition.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full justify-center inline-flex items-center gap-2 text-[13px] font-bold px-4 py-3 bg-white border-2 border-[#1351B4] text-[#1351B4] rounded-lg hover:bg-gray-50 transition-all shadow-sm"
              >
                <ExternalLink size={14} />
                Abrir PDF Oficial
              </a>
            </div>
          </div>
        </div>

        {/* Bottom: IA Summary */}
        <div className="w-full flex flex-col gap-3">
          <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-widest pl-1">
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
    </div>
  )
}
