import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { tCategory, type Category } from '@/domain/categories'
import { useT } from '@/shared/i18n'

interface Props {
  categories: Category[]
  value:      string
  onChange:   (id: string) => void
}

export default function CategorySelect({ categories, value, onChange }: Props) {
  const t = useT()
  return (
    <div className="space-y-1">
      <Label>{t('transactions.category')}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {categories.map(c => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {tCategory(c.id, t)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
