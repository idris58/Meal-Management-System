import { enUS, bn } from "date-fns/locale";
import i18n from "@/lib/i18n";

export function getDateLocale() {
  return i18n.language === "bn" ? bn : enUS;
}
