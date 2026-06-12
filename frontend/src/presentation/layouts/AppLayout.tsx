import { BookOpen, Bell, LayoutDashboard, Sparkles, ExternalLink, Landmark, Radar, Newspaper } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const NAV = [
  { to: '/', icon: Newspaper, label: 'Jornal do Dia' },
  { to: '/editions', icon: LayoutDashboard, label: 'Edições' },
  { to: '/summaries', icon: Sparkles, label: 'Resumos IA' },
  { to: '/radar', icon: Radar, label: 'Radar' },
  { to: '/alerts', icon: Bell, label: 'Name Tracker' },
  { to: `${API_BASE}/docs`, icon: BookOpen, label: 'Documentação', external: true },
]

export function AppLayout() {
  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden text-gray-900 font-sans">

      {/* ── SIDEBAR ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#1351B4] shadow-xl z-10">

        {/* GOV.BR strip */}
        <div className="bg-[#168821] border-b-2 border-[#FFCD00] px-2 py-1.5">
          <p className="text-[9px] font-bold text-white tracking-wide uppercase truncate text-center">
            🇧🇷 República Federativa do Brasil
          </p>
        </div>

        {/* Logo */}
        <div className="px-4 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Landmark size={20} className="text-[#FFCD00]" />
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-extrabold text-white leading-tight">Alert DOU</p>
              <p className="text-[10px] text-blue-200 uppercase tracking-wider mt-0.5 truncate">Imprensa Nacional</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, external }) =>
            external ? (
              <a
                key={to}
                href={to}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-blue-100 hover:bg-white/10 hover:text-white font-medium"
              >
                <Icon size={16} />
                <span className="text-[13px]">{label}</span>
                <ExternalLink size={11} className="ml-auto opacity-50" />
              </a>
            ) : (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-[#1351B4] shadow-md font-bold'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white font-medium'
                  }`
                }
              >
                <Icon size={16} />
                <span className="text-[13px]">{label}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10 space-y-2 bg-[#0C326F]">
          <a
            href="https://www.in.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] font-medium text-blue-200 hover:text-white transition-colors"
          >
            <ExternalLink size={12} />
            Portal in.gov.br
          </a>
          <p className="text-[10px] text-blue-400">v0.1.0 • Dados Públicos</p>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle top decoration for main area */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1351B4] via-[#168821] to-[#FFCD00]" />
        
        <main className="flex-1 overflow-y-auto px-10 py-10">
          <Outlet />
        </main>

        <footer className="flex-shrink-0 border-t border-gray-200 bg-white px-10 py-3 flex items-center justify-between gap-4">
          <p className="text-[11px] text-gray-400">
            © 2026 <span className="font-semibold text-gray-600">Giulia Gabriela</span> · Dados públicos da{' '}
            <a href="https://www.in.gov.br" target="_blank" rel="noopener noreferrer" className="hover:text-[#1351B4] transition-colors">
              Imprensa Nacional
            </a>
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Baniwa/Alert-DOU"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Código aberto — MIT
            </a>
            <span className="text-gray-200">|</span>
            <a
              href="https://github.com/Baniwa/Alert-DOU/wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gray-400 hover:text-[#1351B4] transition-colors"
            >
              Documentação
            </a>
            <span className="text-gray-200">|</span>
            <span className="text-[11px] font-mono text-gray-300">v0.1.0</span>
            <span className="text-gray-200">|</span>
            <a
              href="https://github.com/Baniwa"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-40 hover:opacity-80 transition-opacity"
              title="by Baniwa"
            >
              <img src="/baniwa-logo.png" alt="Baniwa" className="h-5 w-5 object-contain" />
            </a>
          </div>
        </footer>
      </div>

    </div>
  )
}
