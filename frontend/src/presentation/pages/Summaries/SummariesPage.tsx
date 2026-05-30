import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Sparkles, FileText, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { AISummary } from '../../../domain/entities/AISummary'
import { apiClient } from '../../../infrastructure/api/client'
import { toAISummary } from '../../../infrastructure/mappers/summary.mapper'
import type { AISummaryDTO } from '../../../infrastructure/api/dto/AISummaryDTO'

// Use fetcher for the new endpoint
const fetchSummaries = async (): Promise<AISummary[]> => {
  const { data } = await apiClient.get<AISummaryDTO[]>('/summaries')
  return data.map(toAISummary)
}

export function SummariesPage() {
  const { data: summaries, isLoading, isError } = useQuery({
    queryKey: ['summaries'],
    queryFn: fetchSummaries,
  })

  const groupedSummaries = useMemo(() => {
    if (!summaries) return {}
    const groups: Record<string, AISummary[]> = {}
    for (const summary of summaries) {
      const key = summary.editionNumber ?? 'Sem Número'
      if (!groups[key]) groups[key] = []
      groups[key].push(summary)
    }
    return groups
  }, [summaries])

  return (
    <div className="max-w-6xl w-full mx-auto">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
          <Sparkles size={12} />
          Central de Inteligência
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
          Histórico de Resumos IA
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
          Consulte todos os resumos executivos gerados anteriormente.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center shadow-sm">
          <p className="text-3xl mb-4 text-red-500">⚠️</p>
          <p className="text-[15px] font-bold text-red-800">Não foi possível carregar o histórico de resumos.</p>
        </div>
      )}

      {!isLoading && !isError && summaries?.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-16 text-center">
          <p className="text-4xl mb-4">🤖</p>
          <p className="text-[15px] font-bold text-gray-700 mb-2">Nenhum resumo gerado ainda.</p>
          <p className="text-sm text-gray-500">
            Acesse uma edição do Diário Oficial e clique em "Gerar Resumo com IA".
          </p>
        </div>
      )}

      {!isLoading && summaries && summaries.length > 0 && (
        <div className="space-y-10">
          {Object.entries(groupedSummaries)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([editionNumber, editionSummaries]) => (
            <div key={editionNumber} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                EDIÇÃO Nº {editionNumber}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {editionSummaries.map((summary) => (
                  <div key={summary.id} className="bg-gray-50 border border-gray-200 shadow-sm rounded-xl p-6 hover:shadow-md transition-all group flex flex-col h-full hover:-translate-y-0.5 hover:border-gray-300">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-[#1351B4]/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-[#1351B4]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wider mb-0.5">
                          {summary.editionTitle ?? 'Resumo Extraído'}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {format(summary.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex-1 mb-6">
                      <p className="text-[13px] text-gray-600 line-clamp-3 leading-relaxed">
                        {summary.summary.replace(/[*#]/g, '')}
                      </p>
                    </div>

                    <Link
                      to={`/editions/${summary.editionId}`}
                      className="w-full inline-flex items-center justify-center gap-2 text-[12px] font-bold px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-[#1351B4] rounded-lg transition-colors mt-auto shadow-sm"
                    >
                      Ler resumo completo
                      <ArrowRight size={14} className="text-[#1351B4] group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
