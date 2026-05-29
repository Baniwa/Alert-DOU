import { BookOpen, Bell, LayoutDashboard, Sparkles, ExternalLink } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Edições' },
  { to: '/summaries', icon: Sparkles, label: 'Resumos IA', soon: true },
  { to: '/alerts', icon: Bell, label: 'Alertas', soon: true },
  { to: '/docs', icon: BookOpen, label: 'Documentação', soon: true },
]

export function AppLayout() {
  return (
    <div className="flex h-screen bg-[#070F1A] overflow-hidden text-white">

      {/* ── SIDEBAR ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#071D41] border-r border-white/8">

        {/* GOV.BR strip */}
        <div className="bg-[#168821] border-b border-[#FFCD07]/60 px-4 py-1.5">
          <p className="text-[9px] font-bold text-white tracking-[0.15em] uppercase truncate">
            🇧🇷 República Federativa do Brasil
          </p>
        </div>

        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center flex-shrink-0">
              <span className="text-[#C9A84C] font-black text-sm select-none">D</span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-white leading-none">Alert DOU</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5 truncate">Imprensa Nacional</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, soon }) =>
            soon ? (
              <div key={to} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 cursor-not-allowed select-none">
                <Icon size={15} />
                <span className="text-[13px]">{label}</span>
                <span className="ml-auto text-[9px] bg-white/6 text-gray-600 px-1.5 py-0.5 rounded font-medium">Em breve</span>
              </div>
            ) : (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/20'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={15} />
                <span className="text-[13px] font-medium">{label}</span>
              </NavLink>
            )
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/8 space-y-2">
          <a
            href="https://www.in.gov.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] text-gray-600 hover:text-[#C9A84C] transition-colors"
          >
            <ExternalLink size={11} />
            in.gov.br
          </a>
          <p className="text-[10px] text-gray-700">v0.1.0</p>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <Outlet />
        </main>
      </div>

    </div>
  )
}
