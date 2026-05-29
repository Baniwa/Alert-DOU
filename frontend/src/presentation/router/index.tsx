import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { HomePage } from '../pages/Home/HomePage'
import { EditionDetailPage } from '../pages/EditionDetail/EditionDetailPage'
import { SummariesPage } from '../pages/Summaries/SummariesPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'editions/:id', element: <EditionDetailPage /> },
      { path: 'summaries', element: <SummariesPage /> },
    ],
  },
])
