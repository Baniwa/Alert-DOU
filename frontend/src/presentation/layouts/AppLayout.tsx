import { Outlet } from 'react-router-dom'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#060E1A] text-white">

      {/* GOV.BR top strip */}
      <div className="bg-[#168821] border-b-2 border-[#FFCD07]">
        <div className="max-w-6xl mx-auto px-6 py-1.5 flex items-center gap-2">
          <span className="text-[10px] font-bold text-white tracking-[0.18em] uppercase select-none">
            🇧🇷 República Federativa do Brasil
          </span>
          <span className="text-white/30 text-[10px]">·</span>
          <span className="text-[10px] text-white/60 tracking-[0.12em] uppercase">Imprensa Nacional</span>
        </div>
      </div>

      {/* Main header */}
      <header className="bg-[#071D41] border-b border-[#C9A84C]/40">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo mark */}
            <div className="w-9 h-9 rounded-lg bg-[#C9A84C]/15 border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] font-black text-lg select-none">
              D
            </div>
            <div>
              <h1 className="text-[17px] font-extrabold text-white tracking-tight leading-none">
                Alert DOU
              </h1>
              <p className="text-[10px] text-gray-500 tracking-[0.14em] uppercase mt-0.5">
                Monitoramento Inteligente
              </p>
            </div>
          </div>

          <a
            href="https://www.in.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#C9A84C] transition-colors px-3 py-1.5 rounded-md border border-white/8 hover:border-[#C9A84C]/30"
          >
            in.gov.br
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/6">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-gray-700 tracking-widest uppercase">
            República Federativa do Brasil · Imprensa Nacional
          </p>
          <p className="text-[10px] text-gray-700">Alert DOU v0.1.0</p>
        </div>
      </footer>

    </div>
  )
}
