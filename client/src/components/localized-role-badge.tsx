import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

export function LocalizedRoleBadge({ role }: { role: "manager" | "coordinator" | "member" }) {
  const { i18n } = useTranslation();
  const labels = i18n.language === "bn"
    ? { manager: "ম্যানেজার", coordinator: "সহ-ব্যবস্থাপক", member: "সদস্য" }
    : { manager: "Manager", coordinator: "Coordinator", member: "Member" };
  const colors = { manager: "bg-violet-100 text-violet-800", coordinator: "bg-sky-100 text-sky-800", member: "bg-slate-100 text-slate-700" }[role];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", colors)}>{labels[role]}</span>;
}
