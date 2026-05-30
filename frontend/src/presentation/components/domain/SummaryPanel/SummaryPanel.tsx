import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AISummary } from '../../../../domain/entities/AISummary'
import { ApiError } from '../../../../infrastructure/api/client'

interface Props {
  editionId: number
  summary: AISummary | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  onGenerate: () => void
}

export function SummaryPanel({ summary, isLoading, isError, error, onGenerate }: Props) {
  const apiError = error instanceof ApiError ? error : null

  if (isLoading) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#1351B4] animate-pulse" />
          <span className="text-sm font-bold text-[#1351B4] uppercase tracking-wider">
            Analisando edição...
          </span>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-3 bg-gray-200 rounded animate-pulse ${i === 4 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
        <p className="mt-5 text-xs text-gray-500 font-medium">
          Baixando PDF e gerando resumo com inteligência artificial — pode levar até 90 segundos.
        </p>
      </div>
    )
  }

  if (isError) {
    const is503 = apiError?.status === 503
    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50 shadow-sm">
        <h3 className="text-sm font-bold text-red-700 mb-2">
          {is503 ? 'Chave de API não configurada' : 'Erro ao gerar resumo'}
        </h3>
        <p className="text-xs font-medium text-red-600 mb-4">
          {is503
            ? 'Adicione GEMINI_API_KEY ao arquivo .env e reinicie a API.'
            : (apiError?.message ?? 'Erro desconhecido. Tente novamente.')}
        </p>
        {!is503 && (
          <button
            onClick={onGenerate}
            className="text-xs px-3 py-1.5 font-bold bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <p className="text-[14px] font-medium text-gray-600 mb-5">
          Resumo Inteligente ainda não gerado para esta edição.
        </p>
        <button
          onClick={onGenerate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1351B4] hover:bg-[#0c326f] text-white text-sm font-bold rounded-lg transition-all shadow-sm"
        >
          Gerar Resumo com IA
        </button>
      </div>
    )
  }

  return (
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-extrabold text-[#1351B4] uppercase tracking-wider">
          Resumo Executivo — IA
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{summary.model}</span>
          <span className="text-[11px] font-medium text-gray-500">
            {summary.pagesRead} págs. · {format(summary.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
      <div className="p-8">
        <div className="prose max-w-none prose-headings:text-[#1351B4] prose-headings:font-extrabold prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3 prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 prose-li:text-gray-700 prose-li:mb-2 prose-strong:text-gray-900 prose-hr:border-gray-200 prose-hr:my-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {summary.summary}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
