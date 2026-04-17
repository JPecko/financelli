import { useNavigate } from 'react-router-dom'
import { hasAppUpdate } from '@/shared/utils/checkForAppUpdate'
import { hardRefreshApp } from '@/shared/utils/hardRefreshApp'

export function useLogoClick({ navigateTo = '/dashboard' }: { navigateTo?: string | false } = {}) {
  const navigate = useNavigate()

  return async () => {
    if (await hasAppUpdate()) {
      await hardRefreshApp()
      return
    }
    if (navigateTo) navigate(navigateTo)
  }
}
