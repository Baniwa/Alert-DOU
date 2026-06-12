import { ExternalLink, BookOpen, Code2, Server, Database, Cpu, Layers, GitPullRequest } from 'lucide-react'

const STACK = [
  {
    category: 'Frontend',
    icon: Layers,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    items: ['React 19 + TypeScript', 'Tailwind CSS v4', 'Vite', 'TanStack Query', 'React Router v6'],
  },
  {
    category: 'Backend',
    icon: Server,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    items: ['FastAPI (Python 3.12)', 'Celery + Redis', 'SQLAlchemy 2 + Alembic', 'Playwright (scraping)', 'pdfplumber'],
  },
  {
    category: 'Banco de dados',
    icon: Database,
    color: 'text-purple-500',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    items: ['PostgreSQL 16', 'Redis 7', 'full-text search (unaccent)', 'Alembic migrations'],
  },
  {
    category: 'IA',
    icon: Cpu,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    items: ['Google Gemini Flash', 'Resumo executivo por seção', 'Tradução PT → EN', 'Detecção automática de seção'],
  },
]

const FEATURES = [
  'Monitoramento diário automático das 3 seções do DOU',
  'Resumos executivos gerados por IA com destaque de nomeações',
  'Name Tracker — busca no texto integral dos PDFs',
  'Highlight de trechos com persistência em localStorage',
  'Tradução PT → EN dos resumos sob demanda',
  'Backfill histórico de edições com rate limit',
  'API pública documentada em /docs (OpenAPI)',
  'Segurança: rate limiting, CSP headers, unaccent search, CPF redaction nos logs',
]

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-gray-200">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
          <Code2 size={12} />
          Projeto Open Source
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-3">Sobre o Alert DOU</h1>
        <p className="text-base text-gray-600 leading-relaxed max-w-2xl">
          Sistema de monitoramento do <strong>Diário Oficial da União</strong> com inteligência artificial.
          Desenvolvido para democratizar o acesso a informações públicas brasileiras — nomeações, exonerações,
          licitações e atos oficiais publicados diariamente pela Imprensa Nacional.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <a
            href="https://github.com/Baniwa/Alert-DOU"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-[13px] font-bold rounded-lg transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Ver no GitHub
          </a>
          <a
            href="https://github.com/Baniwa/Alert-DOU/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-[#1351B4] text-gray-700 hover:text-[#1351B4] text-[13px] font-bold rounded-lg transition-colors"
          >
            <BookOpen size={14} />
            Documentação
          </a>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-200 hover:border-[#168821] text-gray-700 hover:text-[#168821] text-[13px] font-bold rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
            API Docs
          </a>
        </div>
      </div>

      {/* Features */}
      <div className="mb-10">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Funcionalidades</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-2.5 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1351B4] mt-1.5 flex-shrink-0" />
              <p className="text-[13px] text-gray-700 leading-snug">{f}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className="mb-10">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Stack técnica</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STACK.map(({ category, icon: Icon, color, bg, border, items }) => (
            <div key={category} className={`p-4 rounded-xl border ${bg} ${border}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={15} className={color} />
                <span className={`text-[11px] font-extrabold uppercase tracking-wider ${color}`}>{category}</span>
              </div>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="text-[12px] text-gray-700 font-medium">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Contribute */}
      <div className="bg-[#1351B4] rounded-2xl p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
            <GitPullRequest size={22} className="text-[#FFCD00]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold mb-2">Contribua com o projeto</h2>
            <p className="text-blue-100 text-[13px] leading-relaxed mb-5">
              O Alert DOU é open source sob licença MIT. Contribuições são bem-vindas —
              desde correções de bugs e melhorias de UX até novas integrações e funcionalidades.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/Baniwa/Alert-DOU/issues/new?template=bug_report.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[12px] font-bold rounded-lg transition-colors"
              >
                Reportar bug
              </a>
              <a
                href="https://github.com/Baniwa/Alert-DOU/issues/new?template=feature_request.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[12px] font-bold rounded-lg transition-colors"
              >
                Sugerir feature
              </a>
              <a
                href="https://github.com/Baniwa/Alert-DOU/issues?q=label%3A%22good+first+issue%22"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFCD00] hover:bg-yellow-300 text-gray-900 text-[12px] font-bold rounded-lg transition-colors"
              >
                Good first issues
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Author */}
      <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-gray-500">Desenvolvido por</p>
          <p className="text-[14px] font-bold text-gray-800">Giulia Gabriela</p>
          <p className="text-[11px] text-gray-400">Full Stack Developer · Brasília, Brasil</p>
        </div>
        <a
          href="https://github.com/Baniwa"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-50 hover:opacity-100 transition-opacity"
        >
          <img src="/baniwa-logo.png" alt="Baniwa" className="h-12 w-12 object-contain" />
        </a>
      </div>
    </div>
  )
}
