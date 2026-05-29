import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
      <div className="border border-[#C9A84C]/30 rounded-lg p-6 bg-[#071D41]/5 dark:bg-[#0A1628]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider">
            Analisando edição...
          </span>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-3 bg-gray-200 dark:bg-[#1351B4]/20 rounded animate-pulse ${i === 4 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Baixando PDF e gerando resumo com {'{'}modelo de IA{'}'} — pode levar até 30 segundos.
        </p>
      </div>
    )
  }

  if (isError) {
    const is503 = apiError?.status === 503
    return (
      <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-6 bg-red-50 dark:bg-red-950/20">
        <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">
          {is503 ? 'Chave de API não configurada' : 'Erro ao gerar resumo'}
        </h3>
        <p className="text-xs text-red-600 dark:text-red-500 mb-4">
          {is503
            ? 'Adicione GEMINI_API_KEY ao arquivo .env e reinicie a API.'
            : (apiError?.message ?? 'Erro desconhecido. Tente novamente.')}
        </p>
        {!is503 && (
          <button
            onClick={onGenerate}
            className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="border border-dashed border-[#C9A84C]/40 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Resumo IA ainda não gerado para esta edição.
        </p>
        <button
          onClick={onGenerate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#071D41] hover:bg-[#0D2847] text-white text-sm font-semibold rounded-lg border border-[#C9A84C]/40 hover:border-[#C9A84C] transition-all"
        >
          Gerar Resumo com IA
        </button>
      </div>
    )
  }

  return (
    <div className="border border-[#C9A84C]/30 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#071D41] border-b border-[#C9A84C]/20">
        <span className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider">
          Resumo Executivo — IA
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400">{summary.model}</span>
          <span className="text-[10px] text-gray-500">
            {summary.pagesRead} págs. · {format(summary.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
      <div className="p-5 bg-white dark:bg-[#0A1628]">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {summary.summary.split('\n').map((line, i) => {
            if (!line.trim()) return <br key={i} />
            if (line.startsWith('**') && line.endsWith('**')) {
              return <p key={i} className="font-bold text-[#071D41] dark:text-white mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
            }
            if (line.startsWith('- ') || line.startsWith('• ')) {
              return <p key={i} className="pl-4 text-gray-700 dark:text-gray-300 before:content-['•'] before:mr-2 before:text-[#C9A84C]">{line.slice(2)}</p>
            }
            return <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed">{line}</p>
          })}
        </div>
      </div>
    </div>
  )
}
