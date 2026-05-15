import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { ROUTES as __ROUTES } from '@/constants/routes'
 
export function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#FDF5F1' }}
      >
        <ShieldX size={40} color="#C35E33" strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          You don't have permission to view this page.
          Please contact your administrator.
        </p>
      </div>
      <button
        onClick={() => navigate(__ROUTES.DASHBOARD)}
        className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
        style={{ backgroundColor: '#C35E33' }}
      >
        Go to Dashboard
      </button>
    </div>
  )
}