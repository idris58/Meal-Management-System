import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { type SupportedLanguage } from "@/lib/i18n";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const language = i18n.language === "bn" ? "bn" : "en";
  const isBn = language === "bn";

  const toggle = () => {
    void i18n.changeLanguage((isBn ? "en" : "bn") as SupportedLanguage);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isBn ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
      aria-pressed={isBn}
      className={cn(
        "relative h-9 w-[4.5rem] rounded-full border border-primary/20 bg-primary/[0.04] p-0 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
    >
      {/* Sliding pill indicator */}
      <span
        className={cn(
          "absolute inset-y-[3px] w-[calc(50%-3px)] rounded-full bg-background shadow-sm transition-transform duration-300",
          isBn ? "left-[3px] translate-x-full" : "left-[3px] translate-x-0",
        )}
        aria-hidden="true"
      />

      {/* Labels */}
      <span className="relative flex h-full w-full items-center">
        <span
          className={cn(
            "flex flex-1 items-center justify-center text-xs font-semibold transition-colors duration-300",
            !isBn ? "text-primary" : "text-muted-foreground",
          )}
        >
          EN
        </span>
        <span
          className={cn(
            "flex flex-1 items-center justify-center text-xs font-semibold transition-colors duration-300",
            isBn ? "text-primary" : "text-muted-foreground",
          )}
        >
          BN
        </span>
      </span>
    </button>
  );
}
