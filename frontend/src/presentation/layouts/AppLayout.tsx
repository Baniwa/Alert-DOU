import { Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070F1A] text-[#071D41] dark:text-gray-100">
      {/* GOV.BR top bar */}
      <div className="bg-[#168821] border-b-2 border-[#FFCD07]">
        <div className="max-w-7xl mx-auto px-4 py-1 flex items-center gap-2">
          <span className="text-[10px] font-bold text-white tracking-widest uppercase">
            🇧🇷 República Federativa do Brasil
          </span>
          <span className="text-[10px] text-white/50">·</span>
          <span className="text-[10px] text-white/70 tracking-wider uppercase">Imprensa Nacional</span>
        </div>
      </div>

      {/* Main header */}
      <header className="bg-[#071D41] border-b-[3px] border-[#C9A84C] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-wide">Alert DOU</h1>
            <p className="text-[11px] text-gray-400 tracking-wider uppercase">
              Monitoramento Inteligente do Diário Oficial da União
            </p>
          </div>
          <a
            href="https://www.in.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#C9A84C] hover:text-white transition-colors"
          >
            in.gov.br ↗
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      <footer className="bg-[#030F22] border-t-[3px] border-[#C9A84C] mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-[10px] text-gray-600 tracking-widest uppercase">
            República Federativa do Brasil · Imprensa Nacional · Alert DOU v0.1.0
          </p>
        </div>
      </footer>
    </div>
  )
}
