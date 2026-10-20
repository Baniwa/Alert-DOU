import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, FileText, GraduationCap, Leaf, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMonitorMatches, useSearchCoverage } from '../../../application/hooks/useMonitorMatches'

const THEMES = [
  {
    id: 'meio-ambiente',
    label: 'Meio Ambiente',
    icon: Leaf,
    description: 'Atos e contratações dos órgãos ambientais federais e menções a licenciamento.',
    terms: ['Ibama', 'ICMBio', 'Conama', 'Ministério do Meio Ambiente', 'licenciamento ambiental', 'Agência Nacional de Águas'],
  },
  {
    id: 'concursos',
    label: 'Concursos',
    icon: GraduationCap,
    description: 'Editais, resultados e homologações de concursos e seleções públicas.',
    terms: ['concurso público', 'processo seletivo simplificado', 'homologação do resultado', 'edital de abertura'],
  },
] as const

type ThemeId = (typeof THEMES)[number]['id']

export function ThemesPage() {
  const [active, setActive] = useState<ThemeId>('meio-ambiente')
  const theme = THEMES.find((t) => t.id === active)!
  const { matches, isLoading } = useMonitorMatches([...theme.terms], null)
  const { data: coverage } = useSearchCoverage()

  return (
    <div className="max-w-3xl w-full mx-auto">
      <div className="mb-6 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Temas</h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Recortes prontos do texto integral do DOU, sem precisar cadastrar cada termo.
          {coverage?.first_date && coverage.last_date && (
            <> Cobre {coverage.indexed_editions} edições, de {format(parseISO(coverage.first_date), 'dd/MM/yyyy')} a {format(parseISO(coverage.last_date), 'dd/MM/yyyy')}.</>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="tablist">
        {THEMES.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
            className={`inline-flex items-center gap-2 text-[12px] font-bold px-4 py-2 rounded-lg border transition-colors ${
              t.id === active
                ? 'bg-[#168821] text-white border-[#168821]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#168821] hover:text-[#168821]'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-[12px] text-gray-500 mb-6">{theme.description}</p>

      <div className="space-y-5">
        {matches.map(({ value, results, isLoading: termLoading, isError }) => (
          <section key={value} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <header className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-[13px] font-bold text-gray-800">{value}</h2>
              {termLoading ? (
                <Loader2 size={13} className="text-gray-400 animate-spin" />
              ) : (
                <span className="text-[10px] font-bold text-gray-400">
                  {results.length === 10 ? '10 edições mais recentes' : `${results.length} ${results.length === 1 ? 'edição' : 'edições'}`}
                </span>
              )}
            </header>
            {isError && <p className="px-5 py-4 text-[12px] text-red-500">Falha ao buscar. Tente de novo em instantes.</p>}
            {!termLoading && !isError && results.length === 0 && (
              <p className="px-5 py-4 text-[12px] text-gray-400">Nenhuma menção nas edições indexadas.</p>
            )}
            <div className="divide-y divide-gray-100">
              {results.slice(0, 3).map((result) => (
                <div key={result.edition_id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="flex items-center gap-2 text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                      <FileText size={12} className="text-gray-400" />
                      {result.title}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {format(parseISO(result.pub_date), 'dd/MM/yyyy', { locale: ptBR })} · pág. {result.page}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2 mb-1.5">{result.excerpt}</p>
                  <Link
                    to={`/editions/${result.edition_id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1351B4] hover:text-[#168821]"
                  >
                    Ver edição <ArrowRight size={11} />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {isLoading && <p className="sr-only" role="status">Buscando…</p>}
    </div>
  )
}
