import { useState, useEffect } from 'react'
import { Search, X, UserPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { profilesRepo } from '@/data/repositories/profilesRepo'
import { accountSharesRepo } from '@/data/repositories/accountSharesRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useAuth } from '@/features/auth/AuthContext'
import type { Account, AccountShare } from '@/domain/types'
import type { ProfileResult } from '@/data/repositories/profilesRepo'

interface Props {
  open: boolean
  onClose: () => void
  account: Account
}

export default function ShareAccountModal({ open, onClose, account }: Props) {
  const { user } = useAuth()
  const isOwner = user?.id === account.ownerId

  const [sharedWith, setSharedWith]   = useState<AccountShare[]>([])
  const [ownerProfile, setOwnerProfile] = useState<ProfileResult | null>(null)
  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<ProfileResult[]>([])
  const [searching, setSearching]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Fetch fresh share data every time the modal opens
  useEffect(() => {
    if (!open || !account.id) return
    accountSharesRepo.getForAccount(account.id).then(setSharedWith)
    if (account.ownerId) profilesRepo.getById(account.ownerId).then(setOwnerProfile)
  }, [open, account.id, account.ownerId])

  const sharedIds = new Set(sharedWith.map(s => s.userId))

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setError(null)
    try {
      const found = await profilesRepo.search(q)
      // Exclude self and already-shared users and the owner
      setResults(found.filter(p => p.id !== user?.id && p.id !== account.ownerId))
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async (profile: ProfileResult) => {
    if (!account.id) return
    setError(null)
    try {
      await accountSharesRepo.add(account.id, profile.id)
      const newShare: AccountShare = { userId: profile.id, email: profile.email, fullName: profile.fullName }
      setSharedWith(prev => [...prev, newShare])
      setResults(r => r.filter(p => p.id !== profile.id))
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
    } catch {
      setError('Could not add user. They may already have access.')
    }
  }

  const handleRemove = async (userId: string) => {
    if (!account.id) return
    setError(null)
    try {
      await accountSharesRepo.remove(account.id, userId)
      setSharedWith(prev => prev.filter(s => s.userId !== userId))
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
    } catch {
      setError('Could not remove user.')
    }
  }

  const handleClose = () => {
    setQuery('')
    setResults([])
    setError(null)
    onClose()
  }

  const ownerLabel = ownerProfile
    ? ownerProfile.fullName ?? ownerProfile.email
    : (user?.email ?? 'Owner')

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share "{account.name}"</DialogTitle>
        </DialogHeader>

        {/* Search — only for owner */}
        {isOwner && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              />
              <Button variant="outline" size="icon" onClick={handleSearch} disabled={searching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {results.length > 0 && (
              <div className="rounded-md border divide-y">
                {results.map(p => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.fullName ?? p.email}</p>
                      {p.fullName && <p className="text-xs text-muted-foreground">{p.email}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAdd(p)}
                      disabled={sharedIds.has(p.id)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Current participants */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Participants ({1 + sharedWith.length})
          </p>
          <div className="rounded-md border divide-y">
            {/* Owner row */}
            <div className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium">{ownerLabel}</p>
                {ownerProfile?.fullName && (
                  <p className="text-xs text-muted-foreground">{ownerProfile.email}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">owner</span>
            </div>

            {/* Shared users */}
            {sharedWith.map(s => (
              <div key={s.userId} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{s.fullName ?? s.email}</p>
                  {s.fullName && <p className="text-xs text-muted-foreground">{s.email}</p>}
                </div>
                {isOwner && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 w-7 p-0"
                    onClick={() => handleRemove(s.userId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {sharedWith.length === 0 && (
              <div className="px-3 py-2">
                <p className="text-sm text-muted-foreground">Not shared with anyone yet.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
