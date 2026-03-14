import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { createGroup, updateGroup } from '@/shared/hooks/useGroups'
import { useAuth } from '@/features/auth/AuthContext'
import { useT } from '@/shared/i18n'
import type { Group } from '@/domain/types'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'BRL', 'JPY']

interface FormValues {
  name: string
  currency: string
}

interface Props {
  open: boolean
  onClose: () => void
  group?: Group
}

export default function GroupFormModal({ open, onClose, group }: Props) {
  const t      = useT()
  const { user } = useAuth()
  const isEdit = !!group

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: '', currency: 'EUR' },
  })

  useEffect(() => {
    if (open) {
      reset({
        name:     group?.name     ?? '',
        currency: group?.currency ?? 'EUR',
      })
    }
  }, [open, group, reset])

  async function onSubmit(values: FormValues) {
    if (!user) return
    if (isEdit && group?.id != null) {
      await updateGroup(group.id, { name: values.name.trim(), currency: values.currency })
    } else {
      await createGroup({ name: values.name.trim(), currency: values.currency, createdBy: user.id })
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('groups.editGroup') : t('groups.addGroup')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('groups.groupName')}</Label>
            <Input
              id="name"
              placeholder={t('groups.groupNamePlaceholder')}
              {...register('name', { required: true })}
              className={errors.name ? 'border-destructive' : ''}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('groups.currency')}</Label>
            <Select value={watch('currency')} onValueChange={v => setValue('currency', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={isSubmitting}>{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
