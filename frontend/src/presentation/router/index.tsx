import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { HomePage } from '../pages/Home/HomePage'
import { EditionsPage } from '../pages/Editions/EditionsPage'
import { EditionDetailPage } from '../pages/EditionDetail/EditionDetailPage'
import { SummariesPage } from '../pages/Summaries/SummariesPage'
import { RadarPage } from '../pages/Radar/RadarPage'
import { AlertsPage } from '../pages/Alerts/AlertsPage'

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
      { path: 'alerts', element: <AlertsPage /> },
    ],
  },
])
