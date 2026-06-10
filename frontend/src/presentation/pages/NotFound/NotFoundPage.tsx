import { Link } from 'react-router-dom'
import { Landmark } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
      <div className="text-center px-6">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#1351B4]/10 flex items-center justify-center">
            <Landmark size={24} className="text-[#1351B4]" />
          </div>
          <span className="text-xl font-extrabold text-[#1351B4]">Alert DOU</span>
        </div>
        <p className="text-7xl font-extrabold text-gray-200 mb-4">404</p>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Página não encontrada</h1>
        <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
          Esta página não existe ou foi removida.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1351B4] hover:bg-[#0c326f] text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
        >
          Ir para o Jornal do Dia
        </Link>
      </div>
    </div>
  )
}
