import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGE_STORAGE_KEY = "mealtrack:language";
export const supportedLanguages = ["en", "bn"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const resources = {
  en: { translation: { appName: "MealTrack", language: "Language", languages: { en: "English", bn: "বাংলা" }, nav: { dashboard: "Dashboard", members: "Members", meals: "Meals", expenses: "Expenses", history: "History", settings: "Settings", more: "More" }, auth: { signedIn: "Signed in", logout: "Logout", loggingOut: "Logging out..." }, common: { loading: "Loading...", cancel: "Cancel", save: "Save", delete: "Delete", edit: "Edit", close: "Close", add: "Add", back: "Back", retry: "Try again" }, titles: { dashboard: "Dashboard", members: "Members", meals: "Meals", expenses: "Expenses", history: "History", changelog: "Changelog", settings: "Settings", authentication: "Authentication", resetPassword: "Reset Password", mealCode: "Meal Code", sharedView: "Shared View" }, app: { loadingMealData: "Loading your meal data..." }, switcher: { current: "Current language: {{language}}", choose: "Choose language" } } },
  bn: { 
    translation: { 
      appName: "MealTrack", language: "ভাষা", languages: { en: "English", bn: "বাংলা" 

      }, 
      nav: { 
        dashboard: "ড্যাশবোর্ড", 
        members: "সদস্য", 
        meals: "মিল", 
        expenses: "খরচ", 
        history: "ইতিহাস", 
        settings: "সেটিংস", 
        more: "আরও" 
      }, 
      auth: { 
        signedIn: "সাইন ইন করা আছে", 
        logout: "লগ আউট", loggingOut: "লগ আউট হচ্ছে..." 
      }, 
      common: { 
        loading: "লোড হচ্ছে...", 
        cancel: "বাতিল", 
        save: "সেভ করুন", 
        delete: "মুছুন", 
        edit: "এডিট করুন", 
        close: "বন্ধ করুন", 
        add: "যোগ করুন", 
        back: "ফিরে যান", 
        retry: "আবার চেষ্টা করুন" 
      }, 
      titles: { 
        dashboard: "ড্যাশবোর্ড", 
        members: "সদস্য", 
        meals: "মিল", 
        expenses: "খরচ", 
        history: "ইতিহাস", 
        changelog: "পরিবর্তনের ইতিহাস", 
        settings: "সেটিংস", 
        authentication: "লগইন", 
        resetPassword: "পাসওয়ার্ড রিসেট", 
        mealCode: "মিল কোড", 
        sharedView: "শেয়ার করা ভিউ" 
      }, 
      app: { 
        loadingMealData: "আপনার মিলের তথ্য লোড হচ্ছে..." }, 
        switcher: { 
          current: "বর্তমান ভাষা: {{language}}", 
          choose: "ভাষা নির্বাচন করুন" } } },
} as const;

function getInitialLanguage(): SupportedLanguage {
  const saved = typeof window === "undefined" ? null : window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return saved === "bn" || saved === "en" ? saved : "en";
}

void i18n.use(initReactI18next).init({ resources, lng: getInitialLanguage(), fallbackLng: "en", interpolation: { escapeValue: false }, react: { useSuspense: false } });
i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  if (typeof document !== "undefined") document.documentElement.lang = language;
});
if (typeof document !== "undefined") document.documentElement.lang = i18n.language;
export default i18n;
