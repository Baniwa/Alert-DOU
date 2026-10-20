import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { HomePage } from '../pages/Home/HomePage'
import { EditionsPage } from '../pages/Editions/EditionsPage'
import { EditionDetailPage } from '../pages/EditionDetail/EditionDetailPage'
import { SummariesPage } from '../pages/Summaries/SummariesPage'
import { RadarPage } from '../pages/Radar/RadarPage'
import { MonitorPage } from '../pages/Monitor/MonitorPage'
import { ThemesPage } from '../pages/Themes/ThemesPage'
import { GlossaryPage } from '../pages/Glossary/GlossaryPage'
import { AboutPage } from '../pages/About/AboutPage'
import { NotFoundPage } from '../pages/NotFound/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'editions', element: <EditionsPage /> },
      { path: 'editions/:id', element: <EditionDetailPage /> },
      { path: 'summaries', element: <SummariesPage /> },
      { path: 'radar', element: <RadarPage /> },
      { path: 'monitor', element: <MonitorPage /> },
      { path: 'temas', element: <ThemesPage /> },
      { path: 'glossario', element: <GlossaryPage /> },
      { path: 'alerts', element: <Navigate to="/monitor" replace /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
