import { RouterProvider } from 'react-router-dom'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { AuthProvider } from '@/features/auth/AuthContext'
import { router } from './router'

export default function Providers() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  )
}
