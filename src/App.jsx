// src/App.jsx
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes/index.jsx'
import { ToastProvider } from '@/components/shared/toast/ToastProvider'

function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}

export default App