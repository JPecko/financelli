import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout & shape
        "h-9 w-full min-w-0 rounded-md px-3 py-1 text-base",
        // Background — uses --input token (#242424 dark / #f8f8f8 light)
        "bg-input text-foreground",
        // Border — subtle, matches Spotify input style
        "border border-border shadow-xs",
        // Transitions
        "transition-[border-color,box-shadow] duration-150 outline-none",
        // Placeholder
        "placeholder:text-muted-foreground",
        // Focus — green ring (Spotify accent)
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Validation
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "selection:bg-primary selection:text-primary-foreground",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
