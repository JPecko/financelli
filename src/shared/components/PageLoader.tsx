import { Loader2 } from 'lucide-react'

interface Props {
  message?: string
}

export default function PageLoader({ message = 'Loading...' }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
