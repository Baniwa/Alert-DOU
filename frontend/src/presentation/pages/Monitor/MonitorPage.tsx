import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Plus, X, ArrowRight, AlertCircle, FileText, CheckCircle, Loader2, RefreshCw, Ban, Database } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useMonitorMatches, useSearchCoverage } from '../../../application/hooks/useMonitorMatches'
import {
  KIND_LABELS,
  MAX_TRACKED,
  addItem,
  displayValue,
  loadItems,
  markVisit,
  readLastVisit,
  saveItems,
  type WatchItem,
  type WatchKind,
} from './monitor.helpers'

const KIND_OPTIONS: { kind: WatchKind; hint: string }[] = [
  { kind: 'pessoa', hint: 'Nome completo, como sai no DOU' },
  { kind: 'empresa', hint: 'CNPJ ou razão social' },
  { kind: 'termo', hint: 'Órgão, cargo, número de edital…' },
]

const KIND_BADGE: Record<WatchKind, string> = {
  pessoa: 'bg-[#1351B4]/10 text-[#1351B4] border-[#1351B4]/20',
  cpf: 'bg-[#1351B4]/10 text-[#1351B4] border-[#1351B4]/20',
  empresa: 'bg-[#168821]/10 text-[#168821] border-[#168821]/20',
  termo: 'bg-gray-100 text-gray-600 border-gray-200',
}

function formatDay(iso: string) {
  return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR })
}

function CoverageNote() {
  const { data } = useSearchCoverage()
  if (!data) return null
  return (
    <div className="flex items-start gap-3 p-4 mb-6 bg-white border border-gray-200 rounded-xl text-[12px] text-gray-600">
      <Database size={14} className="mt-0.5 flex-shrink-0 text-[#1351B4]" />
      <p>
        {data.indexed_editions > 0 && data.first_date && data.last_date ? (
          <>
            A busca percorre o texto integral de <strong>{data.indexed_editions} edições</strong>, de{' '}
            {formatDay(data.first_date)} a {formatDay(data.last_date)}
            {data.indexed_editions < data.total_editions && ` (${data.total_editions - data.indexed_editions} ainda na fila de indexação)`}.
            Fora desse período, nenhuma menção aparece aqui.
          </>
        ) : (
          'Nenhuma edição indexada ainda. A indexação roda todo dia após a publicação do DOU.'
        )}
      </p>
    </div>
  )
}

export function MonitorPage() {
  const [items, setItems] = useState<WatchItem[]>(loadItems)
  const [lastVisit] = useState<string | null>(readLastVisit)
  const [input, setInput] = useState('')
  const [kind, setKind] = useState<WatchKind>('pessoa')
  const [inputError, setInputError] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => { markVisit() }, [])

  const { matches, isLoading, withResults } = useMonitorMatches(items.map((i) => i.value), lastVisit)
  const byValue = new Map(items.map((i) => [i.value, i]))

  const ordered = [...matches].sort((a, b) => {
    if (a.isLoading || b.isLoading) return 0
    return b.newResults - a.newResults || b.results.length - a.results.length
  })

  function add() {
    const result = addItem(input, kind)
    if (!result.ok) { setInputError(result.error); return }
    setItems(result.items)
    setInput('')
    setInputError('')
  }

  function update(next: WatchItem[]) {
    setItems(next)
    saveItems(next)
  }

  function remove(value: string) {
    update(items.filter((i) => i.value !== value))
  }

  function toggleAvoid(value: string) {
    update(items.map((i) => (i.value === value ? { ...i, avoid: !i.avoid } : i)))
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['monitor-match'] })
    queryClient.invalidateQueries({ queryKey: ['search-coverage'] })
  }

  const hint = KIND_OPTIONS.find((o) => o.kind === kind)?.hint

  return (
    <div className="max-w-3xl w-full mx-auto">

      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
          <Eye size={12} />
          Monitoramento pessoal
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Monitor do DOU</h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
              Acompanhe pessoas, empresas e termos no texto integral do Diário Oficial. As menções são
              verificadas quando você abre esta página; publicações desde a sua última visita aparecem como novas.
            </p>
          </div>
          {items.length > 0 && (
            <button
              onClick={refresh}
              title="Verificar novamente"
              className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-[#1351B4] transition-colors mt-1"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          )}
        </div>
      </div>

      <CoverageNote />

      <div className="mb-8">
        <div className="flex flex-wrap gap-1.5 mb-3" role="radiogroup" aria-label="Tipo">
          {KIND_OPTIONS.map((option) => (
            <button
              key={option.kind}
              role="radio"
              aria-checked={kind === option.kind}
              onClick={() => setKind(option.kind)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                kind === option.kind
                  ? 'bg-[#1351B4] text-white border-[#1351B4]'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-[#1351B4] hover:text-[#1351B4]'
              }`}
            >
              {KIND_LABELS[option.kind]}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setInputError('') }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder={kind === 'pessoa' ? 'Ex.: Maria da Silva, ou um CPF' : kind === 'empresa' ? 'Ex.: 12.345.678/0001-90' : 'Ex.: Ibama'}
              maxLength={110}
              aria-label="Valor a monitorar"
              className={`w-full h-10 px-4 text-[13px] bg-white border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                inputError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                  : 'border-gray-300 focus:border-[#1351B4] focus:ring-[#1351B4]'
              }`}
            />
            <p className={`text-[11px] mt-1 font-medium ${inputError ? 'text-red-500' : 'text-gray-400'}`}>
              {inputError || hint}
            </p>
          </div>
          <button
            onClick={add}
            disabled={!input.trim()}
            className="h-10 px-4 flex items-center justify-center gap-2 text-[12px] font-bold bg-[#1351B4] hover:bg-[#0c326f] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Plus size={14} />
            Monitorar
          </button>
        </div>
      </div>

      {items.some((i) => i.kind === 'cpf') && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
          <p>
            O DOU publica o CPF mascarado (***.456.789-**). A busca usa só os seis dígitos do meio, então pode
            trazer outra pessoa: confira o nome no trecho.
          </p>
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-[15px] font-bold text-gray-700 mb-2">Nada monitorado ainda</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Adicione seu nome para acompanhar uma nomeação, ou o CNPJ de uma empresa para saber de contratos e penalidades.
            Os dados ficam só neste navegador.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="font-bold text-gray-500 uppercase tracking-wider">
              {isLoading
                ? 'Verificando...'
                : withResults > 0
                ? `${withResults} ${withResults > 1 ? 'itens' : 'item'} com menções`
                : 'Nenhuma menção nas edições indexadas'}
            </span>
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-gray-400">{items.length}/{MAX_TRACKED}</span>
          </div>

          {ordered.map(({ value, results, newResults, isLoading: itemLoading, isError }) => {
            const item = byValue.get(value)
            if (!item) return null
            return (
              <div key={value} className={`bg-white border rounded-xl overflow-hidden shadow-sm ${item.avoid ? 'border-red-200' : 'border-gray-200'}`}>
                <div className={`flex items-center justify-between gap-3 px-5 py-3 border-b ${
                  results.length > 0 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                    {itemLoading ? (
                      <Loader2 size={14} className="text-gray-400 animate-spin flex-shrink-0" />
                    ) : results.length > 0 ? (
                      <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    )}
                    <span className="text-[13px] font-bold text-gray-800 break-all">{displayValue(value)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${KIND_BADGE[item.kind]}`}>
                      {KIND_LABELS[item.kind]}
                    </span>
                    {item.avoid && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                        Evitar
                      </span>
                    )}
                    {newResults > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-[#FFCD00] text-gray-900 rounded-full">
                        {newResults} {newResults > 1 ? 'novas' : 'nova'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.kind === 'empresa' && (
                      <button
                        onClick={() => toggleAvoid(value)}
                        className={`transition-colors ${item.avoid ? 'text-red-500 hover:text-gray-400' : 'text-gray-300 hover:text-red-500'}`}
                        title={item.avoid ? 'Desmarcar "evitar"' : 'Marcar como empresa a evitar'}
                        aria-label={item.avoid ? 'Desmarcar evitar' : 'Marcar como empresa a evitar'}
                      >
                        <Ban size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => remove(value)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      title={`Remover ${displayValue(value)}`}
                      aria-label={`Remover ${displayValue(value)}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {itemLoading && (
                  <div className="px-5 py-4 space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" />)}
                  </div>
                )}

                {isError && !itemLoading && (
                  <div className="px-5 py-4 text-[12px] text-red-500 font-medium">
                    Falha ao verificar. Tente atualizar em instantes.
                  </div>
                )}

                {!itemLoading && !isError && results.length === 0 && (
                  <div className="px-5 py-4 text-[12px] text-gray-400">
                    Nenhuma menção nas edições indexadas.
                  </div>
                )}

                {!itemLoading && !isError && results.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {results.map((result) => (
                      <div key={result.edition_id} className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={12} className="text-gray-400 flex-shrink-0" />
                            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                              {result.title}
                            </span>
                            {lastVisit && result.pub_date > lastVisit && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-[#FFCD00] text-gray-900 rounded">NOVA</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-gray-400">
                            <span>{formatDay(result.pub_date)}</span>
                            <span className="font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              pág. {result.page}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-600 bg-gray-50 rounded px-3 py-2 leading-relaxed mb-2 line-clamp-3">
                          {result.excerpt}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] text-gray-400">
                            {result.matching_pages > 1
                              ? `Mencionado em ${result.matching_pages} páginas desta edição`
                              : 'Mencionado em 1 página desta edição'}
                          </span>
                          <Link
                            to={`/editions/${result.edition_id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1351B4] hover:text-[#168821] transition-colors"
                          >
                            Ver edição <ArrowRight size={11} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
