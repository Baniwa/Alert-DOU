import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, Download, Share2, Highlighter, Trash2, Languages, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { useQuery } from '@tanstack/react-query'
import type { AISummary } from '../../../../domain/entities/AISummary'
import { ApiError } from '../../../../infrastructure/api/client'
import { fetchEditionSummaryEn } from '../../../../infrastructure/api/editions.api'
import { useHighlights, applyHighlightsToMarkdown } from '../../../../application/hooks/useHighlights'

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    mark: ['className', 'dataphrase'],
  },
}

interface Props {
  editionId: number
  summary: AISummary | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  retryCount?: number
  onGenerate: () => void
}

interface SelectionToolbar {
  x: number
  y: number
  phrase: string
  occurrenceIndex: number
}

export function SummaryPanel({ editionId, summary, isLoading, isError, error, retryCount = 0, onGenerate }: Props) {
  const apiError = error instanceof ApiError ? error : null
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState<'pt' | 'en'>('pt')
  const [requestTranslation, setRequestTranslation] = useState(false)
  const [toolbar, setToolbar] = useState<SelectionToolbar | null>(null)

  const {
    data: translatedSummary,
    isLoading: isTranslating,
    isError: isTranslationError,
    error: translationError,
    refetch: retryTranslation,
  } = useQuery({
    queryKey: ['summary-en', editionId],
    queryFn: () => fetchEditionSummaryEn(editionId),
    enabled: requestTranslation && !!summary,
    staleTime: Infinity,
    gcTime: 0,      // never persist error state across component unmounts
    retry: false,
  })

  const translationApiError = translationError instanceof ApiError ? translationError : null

  const initialEn = summary?.summaryEn ?? null

  const activeSummaryText = lang === 'en'
    ? (translatedSummary?.summaryEn ?? initialEn ?? summary?.summary ?? '')
    : (summary?.summary ?? '')

  function handleToggleLang() {
    if (lang === 'pt') {
      setLang('en')
      if (!initialEn) {
        if (isTranslationError) {
          retryTranslation()
        } else {
          setRequestTranslation(true)
        }
      }
    } else {
      setLang('pt')
    }
  }

  const proseRef = useRef<HTMLDivElement>(null)
  const { highlights, add, remove, clear } = useHighlights(editionId)

  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection()
      const phrase = selection?.toString().trim() ?? ''

      if (!phrase || phrase.length < 3 || phrase.length > 300) {
        setToolbar(null)
        return
      }

      if (!proseRef.current) return
      const range = selection!.getRangeAt(0)
      if (!proseRef.current.contains(range.commonAncestorContainer)) {
        setToolbar(null)
        return
      }

      // Calculate which occurrence was selected by counting how many times
      // the phrase appears in the text before the selection start.
      const preRange = document.createRange()
      preRange.setStart(proseRef.current, 0)
      preRange.setEnd(range.startContainer, range.startOffset)
      const preText = preRange.toString()
      const lowerPhrase = phrase.toLowerCase()
      const lowerPre = preText.toLowerCase()
      let occurrenceIndex = 0
      let pos = lowerPre.indexOf(lowerPhrase)
      while (pos !== -1) {
        occurrenceIndex++
        pos = lowerPre.indexOf(lowerPhrase, pos + 1)
      }

      const rect = range.getBoundingClientRect()
      const containerRect = proseRef.current.getBoundingClientRect()
      setToolbar({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
        phrase,
        occurrenceIndex,
      })
    }

    function handleMouseDown(e: MouseEvent) {
      if (proseRef.current && !proseRef.current.contains(e.target as Node)) {
        setToolbar(null)
      }
    }

    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  function handleProseClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'MARK') {
      const phrase = target.dataset.phrase
      if (phrase) remove(phrase)
    }
  }

  function handleHighlight() {
    if (!toolbar) return
    add(toolbar.phrase, toolbar.occurrenceIndex)
    window.getSelection()?.removeAllRanges()
    setToolbar(null)
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!summary) return
    const blob = new Blob([summary.summary], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resumo-dou-edicao-${summary.editionId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    const isRetrying = retryCount > 0
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#1351B4] animate-pulse" />
          <span className="text-sm font-bold text-[#1351B4] uppercase tracking-wider">
            {isRetrying ? `Tentando novamente... (${retryCount}/5)` : 'Analisando edição...'}
          </span>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-3 bg-gray-200 rounded animate-pulse ${i === 4 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
        <p className="mt-5 text-xs text-gray-500 font-medium">
          {isRetrying
            ? 'Falha na última tentativa — reconectando automaticamente com a API.'
            : 'Baixando PDF e gerando resumo com inteligência artificial — pode levar até 3 minutos para edições grandes.'}
        </p>
      </div>
    )
  }

  if (isError) {
    const is503 = apiError?.status === 503
    const is502 = apiError?.status === 502

    const title = is503
      ? 'Chave de API não configurada'
      : is502
      ? 'Link do PDF expirou'
      : 'Erro ao gerar resumo'

    const description = is503
      ? 'Adicione GEMINI_API_KEY ao arquivo .env e reinicie a API.'
      : is502
      ? 'A edição foi identificada no DOU, mas o link temporário do PDF da Imprensa Nacional expirou antes do download. O sistema tentou obter um novo link automaticamente e também falhou. Tente novamente em alguns minutos.'
      : (apiError?.message ?? 'Erro desconhecido.')

    return (
      <div className="border border-red-200 rounded-lg p-6 bg-red-50 shadow-sm">
        <h3 className="text-sm font-bold text-red-700 mb-2">{title}</h3>
        <p className="text-xs font-medium text-red-600 mb-4 leading-relaxed">{description}</p>
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

  const processedMarkdown = applyHighlightsToMarkdown(activeSummaryText, highlights)
  const alreadyHighlighted = toolbar ? highlights.some((h) => h.phrase === toolbar.phrase) : false

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">

      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-[#1351B4] uppercase tracking-wider">
            Resumo Executivo — IA
          </span>

          <button
            onClick={handleToggleLang}
            disabled={isTranslating}
            title={lang === 'pt' ? 'Traduzir para inglês' : 'Voltar para português'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
              lang === 'en'
                ? 'bg-[#1351B4] text-white border-[#1351B4]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[#1351B4] hover:text-[#1351B4]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isTranslating ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />}
            {lang === 'en' ? 'EN' : 'PT'}
          </button>

          {isTranslationError && lang === 'en' && (
            <span className="inline-flex items-center gap-1 text-[10px] text-red-500 font-medium">
              {translationApiError?.status === 503
                ? (translationApiError.message?.includes('temporarily')
                    ? 'Gemini indisponível — tente novamente'
                    : 'Configure GEMINI_API_KEY')
                : translationApiError?.status === 429
                ? 'Limite atingido'
                : `Falha (${translationApiError?.status ?? '?'})`}
              {translationApiError?.status !== 503 && (
                <button
                  onClick={() => retryTranslation()}
                  className="underline hover:no-underline"
                >
                  · tentar novamente
                </button>
              )}
            </span>
          )}

          <button onClick={handleShare} title="Copiar link"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-[#1351B4] hover:bg-gray-100 transition-colors">
            {copied ? <Check size={14} /> : <Share2 size={14} />}
          </button>
          <button onClick={handleDownload} title="Baixar resumo"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-[#1351B4] hover:bg-gray-100 transition-colors">
            <Download size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded">{summary.model}</span>
          <span className="text-[11px] font-medium text-gray-500">
            {summary.pagesRead} págs. · {format(summary.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Highlights manager */}
      {highlights.length > 0 ? (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100 flex-wrap">
          <Highlighter size={12} className="text-amber-500 flex-shrink-0" />
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mr-1">Destaques:</span>
          {highlights.map((h) => (
            <span
              key={h.phrase}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-200 text-gray-800 text-[11px] font-medium rounded-full"
            >
              {h.phrase.length > 30 ? `${h.phrase.slice(0, 30)}…` : h.phrase}
              <button
                onClick={() => remove(h.phrase)}
                className="hover:text-red-600 transition-colors ml-0.5"
                title="Remover destaque"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={clear}
            className="ml-auto text-[10px] font-bold text-amber-700 hover:text-red-600 transition-colors flex items-center gap-1"
            title="Limpar todos"
          >
            <Trash2 size={10} />
            Limpar tudo
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-100">
          <Highlighter size={12} className="text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-700">
            Selecione um trecho para destacá-lo. Clique no destaque para removê-lo.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="p-8 relative">
        <div
          ref={proseRef}
          onClick={handleProseClick}
          className="prose max-w-none prose-headings:text-[#1351B4] prose-headings:font-extrabold prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-3 prose-h2:text-lg prose-h3:text-base prose-p:text-gray-700 prose-li:text-gray-700 prose-li:mb-2 prose-strong:text-gray-900 prose-hr:border-gray-200 prose-hr:my-6 prose-em:text-gray-500 prose-em:text-[13px] [&_mark.highlight-mark]:bg-yellow-200 [&_mark.highlight-mark]:rounded [&_mark.highlight-mark]:px-0.5 [&_mark.highlight-mark]:cursor-pointer [&_mark.highlight-mark]:hover:bg-red-100 [&_mark.highlight-mark]:transition-colors"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}>
            {processedMarkdown}
          </ReactMarkdown>
        </div>

        {toolbar && (
          <div
            className="absolute z-20 flex items-center gap-1.5 bg-gray-900 text-white rounded-lg shadow-xl px-2.5 py-1.5 text-[11px] font-bold -translate-x-1/2 -translate-y-full pointer-events-auto"
            style={{ left: toolbar.x, top: toolbar.y }}
          >
            <Highlighter size={12} className="text-yellow-300 flex-shrink-0" />
            {alreadyHighlighted ? (
              <span className="text-gray-400">Já destacado</span>
            ) : (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleHighlight() }}
                className="hover:text-yellow-300 transition-colors whitespace-nowrap"
              >
                Destacar trecho
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
