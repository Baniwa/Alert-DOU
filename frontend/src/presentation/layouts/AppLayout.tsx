import { BookOpen, Bell, LayoutDashboard, Sparkles, ExternalLink, Landmark, Radar, Newspaper } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', icon: Newspaper, label: 'Jornal do Dia' },
  { to: '/editions', icon: LayoutDashboard, label: 'Edições' },
  { to: '/summaries', icon: Sparkles, label: 'Resumos IA' },
  { to: '/radar', icon: Radar, label: 'Radar' },
  { to: '/alerts', icon: Bell, label: 'Name Tracker' },
  { to: '/docs', icon: BookOpen, label: 'Documentação', soon: true },
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
          {NAV.map(({ to, icon: Icon, label, soon }) =>
            soon ? (
              <div key={to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-300/50 cursor-not-allowed select-none">
                <Icon size={16} />
                <span className="text-[13px] font-medium">{label}</span>
                <span className="ml-auto text-[9px] bg-white/10 text-blue-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Em breve</span>
              </div>
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
      </div>

    </div>
  )
}
