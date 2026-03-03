import { useState } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, Play, Pause } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { db } from '@/data/db'
import { recurringRepo } from '@/data/repositories/recurringRepo'
import { formatMoney } from '@/domain/money'
import { getCategoryById } from '@/domain/categories'
import { formatDate } from '@/shared/utils/format'
import EmptyState from '@/shared/components/EmptyState'
import RecurringFormModal from '../components/RecurringFormModal'
import type { RecurringRule } from '@/domain/types'

export default function RecurringPage() {
  const rules = useLiveQuery(() => db.recurringRules.orderBy('nextDue').toArray(), []) ?? []
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<RecurringRule | undefined>()

  const handleEdit = (rule: RecurringRule) => {
    setEditing(rule)
    setModalOpen(true)
  }

  const handleClose = () => {
    setModalOpen(false)
    setEditing(undefined)
  }

  const handleDelete = async (id: number | undefined) => {
    if (id == null) return
    if (confirm('Delete this recurring rule?')) {
      await recurringRepo.remove(id)
    }
  }

  const handleToggle = async (rule: RecurringRule) => {
    if (rule.id == null) return
    await recurringRepo.update(rule.id, { active: !rule.active })
  }

  const FREQ_COLORS: Record<string, string> = {
    weekly:  'bg-blue-100 text-blue-700',
    monthly: 'bg-violet-100 text-violet-700',
    yearly:  'bg-amber-100 text-amber-700',
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Recurring Rules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your fixed income and expenses
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={RefreshCw}
          title="No recurring rules"
          description="Add your fixed monthly expenses like rent, subscriptions, or regular income like your salary."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add first rule
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {rules.map(rule => {
            const cat = getCategoryById(rule.category)
            return (
              <Card key={rule.id} className={!rule.active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <RefreshCw className="h-5 w-5" style={{ color: cat.color }} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{rule.name}</p>
                          {!rule.active && (
                            <Badge variant="secondary" className="text-xs">Paused</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${FREQ_COLORS[rule.frequency]}`}
                          >
                            {rule.frequency}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Next: {formatDate(rule.nextDue)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            · {cat.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-base font-semibold ${
                          rule.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {rule.amount >= 0 ? '+' : ''}{formatMoney(rule.amount)}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">Actions</span>
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="5"  r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(rule)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(rule)}>
                            {rule.active
                              ? <><Pause className="h-4 w-4 mr-2" /> Pause</>
                              : <><Play  className="h-4 w-4 mr-2" /> Resume</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <RecurringFormModal open={modalOpen} onClose={handleClose} rule={editing} />
    </div>
  )
}
