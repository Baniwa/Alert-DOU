import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, Plus, X, ArrowRight, AlertCircle, FileText, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useNameAlerts } from '../../../application/hooks/useNameAlerts'
import { displayName, loadNames, saveNames, validateInput } from './alerts.helpers'

const MAX_TRACKED = 20

export function AlertsPage() {
  const [tracked, setTracked] = useState<string[]>(loadNames)
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState('')
  const queryClient = useQueryClient()

  const { alerts: rawAlerts, isLoading, namesWithAlerts } = useNameAlerts(tracked)

  const alerts = [...rawAlerts].sort((a, b) => {
    if (a.isLoading || b.isLoading) return 0
    return b.results.length - a.results.length
  })

  function add() {
    const result = validateInput(input)
    if (!result.ok) { setInputError(result.error); return }
    if (tracked.includes(result.value)) { setInputError('Já monitorado.'); return }
    if (tracked.length >= MAX_TRACKED) { setInputError(`Máximo de ${MAX_TRACKED} entradas.`); return }
    const updated = [...tracked, result.value]
    setTracked(updated)
    saveNames(updated)
    setInput('')
    setInputError('')
  }

  function remove(value: string) {
    const updated = tracked.filter((t) => t !== value)
    setTracked(updated)
    saveNames(updated)
  }

  function refresh() {
    tracked.forEach((name) => {
      queryClient.invalidateQueries({ queryKey: ['name-alert', name] })
    })
  }

  return (
    <div className="max-w-3xl w-full mx-auto">

      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
          <Bell size={12} />
          Monitoramento Pessoal
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Name Tracker</h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
              Cadastre nomes ou CPFs para monitorar automaticamente menções no texto integral do DOU.
              Os alertas são verificados ao abrir esta página.
            </p>
          </div>
          {tracked.length > 0 && (
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

      {/* Privacy notice */}
      <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
        <p>
          Os dados são armazenados <strong>apenas no seu navegador</strong> (localStorage).
          A busca percorre o <strong>texto integral dos PDFs</strong> indexados — muito mais precisa que buscar só nos resumos IA.
        </p>
      </div>

      {/* Add input */}
      <div className="mb-8">
        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
          Adicionar nome ou CPF
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setInputError('') }}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder='Ex: "João da Silva" ou "123.456.789-09"'
              maxLength={110}
              className={`w-full h-10 px-4 text-[13px] bg-white border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                inputError
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                  : 'border-gray-300 focus:border-[#1351B4] focus:ring-[#1351B4]'
              }`}
            />
            {inputError && <p className="text-[11px] text-red-500 mt-1 font-medium">{inputError}</p>}
          </div>
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

      {/* Empty state */}
      {tracked.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-16 text-center">
          <div className="text-4xl mb-4">👤</div>
          <p className="text-[15px] font-bold text-gray-700 mb-2">Nenhum nome monitorado</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Adicione seu nome ou CPF acima para monitorar menções no DOU.
          </p>
        </div>
      )}

      {/* Alert results — one section per tracked name */}
      {tracked.length > 0 && (
        <div className="space-y-6">

          {/* Summary bar */}
          <div className="flex items-center gap-3 text-[11px]">
            <span className="font-bold text-gray-500 uppercase tracking-wider">
              {isLoading
                ? 'Verificando...'
                : namesWithAlerts > 0
                ? `${namesWithAlerts} nome${namesWithAlerts > 1 ? 's' : ''} com menções encontradas`
                : 'Nenhuma menção encontrada nas edições indexadas'}
            </span>
            <div className="h-px bg-gray-200 flex-1" />
            <span className="text-gray-400">{tracked.length}/{MAX_TRACKED} monitorados</span>
          </div>

          {/* One card per name */}
          {alerts.map(({ name, results, isLoading: nameLoading, isError }) => (
            <div key={name} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

              {/* Name header */}
              <div className={`flex items-center justify-between px-5 py-3 border-b ${
                results.length > 0 ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-2.5">
                  {nameLoading ? (
                    <Loader2 size={14} className="text-gray-400 animate-spin flex-shrink-0" />
                  ) : results.length > 0 ? (
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  )}
                  <span className="text-[13px] font-bold text-gray-800">{displayName(name)}</span>
                  {results.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">
                      {results.length} menção{results.length > 1 ? 'ões' : ''}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => remove(name)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                  title={`Remover ${displayName(name)}`}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Results or states */}
              {nameLoading && (
                <div className="px-5 py-4 space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" />)}
                </div>
              )}

              {isError && !nameLoading && (
                <div className="px-5 py-4 text-[12px] text-red-500 font-medium">
                  Falha ao verificar — tente atualizar.
                </div>
              )}

              {!nameLoading && !isError && results.length === 0 && (
                <div className="px-5 py-4 text-[12px] text-gray-400">
                  Nenhuma menção encontrada nas edições com texto indexado.{' '}
                  <Link to="/" className="text-[#1351B4] font-bold hover:underline">
                    Gere resumos de mais edições
                  </Link>{' '}
                  para ampliar a cobertura.
                </div>
              )}

              {!nameLoading && !isError && results.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {results.map((result) => (
                    <div key={result.edition_id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                            {result.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">
                            {format(parseISO(result.pub_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                            Nº {result.edition_number}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 font-mono bg-gray-50 rounded px-3 py-2 leading-relaxed mb-3 line-clamp-2">
                        {result.excerpt}
                      </p>
                      <Link
                        to={`/editions/${result.edition_id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1351B4] hover:text-[#168821] transition-colors"
                      >
                        Ver edição completa <ArrowRight size={11} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
