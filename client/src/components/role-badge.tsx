import { Crown, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessRole = "manager" | "coordinator" | "member";

const ROLE_CONFIG: Record<
  MessRole,
  { label: string; icon: LucideIcon; palette: string }
> = {
  manager: {
    label: "Manager",
    icon: Crown,
    palette:
      "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
  },
  coordinator: {
    label: "Coordinator",
    icon: ShieldCheck,
    palette:
      "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
  },
  member: {
    label: "Member",
    icon: User,
    palette:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
};

export function RoleBadge({
  role,
  className,
  showIcon = true,
}: {
  role: MessRole;
  className?: string;
  showIcon?: boolean;
}) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.member;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        config.palette,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}

