import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bell, Plus, X, Users, ArrowRight, AlertCircle, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../infrastructure/api/client'
import { searchEditionsByName } from '../../../infrastructure/api/editions.api'
import type { EditionSearchResult } from '../../../infrastructure/api/editions.api'

const STORAGE_KEY = 'alert-dou:tracked-names'
const MAX_NAME_LENGTH = 100
const MAX_TRACKED = 20

function normaliseCPF(value: string): string {
  return value.replace(/\D/g, '')
}

function isCPF(value: string): boolean {
  return /^\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2}$/.test(value.trim())
}

function sanitise(value: string): string {
  return value.replace(/[<>"'`]/g, '').trim()
}

function validateInput(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: 'Digite um nome ou CPF.' }
  if (trimmed.length < 2) return { ok: false, error: 'Mínimo de 2 caracteres.' }
  if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, error: `Máximo de ${MAX_NAME_LENGTH} caracteres.` }

  if (isCPF(trimmed)) {
    const digits = normaliseCPF(trimmed)
    if (/^(\d)\1{10}$/.test(digits)) return { ok: false, error: 'CPF inválido.' }
    return { ok: true, value: digits } // store normalised
  }

  return { ok: true, value: sanitise(trimmed) }
}

function loadNames(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.slice(0, MAX_TRACKED) : []
  } catch {
    return []
  }
}

function saveNames(list: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_TRACKED)))
}


function displayName(value: string): string {
  // If it looks like a raw CPF (11 digits), format for display
  if (/^\d{11}$/.test(value)) {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
  }
  return value
}

export function AlertsPage() {
  const [tracked, setTracked] = useState<string[]>(loadNames)
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState('')
  const [activeSearch, setActiveSearch] = useState<string | null>(null)

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
    if (activeSearch === value) setActiveSearch(null)
  }

  const { data: results, isLoading, isError, error } = useQuery({
    queryKey: ['name-search', activeSearch],
    queryFn: () => searchEditionsByName(activeSearch!),
    enabled: !!activeSearch,
    retry: false,
    staleTime: 2 * 60 * 1000,
  })

  const apiError = error instanceof ApiError ? error : null
  const isRateLimited = apiError?.status === 429

  return (
    <div className="max-w-3xl w-full mx-auto">

      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
          <Bell size={12} />
          Monitoramento Pessoal
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Name Tracker</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-2xl leading-relaxed">
          Cadastre seu nome ou CPF para verificar menções nos resumos do DOU. Ideal para acompanhar nomeações e exonerações publicadas na Seção 2.
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-800">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
        <p>
          Os dados são armazenados <strong>apenas no seu navegador</strong> (localStorage) e nunca enviados para servidores externos.
          A busca consulta somente resumos já gerados pela IA — não o texto integral do DOU.
        </p>
      </div>

      <div className="mb-6">
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
              maxLength={MAX_NAME_LENGTH + 10}
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
        <p className="text-[10px] text-gray-400 mt-1.5">
          CPFs são normalizados e armazenados apenas como dígitos (sem pontuação).
        </p>
      </div>

      {tracked.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
            Monitorando ({tracked.length}/{MAX_TRACKED})
          </p>
          <div className="flex flex-wrap gap-2">
            {tracked.map((value) => (
              <button
                key={value}
                onClick={() => setActiveSearch(activeSearch === value ? null : value)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold rounded-lg border transition-all ${
                  activeSearch === value
                    ? 'bg-[#1351B4] text-white border-[#1351B4] shadow-sm'
                    : 'bg-[#1351B4]/10 text-[#1351B4] border-[#1351B4]/20 hover:bg-[#1351B4]/20'
                }`}
              >
                <Users size={11} />
                {displayName(value)}
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); remove(value) }}
                  className="ml-0.5 hover:text-red-400 transition-colors"
                  title={`Remover ${displayName(value)}`}
                >
                  <X size={11} />
                </span>
              </button>
            ))}
          </div>
          {!activeSearch && (
            <p className="text-[11px] text-gray-400 mt-2">Clique em um nome para buscar menções nos resumos.</p>
          )}
        </div>
      )}

      {tracked.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-16 text-center">
          <div className="text-4xl mb-4">👤</div>
          <p className="text-[15px] font-bold text-gray-700 mb-2">Nenhum nome monitorado</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Adicione seu nome ou CPF acima para verificar menções nos resumos do DOU.
          </p>
        </div>
      )}

      {activeSearch && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
              {isLoading
                ? `Buscando "${displayName(activeSearch)}"...`
                : isError
                ? 'Erro na busca'
                : results?.length
                ? `${results.length} resultado${results.length > 1 ? 's' : ''} para "${displayName(activeSearch)}"`
                : `Nenhum resultado para "${displayName(activeSearch)}"`}
            </h2>
            <div className="h-px bg-gray-200 flex-1" />
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-200 animate-pulse" />)}
            </div>
          )}

          {isRateLimited && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <p className="text-sm font-bold text-amber-800">Muitas buscas em pouco tempo.</p>
              <p className="text-xs text-amber-600 mt-1">Aguarde alguns segundos e tente novamente.</p>
            </div>
          )}

          {isError && !isRateLimited && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-bold text-red-700">Não foi possível realizar a busca.</p>
            </div>
          )}

          {!isLoading && !isError && results?.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-sm text-gray-500 mb-1">
                Nenhuma edição com o texto integral indexado menciona <strong>{displayName(activeSearch)}</strong>.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                O texto é indexado quando um resumo IA é gerado. Gere resumos nas{' '}
                <Link to="/" className="text-[#1351B4] font-bold hover:underline">edições do dia</Link> para ampliar a cobertura.
              </p>
            </div>
          )}

          {!isLoading && !isError && results && results.length > 0 && (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.edition_id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#1351B4]/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-[#1351B4]" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-gray-800 uppercase tracking-wider leading-none">{result.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {format(parseISO(result.pub_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#1351B4]/10 text-[#1351B4] rounded-full border border-[#1351B4]/20 flex-shrink-0">
                      Edição {result.edition_number}
                    </span>
                  </div>

                  <p className="text-[12px] text-gray-500 leading-relaxed font-mono bg-gray-50 rounded-lg px-3 py-2 mb-4 line-clamp-3">
                    {result.excerpt}
                  </p>

                  <Link
                    to={`/editions/${result.edition_id}`}
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1351B4] hover:text-[#168821] transition-colors"
                  >
                    Ver edição completa <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
