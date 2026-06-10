import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, FileText, Plus, Radar, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { AISummary } from '../../../domain/entities/AISummary'
import { apiClient } from '../../../infrastructure/api/client'
import { toAISummary } from '../../../infrastructure/mappers/summary.mapper'
import type { AISummaryDTO } from '../../../infrastructure/api/dto/AISummaryDTO'

const STORAGE_KEY = 'alert-dou:tracked-concursos'

function loadConcursos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveConcursos(list: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

const fetchSummaries = async (): Promise<AISummary[]> => {
  const { data } = await apiClient.get<AISummaryDTO[]>('/summaries')
  return data.map(toAISummary)
}

function matchedKeywords(summary: AISummary, keywords: string[]): string[] {
  const text = `${summary.editionTitle ?? ''} ${summary.summary}`.toLowerCase()
  return keywords.filter((kw) => text.includes(kw.toLowerCase()))
}

export function HomePage() {
  const [concursos, setConcursos] = useState<string[]>(loadConcursos)
  const [input, setInput] = useState('')

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['summaries'],
    queryFn: fetchSummaries,
    enabled: concursos.length > 0,
  })

  function add() {
    const kw = input.trim()
    if (!kw || concursos.includes(kw)) return
    const updated = [...concursos, kw]
    setConcursos(updated)
    saveConcursos(updated)
    setInput('')
  }

  function remove(kw: string) {
    const updated = concursos.filter((c) => c !== kw)
    setConcursos(updated)
    saveConcursos(updated)
  }

  const matches = useMemo(() => {
    if (!summaries || concursos.length === 0) return []
    return summaries
      .map((s) => ({ summary: s, matched: matchedKeywords(s, concursos) }))
      .filter(({ matched }) => matched.length > 0)
      .sort((a, b) => b.summary.createdAt.getTime() - a.summary.createdAt.getTime())
  }, [summaries, concursos])

  return (
    <div className="max-w-4xl w-full mx-auto">

      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
          <Radar size={12} />
          Monitoramento Inteligente
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
          Radar de Concursos Públicos
        </h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
          Cadastre os concursos que você acompanha. O sistema identifica automaticamente publicações relevantes nos resumos do DOU e traz os resultados aqui.
        </p>
      </div>

      {/* Input */}
      <div className="mb-6">
        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
          Monitorar concurso
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder='Ex: "INSS", "Receita Federal", "TRF", "Polícia Federal"'
            className="flex-1 h-10 px-4 text-[13px] bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#1351B4] focus:ring-1 focus:ring-[#1351B4] transition-colors"
          />
          <button
            onClick={add}
            disabled={!input.trim()}
            className="h-10 px-4 flex items-center gap-2 text-[12px] font-bold bg-[#1351B4] hover:bg-[#0c326f] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Plus size={14} />
            Monitorar
          </button>
        </div>
      </div>

      {/* Tracked keywords */}
      {concursos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {concursos.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1351B4]/10 text-[#1351B4] text-[12px] font-bold rounded-lg border border-[#1351B4]/20"
            >
              <Search size={11} />
              {kw}
              <button
                onClick={() => remove(kw)}
                className="ml-1 hover:text-red-500 transition-colors"
                title={`Remover ${kw}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Empty state — no concursos registered */}
      {concursos.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-16 text-center">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-[15px] font-bold text-gray-700 mb-2">Nenhum concurso monitorado</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Adicione palavras-chave acima para que o sistema busque publicações relevantes nos resumos gerados pelo DOU.
          </p>
        </div>
      )}

      {/* Results section */}
      {concursos.length > 0 && (
        <>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
              {isLoading
                ? 'Buscando publicações...'
                : matches.length > 0
                ? `${matches.length} publicaç${matches.length > 1 ? 'ões' : 'ão'} encontrada${matches.length > 1 ? 's' : ''}`
                : 'Sem publicações encontradas'}
            </h2>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && matches.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-gray-500 text-sm mb-1">
                Nenhum resumo disponível menciona os concursos monitorados.
              </p>
              <p className="text-gray-400 text-xs mb-4">
                Os resumos são gerados a partir das edições do DOU. Acesse uma edição e clique em "Gerar Resumo com IA".
              </p>
              <Link
                to="/editions"
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1351B4] hover:text-[#168821] transition-colors"
              >
                Ver edições do DOU
                <ArrowRight size={13} />
              </Link>
            </div>
          )}

          {!isLoading && matches.length > 0 && (
            <div className="space-y-4">
              {matches.map(({ summary, matched }) => (
                <div
                  key={summary.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 hover:border-gray-300"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#1351B4]/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={15} className="text-[#1351B4]" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-gray-800 uppercase tracking-wider leading-none">
                          {summary.editionTitle ?? 'DOU'}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {format(summary.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
                      {matched.map((kw) => (
                        <span
                          key={kw}
                          className="text-[10px] font-bold px-2 py-0.5 bg-[#168821]/10 text-[#168821] rounded-full border border-[#168821]/20"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[13px] text-gray-600 leading-relaxed line-clamp-3 mb-4">
                    {summary.summary.replace(/[*#]/g, '')}
                  </p>

                  <Link
                    to={`/editions/${summary.editionId}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1351B4] hover:text-[#168821] transition-colors"
                  >
                    Ler resumo completo
                    <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
