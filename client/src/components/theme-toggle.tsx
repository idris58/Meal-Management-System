import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("relative h-9 w-[3.25rem] rounded-full border-primary/20 bg-primary/[0.04] p-0 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md", className)}
      aria-label={nextLabel}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span className={cn("absolute left-1 flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-sm transition-transform duration-300", isDark && "translate-x-[1.15rem]") }>
        <Sun className={cn("absolute h-4 w-4 rotate-0 text-amber-500 transition-all duration-300", isDark && "rotate-90 scale-0 opacity-0")} aria-hidden="true" />
        <Moon className={cn("absolute h-4 w-4 -rotate-90 text-indigo-400 opacity-0 transition-all duration-300", isDark && "rotate-0 scale-100 opacity-100")} aria-hidden="true" />
      </span>
      <span className="sr-only">{nextLabel}</span>
    </Button>
  );
}
