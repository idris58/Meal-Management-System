import { Check, ChevronDown, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supportedLanguages, type SupportedLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const language = i18n.language === "bn" ? "bn" : "en";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("h-9 shrink-0 gap-1.5 rounded-full border-primary/20 bg-primary/[0.04] px-2.5 font-semibold text-primary shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md sm:px-3", className)} aria-label={t("switcher.current", { language: t(`languages.${language}`) })}>
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs sm:text-sm">{language === "bn" ? "বাংলা" : "EN"}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 rounded-xl p-1.5 shadow-xl">
        <DropdownMenuRadioGroup value={language} onValueChange={(next) => void i18n.changeLanguage(next as SupportedLanguage)} aria-label={t("switcher.choose")}>
          {supportedLanguages.map((code) => <DropdownMenuRadioItem key={code} value={code} className="rounded-lg py-2 pl-8 pr-3 font-medium"><span>{t(`languages.${code}`)}</span>{language === code && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden="true" />}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
