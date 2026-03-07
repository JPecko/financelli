import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import Layout from '@/shared/components/Layout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import TransactionsPage from '@/features/transactions/pages/TransactionsPage'
import AccountsPage from '@/features/accounts/pages/AccountsPage'
import RecurringPage from '@/features/recurring/pages/RecurringPage'
import SettingsPage from '@/features/settings/SettingsPage'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true,              element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',        element: <DashboardPage /> },
          { path: 'accounts',         element: <AccountsPage /> },
          { path: 'transactions',     element: <TransactionsPage /> },
          { path: 'recurring',        element: <RecurringPage /> },
          { path: 'settings',         element: <SettingsPage /> },
        ],
      },
    ],
  },
])
