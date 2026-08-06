import { cn } from "@/lib/utils";

export type MessRole = "manager" | "coordinator" | "member";

const ROLE_LABELS: Record<MessRole, string> = {
  manager: "Manager",
  coordinator: "Coordinator",
  member: "Member",
};

export function RoleBadge({ role, className }: { role: MessRole; className?: string }) {
  const palette = {
    manager: "border-violet-200 bg-violet-100 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
    coordinator: "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200",
    member: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  }[role];

  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", palette, className)}>{ROLE_LABELS[role]}</span>;
}
