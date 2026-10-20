import { Library, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { GLOSSARY, GLOSSARY_GROUPS } from '../../../domain/glossary'

function normalise(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function GlossaryPage() {
  const [query, setQuery] = useState('')

  const entries = useMemo(() => {
    const q = normalise(query.trim())
    if (!q) return GLOSSARY
    return GLOSSARY.filter((e) => normalise(`${e.term} ${e.definition}`).includes(q))
  }, [query])

  return (
    <div className="max-w-3xl w-full mx-auto">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-[11px] font-bold text-[#1351B4] uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
          <Library size={12} />
          Para ler o DOU
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Glossário</h1>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
          Os tipos de ato, termos e siglas que mais aparecem no Diário Oficial, com a base legal quando há uma.
        </p>
      </div>

      <div className="relative mb-8">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar termo ou sigla"
          aria-label="Buscar no glossário"
          className="w-full h-10 pl-10 pr-4 text-[13px] bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#1351B4] focus:ring-1 focus:ring-[#1351B4]"
        />
      </div>

      {entries.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-10">Nenhum termo encontrado.</p>
      )}

      <div className="space-y-10">
        {GLOSSARY_GROUPS.map((group) => {
          const items = entries.filter((e) => e.group === group)
          if (items.length === 0) return null
          return (
            <section key={group}>
              <h2 className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-3">{group}</h2>
              <dl className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-sm">
                {items.map((entry) => (
                  <div key={entry.term} className="px-5 py-4">
                    <dt className="text-[14px] font-bold text-gray-900">{entry.term}</dt>
                    <dd className="text-[13px] text-gray-600 leading-relaxed mt-1">
                      {entry.definition}
                      {entry.source && (
                        <span className="block text-[11px] text-gray-400 mt-1.5">{entry.source}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>
    </div>
  )
}
