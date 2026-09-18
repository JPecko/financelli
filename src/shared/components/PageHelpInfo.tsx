import { Info, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Popover, PopoverTrigger, PopoverContent, PopoverClose,
} from '@/shared/components/ui/popover'

interface PageHelpInfoProps {
  title: string
  body: string
}

export default function PageHelpInfo({ title, body }: PageHelpInfoProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={title}
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="font-semibold text-sm">{title}</p>
          <PopoverClose asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 -mt-0.5 -mr-0.5 shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </Button>
          </PopoverClose>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </PopoverContent>
    </Popover>
  )
}
