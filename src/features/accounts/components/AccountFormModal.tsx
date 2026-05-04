import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import PlainSelect from '@/shared/components/PlainSelect'
import { toCents, fromCents } from '@/domain/money'
import { addAccount, updateAccount } from '@/shared/hooks/useAccounts'
import { useT } from '@/shared/i18n'
import { buildBankSelectOptions, buildAccountTypeSelectOptions } from './accountFormOptions'
import type { Account, AccountType } from '@/domain/types'

const COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

const ROUNDUP_VALUES = ['off', '1', '2', '3', '4', '5', '10']

interface FormValues {
  name: string
  bankCode: string
  type: AccountType
  balance: string
  currency: string
  color: string
  cashbackPct: string
  roundupMultiplier: string
  investedBase: string
  entryFee: string
}

interface Props {
  open: boolean
  onClose: () => void
  account?: Account
}

function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0
}

export default function AccountFormModal({ open, onClose, account }: Props) {
  const t = useT()
  const isEdit = !!account

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: '',
      bankCode: 'none',
      type: 'checking',
      balance: '0',
      currency: 'EUR',
      color: COLORS[0],
      cashbackPct: '',
      roundupMultiplier: 'off',
      investedBase: '',
      entryFee: '',
    },
  })

  const selectedColor    = watch('color')
  const selectedBankCode = watch('bankCode')
  const selectedType     = watch('type')
  const selectedRoundup  = watch('roundupMultiplier')
  const isInvestmentType = selectedType === 'investment'

  const accountTypes: { value: AccountType; label: string }[] = [
    { value: 'checking',   label: t('accounts.types.checking') },
    { value: 'savings',    label: t('accounts.types.savings') },
    { value: 'investment', label: t('accounts.types.investment') },
    { value: 'cash',       label: t('accounts.types.cash') },
    { value: 'credit',     label: t('accounts.types.credit') },
    { value: 'meal',       label: t('accounts.types.meal') },
  ]

  const bankOptions  = useMemo(() => buildBankSelectOptions(t('accounts.form.noBank')), [t])
  const typeOptions  = useMemo(() => buildAccountTypeSelectOptions(accountTypes), [t])

  useEffect(() => {
    if (open && account) {
      reset({
        name:              account.name,
        bankCode:          account.bankCode ?? 'none',
        type:              account.type,
        balance:           fromCents(account.balance).toFixed(2),
        currency:          account.currency,
        color:             account.color,
        cashbackPct:       account.cashbackPct != null ? String(account.cashbackPct) : '',
        roundupMultiplier: account.roundupMultiplier != null ? String(account.roundupMultiplier) : 'off',
        investedBase:      account.investedBase != null ? fromCents(account.investedBase).toFixed(2) : '',
        entryFee:          account.entryFee != null ? fromCents(account.entryFee).toFixed(2) : '',
      })
    } else if (open) {
      reset({
        name: '',
        bankCode: 'none',
        type: 'checking',
        balance: '0',
        currency: 'EUR',
        color: COLORS[0],
        cashbackPct: '',
        roundupMultiplier: 'off',
        investedBase: '',
        entryFee: '',
      })
    }
  }, [open, account, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:              values.name.trim(),
      type:              values.type,
      balance:           toCents(parseDecimal(values.balance)),
      currency:          values.currency,
      color:             values.color,
      bankCode:          values.bankCode !== 'none' ? values.bankCode : null,
      cashbackPct:       values.cashbackPct ? parseDecimal(values.cashbackPct) : null,
      roundupMultiplier: values.roundupMultiplier && values.roundupMultiplier !== 'off' ? parseInt(values.roundupMultiplier) : null,
      investedBase:      values.type === 'investment' ? (values.investedBase ? toCents(parseDecimal(values.investedBase)) : null) : undefined,
      entryFee:          values.type === 'investment' ? (values.entryFee ? toCents(parseDecimal(values.entryFee)) : null) : undefined,
    }
    if (isEdit && account?.id != null) {
      await updateAccount(account.id, payload)
    } else {
      await addAccount(payload)
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('accounts.form.editAccount') : t('accounts.form.newAccount')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="acc-name">{t('accounts.form.name')}</Label>
            <Input
              id="acc-name"
              className="text-base md:text-base"
              placeholder={t('accounts.form.namePlaceholder')}
              {...register('name', { required: t('accounts.form.nameRequired') })}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Bank */}
          <div className="space-y-1">
            <Label>{t('accounts.form.bank')}</Label>
            <PlainSelect
              value={selectedBankCode}
              onChange={v => setValue('bankCode', v)}
              options={bankOptions}
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label>{t('accounts.form.type')}</Label>
            <PlainSelect
              value={selectedType}
              onChange={v => setValue('type', v as AccountType)}
              options={typeOptions}
            />
          </div>

          {/* Balance + Currency */}
          <div className="grid grid-cols-2 gap-3">
            {!isInvestmentType && (
              <div className="space-y-1">
                <Label htmlFor="acc-balance">
                  {isEdit ? t('accounts.form.balance') : t('accounts.form.initialBalance')}
                </Label>
                <Input
                  id="acc-balance"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="text-base md:text-base"
                  {...register('balance', { required: true })}
                />
              </div>
            )}
            <div className={`space-y-1 ${isInvestmentType ? 'col-span-2' : ''}`}>
              <Label htmlFor="acc-currency">{t('accounts.form.currency')}</Label>
              <Input
                id="acc-currency"
                placeholder="EUR"
                maxLength={3}
                className="uppercase text-base md:text-base"
                {...register('currency', { required: true })}
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>{t('accounts.form.color')}</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: selectedColor === c ? 'white' : 'transparent',
                    boxShadow: selectedColor === c ? `0 0 0 2px ${c}` : 'none',
                  }}
                  onClick={() => setValue('color', c)}
                />
              ))}
            </div>
          </div>

          {/* Investment-only fields */}
          {isInvestmentType && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="acc-invested">{t('accounts.form.investedBase')}</Label>
                <Input
                  id="acc-invested"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="text-base md:text-base"
                  {...register('investedBase')}
                />
                <p className="text-xs text-muted-foreground">{t('accounts.form.investedBaseDesc')}</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="acc-fee">{t('accounts.form.entryFee')}</Label>
                <Input
                  id="acc-fee"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="text-base md:text-base"
                  {...register('entryFee')}
                />
                <p className="text-xs text-muted-foreground">{t('accounts.form.entryFeeDesc')}</p>
              </div>
            </div>
          )}

          {/* Cashback & Roundup */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="acc-cashback">{t('accounts.form.cashback')}</Label>
              <Input
                id="acc-cashback"
                inputMode="decimal"
                placeholder={t('accounts.form.cashbackDisabled')}
                className="text-base md:text-base"
                {...register('cashbackPct', {
                  validate: v => {
                    if (!v) return true
                    const n = parseDecimal(v)
                    if (n < 0) return '≥ 0'
                    if (n > 100) return '≤ 100'
                    return true
                  },
                })}
              />
              {errors.cashbackPct && <p className="text-xs text-destructive">{errors.cashbackPct.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>{t('accounts.form.roundup')}</Label>
              <Select value={selectedRoundup} onValueChange={v => setValue('roundupMultiplier', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('accounts.form.cashbackDisabled')} />
                </SelectTrigger>
                <SelectContent>
                  {ROUNDUP_VALUES.map(v => (
                    <SelectItem key={v} value={v}>
                      {v === 'off' ? t('accounts.form.cashbackDisabled') : `×${v}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? t('accounts.form.saveChanges') : t('accounts.addAccount')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
