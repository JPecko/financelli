import { createBrowserRouter } from 'react-router-dom'
import Layout from '@/shared/components/Layout'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import TransactionsPage from '@/features/transactions/pages/TransactionsPage'
import AccountsPage from '@/features/accounts/pages/AccountsPage'
import RecurringPage from '@/features/recurring/pages/RecurringPage'
import SettingsPage from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,              element: <DashboardPage /> },
      { path: 'transactions',     element: <TransactionsPage /> },
      { path: 'accounts',         element: <AccountsPage /> },
      { path: 'recurring',        element: <RecurringPage /> },
      { path: 'settings',         element: <SettingsPage /> },
    ],
  },
])
