import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import EmptyState from '@/shared/components/EmptyState'
import PageLoader from '@/shared/components/PageLoader'
import { useGroups } from '@/shared/hooks/useGroups'
import { useT } from '@/shared/i18n'
import GroupFormModal from '../components/GroupFormModal'

export default function GroupsPage() {
  const t        = useT()
  const navigate = useNavigate()
  const { data: groups = [], isLoading } = useGroups()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('groups.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('groups.subtitle')}</p>
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" />
          {t('groups.addGroup')}
        </Button>
      </div>

      {isLoading && <PageLoader message={t('groups.loading')} />}

      {!isLoading && groups.length === 0 && (
        <EmptyState
          icon={Users}
          title={t('groups.noGroups')}
          description={t('groups.noGroupsDesc')}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              {t('groups.addFirst')}
            </Button>
          }
        />
      )}

      {!isLoading && groups.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(group => (
            <Card
              key={group.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.currency}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GroupFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
