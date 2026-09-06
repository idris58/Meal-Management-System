"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:text-card-foreground group-[.toaster]:border-border/80 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:font-sans group-[.toaster]:text-sm group-[.toaster]:p-4",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:shadow-sm group-[.toast]:transition-all group-[.toast]:hover:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:text-xs group-[.toast]:transition-all group-[.toast]:hover:bg-muted/80",
          closeButton:
            "group-[.toast]:bg-background/90 group-[.toast]:border group-[.toast]:border-border/70 group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground group-[.toast]:transition-colors group-[.toast]:shadow-xs",
          info:
            "group-[.toaster]:!bg-sky-50 dark:group-[.toaster]:!bg-sky-950/70 group-[.toaster]:!border-sky-200 dark:group-[.toaster]:!border-sky-800/60 group-[.toaster]:!text-sky-950 dark:group-[.toaster]:!text-sky-100",
          success:
            "group-[.toaster]:!bg-emerald-50 dark:group-[.toaster]:!bg-emerald-950/70 group-[.toaster]:!border-emerald-200 dark:group-[.toaster]:!border-emerald-800/60 group-[.toaster]:!text-emerald-950 dark:group-[.toaster]:!text-emerald-100",
          warning:
            "group-[.toaster]:!bg-amber-50 dark:group-[.toaster]:!bg-amber-950/70 group-[.toaster]:!border-amber-200 dark:group-[.toaster]:!border-amber-800/60 group-[.toaster]:!text-amber-950 dark:group-[.toaster]:!text-amber-100",
          error:
            "group-[.toaster]:!bg-rose-50 dark:group-[.toaster]:!bg-rose-950/70 group-[.toaster]:!border-rose-200 dark:group-[.toaster]:!border-rose-800/60 group-[.toaster]:!text-rose-950 dark:group-[.toaster]:!text-rose-100",
        },
      }}
      mobileOffset={{ bottom: 76, right: 16, left: 16 }}
      {...props}
    />
  )
}

export { Toaster }
